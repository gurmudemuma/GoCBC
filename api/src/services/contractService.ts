// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Contract Service - Handles all contract-related blockchain operations

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

/**
 * Classify a chaincode invoke failure from the message invokeChaincode
 * returns in `result.error`.
 *
 * - A suspended / revoked / expired exporter licence is a business-rule
 *   refusal from the ledger ("exporter license is SUSPENDED ...") — 400.
 * - "Fabric rejected the proposal before ordering" is the suffix
 *   invokeChaincode appends to a pre-ordering endorsement failure, i.e.
 *   the chaincode itself refused (validation, duplicate, wrong state) —
 *   400, unless the message carries an infrastructure marker
 *   (endorsement/discovery/connectivity/timeout), which is a 503.
 * - Anything else returns null: the caller keeps its existing 500 for
 *   genuine server errors.
 */
export function classifyChaincodeError(message: string): { status: number; code: string } | null {
  const msg = message || '';
  if (/licen[cs]e is (SUSPENDED|REVOKED|EXPIRED)/i.test(msg)) {
    return { status: 400, code: 'EXPORTER_LICENCE_SUSPENDED' };
  }
  if (/Fabric rejected the proposal before ordering/i.test(msg)) {
    if (/endorsement has failed|endorsements do not match|failed to connect|discovery|timed out|not connected/i.test(msg)) {
      return { status: 503, code: 'FABRIC_UNAVAILABLE' };
    }
    return { status: 400, code: 'CHAINCODE_REJECTED' };
  }
  if (/outcome is unknown|timed out|not connected|failed to connect|discovery/i.test(msg)) {
    return { status: 503, code: 'FABRIC_UNAVAILABLE' };
  }
  return null;
}

/** Throw an Error tagged with the HTTP status/code of a chaincode refusal. */
function throwChaincodeError(message: string, fallback: string): never {
  const error: any = new Error(message || fallback);
  const classified = classifyChaincodeError(message || '');
  if (classified) {
    error.statusCode = classified.status;
    error.code = classified.code;
  }
  throw error;
}

/** Throw an Error tagged with an explicit HTTP status/code. */
function throwWithStatus(message: string, status: number, code: string): never {
  const error: any = new Error(message);
  error.statusCode = status;
  error.code = code;
  throw error;
}

