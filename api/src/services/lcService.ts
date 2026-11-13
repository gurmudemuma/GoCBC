// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Letter of Credit Service - Handles all LC-related blockchain operations

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

export class LCService {
  private static instance: LCService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): LCService {
    if (!LCService.instance) {
      LCService.instance = new LCService();
    }
    return LCService.instance;
  }

  /**
   * Request LC (Exporter initiates)
   */
  async requestLC(lcData: {
    lcID: string;
    contractID: string;
    exporterID: string;
    bankName: string;
    amount: number;
    currency: string;
    expiryDate: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[LCService] Requesting LC: ${lcData.lcID}`);

      // 1. Verify contract is approved
      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [lcData.contractID]
      );

      if (!contract) {
        throw new Error('Contract not found');
      }

      if (contract.status !== 'APPROVED') {
        throw new Error(`Contract must be APPROVED before LC request. Current status: ${contract.status}`);
      }

      // 2. Request LC on blockchain
      // SEQ 9 (F6a fix): RequestLC now takes 11 args — beneficiary,
      // terms, issuingBank, advisingBank. This service has no explicit
      // banks to pass, so empty strings keep the contract-derived
      // fallback on-chain.
      // SEQ 11 (E2E leg 1, F14): RequestLC now takes 15 args — the
      // four shipping/payment fields are appended. Empty strings keep
      // them unset on-chain for callers that have none to pass.
      const result = await this.fabricService.invokeChaincode('RequestLC', [
        lcData.lcID,
        lcData.contractID,
        lcData.exporterID,
        lcData.bankName,          // bankName comes before amount
        lcData.amount.toString(), // amount as string
        lcData.currency,          // currency after amount
        lcData.expiryDate,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to request LC on blockchain');
      }

      // 3. Save to PostgreSQL
      await this.dbService.run(
        `INSERT INTO letters_of_credit (
          lc_id, contract_id, exporter_id, bank_name, amount, currency,
          expiry_date, status, blockchain_synced, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          lcData.lcID,
          lcData.contractID,
          lcData.exporterID,
          lcData.bankName,
          lcData.amount,
          lcData.currency,
          lcData.expiryDate,
          'REQUESTED',
          true,
          result.txId,
        ]
      );

      // 4. Auto-log audit
      await this.auditService.log({
        entityType: 'LC',
        entityId: lcData.lcID,
        action: 'REQUEST',
        performedBy: lcData.userId,
        organization: lcData.userOrg,
        performedByOrg: lcData.userOrg,
        oldValue: '',
        newValue: 'REQUESTED',
        reason: 'LC requested',
        metadata: { contractID: lcData.contractID, amount: lcData.amount, bank: lcData.bankName },
      });

      logger.info(`✅ [LCService] LC requested: ${lcData.lcID}`);
      return { success: true, lcID: lcData.lcID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [LCService] Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve LC (Bank officer)
   */
  async approveLC(
    lcID: string,
    approvedBy: string,
    userOrg: string,
    approvalRef: string
  ) {
    try {
      logger.info(`[LCService] Approving LC: ${lcID}`);

      const lc = await this.dbService.get(
        'SELECT * FROM letters_of_credit WHERE lc_id = $1',
        [lcID]
      );

      if (!lc) {
        throw new Error('LC not found');
      }

      const isValid = statusManager.validateTransition('LC', lc.status, 'APPROVED');
      if (!isValid) {
        throw new Error(`Invalid status transition from ${lc.status} to APPROVED`);
      }

      const result = await this.fabricService.invokeChaincode('ApproveLC', [
        lcID,
        approvedBy,
        approvalRef,
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve LC on blockchain');
      }

      await statusManager.updateEntityStatus('LC', lcID, lc.status, 'APPROVED');

      await this.dbService.run(
        `UPDATE letters_of_credit 
         SET status = $1, approved_by = $2, approved_at = NOW(), approval_ref = $3, blockchain_tx_id = $4
         WHERE lc_id = $5`,
        ['APPROVED', approvedBy, approvalRef, result.txId, lcID]
      );

      await this.auditService.log({
        entityType: 'LC',
        entityId: lcID,
        action: 'APPROVE',
        performedBy: approvedBy,
        organization: userOrg,
        performedByOrg: userOrg,
        oldValue: lc.status,
        newValue: 'APPROVED',
        reason: 'LC approved',
        metadata: { approvalRef },
      });

      logger.info(`✅ [LCService] LC approved: ${lcID}`);
      return { success: true, lcID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [LCService] Approve failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Issue LC (Bank officer) - 🔥 TRIGGERS FOREX AUTO-REQUEST
   */
  async issueLC(lcData: {
    lcID: string;
    lcNumber: string;
    contractID: string;
    exporterID: string;
    issuingBank: string;
    advisingBank: string;
    beneficiary: string;
    applicant: string;
    amount: number;
    currency: string;
    expiryDate: string;
    latestShipmentDate: string;
    portOfLoading: string;
    portOfDischarge: string;
    paymentTerms: string;
    partialShipment: boolean;
    transhipment: boolean;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[LCService] Issuing LC: ${lcData.lcID}`);

      // Connect as BanksMSP to issue the LC
      await this.fabricService.connectAsOrg('BanksMSP');

      // Create and issue LC in one step using CreateAndIssueLC
      // This is a bank-initiated LC that bypasses the request/approve workflow
      const result = await this.fabricService.invokeChaincode('CreateAndIssueLC', [
        lcData.lcID,
        lcData.contractID,
        lcData.exporterID,
        lcData.issuingBank,
        lcData.advisingBank,
        lcData.beneficiary,
        lcData.applicant,
        lcData.amount.toString(),
        lcData.currency,
        lcData.expiryDate,
        lcData.latestShipmentDate || lcData.expiryDate,
        lcData.portOfLoading || '',
        lcData.portOfDischarge || '',
        lcData.paymentTerms || 'Sight LC',
        lcData.partialShipment ? 'true' : 'false',
        lcData.transhipment ? 'true' : 'false',
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create and issue LC on blockchain');
      }

      // Save to database
      await this.dbService.run(
        `INSERT INTO letters_of_credit (
          lc_id, lc_number, contract_id, exporter_id,
          issuing_bank, advising_bank, beneficiary, applicant,
          amount, currency, expiry_date, latest_shipment_date,
          port_of_loading, port_of_discharge, payment_terms,
          partial_shipment, transhipment,
          status, blockchain_tx_id, issued_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        ON CONFLICT (lc_id) DO UPDATE SET
          status = $18, blockchain_tx_id = $19, issued_at = NOW()`,
        [
          lcData.lcID,
          lcData.lcNumber,
          lcData.contractID,
          lcData.exporterID,
          lcData.issuingBank,
          lcData.advisingBank,
          lcData.beneficiary,
          lcData.applicant,
          lcData.amount,
          lcData.currency,
          lcData.expiryDate,
          lcData.latestShipmentDate,
          lcData.portOfLoading,
          lcData.portOfDischarge,
          lcData.paymentTerms,
          lcData.partialShipment,
          lcData.transhipment,
          'ISSUED',
          result.txId
        ]
      );

      // Get full LC data for workflow triggers
      const lc = await this.dbService.get(
        'SELECT * FROM letters_of_credit WHERE lc_id = $1',
        [lcData.lcID]
      );

      // 🔥 WORKFLOW TRIGGER: Auto-request forex allocation
      // The forex ID returned here MUST be the ID of the forex request that
      // was actually created (see triggerForexAutoRequest) — callers (the
      // /banking/lc/issue route, the E2E scripts) approve/allocate that ID.
      // A freshly generated ID here would point at a forex that does not exist.
      logger.info(`🔥 [LCService] LC issued - triggering forex auto-request for ${lcData.lcID}`);
      const forexId = await this.triggerForexAutoRequest(lcData.lcID, lc || { contract_id: lcData.contractID, exporter_id: lcData.exporterID, amount: lcData.amount, currency: lcData.currency });

      logger.info(`✅ [LCService] LC issued: ${lcData.lcID}`);
      return {
        success: true,
        lcID: lcData.lcID,
        blockchainTxId: result.txId,
        forexAutoCreated: forexId !== null,
        forexID: forexId ?? undefined
      };
    } catch (error: any) {
      logger.error(`❌ [LCService] Issue failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 WORKFLOW FIX: Auto-request forex when LC is issued
   * Returns the ID of the forex request actually created, or null if the
   * auto-request failed. Callers must use this return value — never
   * generate a fresh `FOREX-${Date.now()}` to report, because that ID
   * would differ from the one created here and point at nothing.
   *
   * LEG 1 (F6b): the forex ID is deterministic — `FOREX_${lcID}_REQUEST`,
   * the same scheme the POST /banking/lc/:lcID/issue route uses. The
   * old `FOREX-${Date.now()}` here meant the two issue routes minted
   * different ID shapes for the same logical auto-request, and a retry
   * after a partial failure could not find the first request.
   */
  private async triggerForexAutoRequest(lcID: string, lc: any): Promise<string | null> {
    try {
      const { ForexService } = await import('./forexService');
      const forexService = ForexService.getInstance();

      const forexId = `FOREX_${lcID}_REQUEST`;

      const created = await forexService.requestForex({
        forexId,
        contractId: lc.contract_id,
        lcId: lcID,
        exporterId: lc.exporter_id,
        amount: lc.amount,
        currency: lc.currency,
        userId: 'SYSTEM',
        userOrg: 'BanksMSP',
      });

      // Trust the ID the creation call itself reports, not a re-generated one.
      const createdForexId = created?.forexId || forexId;
      logger.info(`✅ [LCService] Auto-requested forex: ${createdForexId} for LC: ${lcID}`);
      return createdForexId;
    } catch (error: any) {
      logger.error(`❌ [LCService] Forex auto-request failed: ${error.message}`);
      // Don't fail the LC issuance if forex request fails — but report the
      // failure honestly (null) instead of a fabricated forex ID.
      return null;
    }
  }

  /**
   * Get LC by ID
   */
  async getLC(lcID: string) {
    return await this.dbService.get(
      'SELECT * FROM letters_of_credit WHERE lc_id = $1',
      [lcID]
    );
  }

  /**
   * Get LCs by status
   */
  async getLCsByStatus(status: string) {
    return await this.dbService.all(
      'SELECT * FROM letters_of_credit WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
  }
}

export const lcService = LCService.getInstance();