export class ContractService {
  private static instance: ContractService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Register a new sales contract
   */
  async registerContract(contractData: {
    contractID: string;
    exporterID: string;
    buyerID: string;
    buyerName?: string;
    buyerCountry: string;
    buyerBank?: string;
    exporterBank?: string;
    coffeeType: string;
    quantity: number;
    pricePerKg: number;
    currency: string;
    paymentMethod: string;
    eudrRequired: boolean;
    // LEG 1 (F3): trade/contact fields the exporter form collects. They
    // used to be dropped here (no chaincode args, no PG columns for the
    // contact pair); they are now stored on the ledger and in PG.
    buyerEmail?: string;
    buyerPhone?: string;
    organicCertified?: boolean;
    fairTradeCertified?: boolean;
    portOfLoading?: string;
    portOfDestination?: string;
    deliveryDate?: string;
    incoterm?: string;
    specialInstructions?: string;
    documents?: string[];
    supersedesContractID?: string | null;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[ContractService] Registering contract: ${contractData.contractID}`);

      // 1. Register on blockchain - FINAL correct order based on chaincode error analysis
      // The chaincode reads paymentMethod from position 13 (index 12), not position 10!
      const chaincodeParams = [
        contractData.contractID,           // 1
        contractData.exporterID,           // 2
        contractData.buyerID,              // 3
        contractData.buyerName || contractData.buyerID,  // 4
        contractData.buyerCountry,         // 5
        contractData.coffeeType,           // 6
        contractData.quantity.toString(),  // 7
        contractData.pricePerKg.toString(), // 8
        contractData.currency,             // 9
        contractData.eudrRequired.toString(), // 10
        contractData.buyerBank || '',      // 11
        contractData.exporterBank || '',   // 12
        contractData.paymentMethod,        // 13 - CORRECT POSITION!
        (contractData.documents || []).join(','), // 14
        // LEG 1 (F3): trade/contact fields, args 15-23 of
        // RegisterSalesContractWithPaymentMethod (chaincode seq 8+).
        contractData.buyerEmail || '',                    // 15
        contractData.buyerPhone || '',                    // 16
        String(Boolean(contractData.organicCertified)),    // 17
        String(Boolean(contractData.fairTradeCertified)),  // 18
        contractData.portOfLoading || '',                  // 19
        contractData.portOfDestination || '',              // 20
        contractData.deliveryDate || '',                   // 21
        contractData.incoterm || '',                      // 22
        contractData.specialInstructions || '',            // 23
      ];
      
      logger.info(`🔍 DEBUG: Chaincode parameters for ${contractData.contractID}:`, {
        param13_paymentMethod: chaincodeParams[12],
        param10_eudrRequired: chaincodeParams[9],
        allParams: chaincodeParams
      });
      
      const result = await this.fabricService.invokeChaincode(
        'RegisterSalesContractWithPaymentMethod',
        chaincodeParams
      );

      if (!result.success) {
        // A1: a chaincode refusal (e.g. the exporter licence is
        // SUSPENDED) must reach the route as a tagged 4xx, not surface
        // as a 500 — see classifyChaincodeError above.
        throwChaincodeError(result.error || '', 'Failed to register contract on blockchain');
      }

      // 2. Save to PostgreSQL
      const totalValue = contractData.quantity * contractData.pricePerKg;
      await this.dbService.run(
        `INSERT INTO contracts (
          contract_id, exporter_id, buyer_id, buyer_name, buyer_country,
          buyer_bank, exporter_bank,
          coffee_type, quantity, price_per_kg, currency,
          total_value, payment_method, eudr_required,
          buyer_email, buyer_phone, organic_certified, fair_trade_certified,
          port_of_loading, port_of_destination, delivery_date, incoterm,
          special_instructions,
          supersedes_contract_id,
          status, blockchain_synced, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW())`,
        [
          contractData.contractID,
          contractData.exporterID,
          contractData.buyerID,
          contractData.buyerName || contractData.buyerID,
          contractData.buyerCountry,
          contractData.buyerBank || '',
          contractData.exporterBank || '',
          contractData.coffeeType,
          contractData.quantity,
          contractData.pricePerKg,
          contractData.currency,
          totalValue,
          contractData.paymentMethod,
          contractData.eudrRequired,
          contractData.buyerEmail || null,
          contractData.buyerPhone || null,
          Boolean(contractData.organicCertified),
          Boolean(contractData.fairTradeCertified),
          contractData.portOfLoading || null,
          contractData.portOfDestination || null,
          contractData.deliveryDate || null,
          contractData.incoterm || null,
          contractData.specialInstructions || null,
          contractData.supersedesContractID || null,
          'REGISTERED',
          true,
          result.txId,
        ]
      );

      // 3. Auto-log audit trail
      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: contractData.contractID,
        action: 'CREATE',
        performedBy: contractData.userId,
        organization: contractData.userOrg,
        performedByOrg: contractData.userOrg,
        oldValue: '',
        newValue: 'REGISTERED',
        reason: 'Contract registered',
        metadata: { totalValue, paymentMethod: contractData.paymentMethod },
      });

      logger.info(`✅ [ContractService] Contract registered: ${contractData.contractID}`);
      return { success: true, contractID: contractData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Register failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve a contract (ECTA only)
   */
  async approveContract(approvalData: {
    contractID: string;
    approvedBy: string;
    approverOrg: string;
    reason?: string;
  }) {
    try {
      logger.info(`[ContractService] Approving contract: ${approvalData.contractID}`);

      // 1. Get current contract
      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [approvalData.contractID]
      );

      if (!contract) {
        throwWithStatus('Contract not found', 404, 'NOT_FOUND');
      }

      // 2. Validate status transition
      // 2. Validate status transition
      const isValid = statusManager.validateTransition('CONTRACT', contract.status, 'APPROVED');
      if (!isValid) {
        // F-8: an invalid transition (e.g. re-approving a REJECTED
        // contract) is a client/state error, not a server error.
        throwWithStatus(`Invalid status transition from ${contract.status} to APPROVED`, 400, 'INVALID_TRANSITION');
      }

      // 3. Approve on blockchain — pin the signing MSP to the caller's org
      // (ApproveSalesContract requires ECTAMSP). The shared gateway
      // otherwise signs with whatever org the previous concurrent request
      // connected as, and the chaincode rejects with "only ECTA and Admin
      // can approve sales contracts, got: BanksMSP". invokeChaincode
      // reconnects inside the gateway lock, so the explicit MSP is race-free.
      const result = await this.fabricService.invokeChaincode('ApproveSalesContract', [
        approvalData.contractID,
        approvalData.approvedBy,
        approvalData.reason || 'Contract approved by ECTA',
      ], approvalData.approverOrg);

      if (!result.success) {
        throwChaincodeError(result.error || '', 'Failed to approve contract on blockchain');
      }

      // 4. Update status (this will cascade to related entities)
      await statusManager.updateEntityStatus('CONTRACT', approvalData.contractID, contract.status, 'APPROVED');

      // 5. Update PostgreSQL
      await this.dbService.run(
        `UPDATE contracts 
         SET status = $1, approved_by = $2, approved_at = NOW(), blockchain_tx_id = $3
         WHERE contract_id = $4`,
        ['APPROVED', approvalData.approvedBy, result.txId, approvalData.contractID]
      );

      // 6. Auto-log audit
      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: approvalData.contractID,
        action: 'APPROVE',
        performedBy: approvalData.approvedBy,
        organization: approvalData.approverOrg,
        performedByOrg: approvalData.approverOrg,
        oldValue: contract.status,
        newValue: 'APPROVED',
        reason: approvalData.reason || 'Contract approved',
        metadata: { exporterID: contract.exporter_id, amount: contract.total_value },
      });

      // 7. LC creation lives in exactly ONE place: the LC handoff in the
      // POST /contracts/:contractID/approve route handler (contracts.ts),
      // which creates a single deterministic `LC-${contractID}` and is
      // idempotent (it checks QueryAllLCs first). Do NOT auto-create an LC
      // here as well: an earlier triggerLCAutoCreation created a second,
      // stray `LC-${Date.now()}` LC on every approval, and CreateShipment
      // range-scans LCs in key order and fails on the first unallocated
      // one — the stray — even though the real LC was issued. Keeping this
      // service free of LC creation is what makes approval create exactly
      // one LC.

      logger.info(`✅ [ContractService] Contract approved: ${approvalData.contractID}`);
      return { success: true, contractID: approvalData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Approve failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a contract (ECTA only)
   */
  async rejectContract(rejectionData: {
    contractID: string;
    rejectedBy: string;
    reason: string;
    rejectorOrg: string;
  }) {
    try {
      logger.info(`[ContractService] Rejecting contract: ${rejectionData.contractID}`);

      const contract = await this.dbService.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [rejectionData.contractID]
      );

      if (!contract) {
        throwWithStatus('Contract not found', 404, 'NOT_FOUND');
      }

      // Pin the signing MSP to the caller's org (RejectSalesContract
      // requires ECTAMSP) — see approveContract above for why the ambient
      // gateway identity is not safe under concurrent requests.
      const result = await this.fabricService.invokeChaincode('RejectSalesContract', [
        rejectionData.contractID,
        rejectionData.rejectedBy,
        rejectionData.reason,
      ], rejectionData.rejectorOrg);

      if (!result.success) {
        throwChaincodeError(result.error || '', 'Failed to reject contract on blockchain');
      }

      await statusManager.updateEntityStatus('CONTRACT', rejectionData.contractID, contract.status, 'REJECTED');

      await this.dbService.run(
        `UPDATE contracts 
         SET status = $1, rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, blockchain_tx_id = $4
         WHERE contract_id = $5`,
        ['REJECTED', rejectionData.rejectedBy, rejectionData.reason, result.txId, rejectionData.contractID]
      );

      await this.auditService.log({
        entityType: 'CONTRACT',
        entityId: rejectionData.contractID,
        action: 'REJECT',
        performedBy: rejectionData.rejectedBy,
        organization: rejectionData.rejectorOrg,
        performedByOrg: rejectionData.rejectorOrg,
        oldValue: contract.status,
        newValue: 'REJECTED',
        reason: rejectionData.reason,
        metadata: { exporterID: contract.exporter_id },
      });

      logger.info(`✅ [ContractService] Contract rejected: ${rejectionData.contractID}`);
      return { success: true, contractID: rejectionData.contractID, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ContractService] Reject failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get contract by ID from PostgreSQL
   */
  async getContract(contractID: string) {
    return await this.dbService.get(
      'SELECT * FROM contracts WHERE contract_id = $1',
      [contractID]
    );
  }

  /**
   * Get all contracts for an exporter
   */
  async getContractsByExporter(exporterID: string) {
    return await this.dbService.all(
      'SELECT * FROM contracts WHERE UPPER(exporter_id) = UPPER($1) ORDER BY created_at DESC',
      [exporterID]
    );
  }

  /**
   * Get contracts by status
   */
  async getContractsByStatus(status: string) {
    return await this.dbService.all(
      'SELECT * FROM contracts WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
  }
}

export const contractService = ContractService.getInstance();
