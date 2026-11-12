// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Forex Service - Handles all forex allocation operations

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { AuditService } from './auditService';
import { statusManager } from '../utils/statusManager';
import { logger } from '../utils/logger';

export class ForexService {
  private static instance: ForexService;
  private fabricService: FabricService;
  private dbService: DatabaseService;
  private auditService: AuditService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): ForexService {
    if (!ForexService.instance) {
      ForexService.instance = new ForexService();
    }
    return ForexService.instance;
  }

  /**
   * Request forex allocation
   */
  async requestForex(forexData: {
    forexId: string;
    contractId: string;
    lcId?: string;
    exporterId: string;
    amount: number;
    currency: string;
    userId: string;
    userOrg: string;
  }) {
    try {
      logger.info(`[ForexService] Requesting forex: ${forexData.forexId}`);

      // Pass userOrg as MSP ID so the transaction is signed by the correct organization
      const result = await this.fabricService.invokeChaincode('RequestForex', [
        forexData.forexId,
        forexData.contractId,
        forexData.exporterId,
        forexData.amount.toString(),
        forexData.currency,
      ], forexData.userOrg); // ← FIX: Pass userOrg as the MSP ID parameter

      if (!result.success) {
        throw new Error(result.error || 'Failed to request forex on blockchain');
      }

      await this.dbService.run(
        `INSERT INTO forex_allocations (
          allocation_id, forex_id, contract_id, lc_id, exporter_id, amount, currency,
          status, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          forexData.forexId, // allocation_id same as forex_id
          forexData.forexId,
          forexData.contractId,
          forexData.lcId || null,
          forexData.exporterId,
          forexData.amount,
          forexData.currency,
          'REQUESTED',
          result.txId,
        ]
      );

      await this.auditService.log({
        entityType: 'FOREX',
        entityId: forexData.forexId,
        action: 'REQUEST',
        performedBy: forexData.userId,
        organization: forexData.userOrg,
        performedByOrg: forexData.userOrg,
        oldValue: '',
        newValue: 'REQUESTED',
        reason: 'Forex requested',
        metadata: { contractId: forexData.contractId, amount: forexData.amount },
      });

      logger.info(`✅ [ForexService] Forex requested: ${forexData.forexId}`);
      return { success: true, forexId: forexData.forexId, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ForexService] Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Allocate forex (NBE/Bank officer) - Applies 40% retention policy
   */
  async allocateForex(allocationData: {
    forexID?: string;  // Support both naming conventions
    forexId?: string;
    lcID?: string;
    lcId?: string;
    amount: number;
    exchangeRate: number;
    retentionRate: number; // NBE policy: 40%
    officer: string;
    approvalRef: string;
    expiryDate: string;
    userId: string;
    userOrg: string;
  }) {
    // Normalize parameter names
    const forexId = allocationData.forexID || allocationData.forexId;
    const lcId = allocationData.lcID || allocationData.lcId;

    if (!forexId || !lcId) {
      throw new Error('Forex ID and LC ID are required');
    }

    try {
      logger.info(`[ForexService] Allocating forex: ${forexId}`);

      // Try to get forex from PostgreSQL, but if not found, query blockchain
      let forex = await this.dbService.get(
        'SELECT * FROM forex_allocations WHERE forex_id = $1',
        [forexId]
      );

      let contractId = forex?.contract_id;
      let currentStatus = String(forex?.status || '').toUpperCase();
      
      // If not in PostgreSQL, try to get from blockchain
      if (!forex) {
        logger.warn(`[ForexService] Forex ${forexId} not in PostgreSQL, checking blockchain...`);
        try {
          const blockchainResult = await this.fabricService.queryChaincode('ReadForex', [forexId]);
          if (blockchainResult.success && blockchainResult.data) {
            const forexData = blockchainResult.data;
            contractId = forexData.ContractID || forexData.contractId;
            currentStatus = String(forexData.Status || forexData.status || '').toUpperCase();
            logger.info(`[ForexService] Found forex on blockchain: contract=${contractId} status=${currentStatus}`);
          } else {
            throw new Error('Forex request not found in PostgreSQL or blockchain');
          }
        } catch (bcErr: any) {
          logger.error(`[ForexService] Failed to query blockchain: ${bcErr.message}`);
          throw new Error('Forex request not found');
        }
      }

      // From-state guard: only a requested or confirmed allocation can be
      // allocated. The old handler wrote ALLOCATED from any state, so an
      // already-allocated or utilized allocation could be allocated again.
      // APPROVED is a legacy value the old NBE approve route wrote.
      if (!['REQUESTED', 'CONFIRMED', 'APPROVED'].includes(currentStatus)) {
        throw new Error(
          `Cannot allocate forex: invalid status transition from ${currentStatus || 'UNKNOWN'} to ALLOCATED (allowed from REQUESTED, CONFIRMED)`
        );
      }

      // LEDGER FIRST (quality-fix pattern, commit 9a0673e9): AllocateForex
      // (forex.go:442) takes (forexID, lcID, amount, exchangeRate,
      // retentionRate, officer, approvalRef, expiryDate) and is the ONLY
      // writer of the allocation — the Postgres mirror below is written
      // only after the on-chain call succeeds. The old best-effort code
      // wrote CouchDB + Postgres and returned success:true with txId null
      // when the chain call failed, so Postgres said ALLOCATED while the
      // ledger still said CONFIRMED with allocatedAmount 0 (a phantom).
      // A failed ledger write here is a failed allocation: a coded error
      // is thrown (the forex.ts routes surface it as 503
      // FOREX_ALLOCATE_FAILED) and nothing is written to CouchDB or
      // Postgres.
      //
      // The caller's org is passed as the signing MSP, like requestForex
      // does: AllocateForex only accepts NBEMSP or a bank MSP, so without
      // it the call falls back to the gateway default (ECTAMSP) and the
      // chaincode rejects it as unauthorized. The chain call only succeeds
      // if retentionRate matches the active NBE COFFEE policy and
      // approvalRef/officer are non-empty (chaincode validates both).
      let chainResult;
      try {
        chainResult = await this.fabricService.invokeChaincode('AllocateForex', [
          forexId,
          lcId,
          String(allocationData.amount),
          String(allocationData.exchangeRate),
          String(allocationData.retentionRate),
          allocationData.officer,
          allocationData.approvalRef,
          allocationData.expiryDate || '',
        ], allocationData.userOrg);
      } catch (invokeErr: any) {
        const error: any = new Error(`Failed to allocate forex ${forexId} on the ledger: ${invokeErr?.message || invokeErr}`);
        error.code = 'FOREX_ALLOCATE_FAILED';
        logger.error(`[ForexService] ${error.message}`);
        throw error;
      }
      if (!chainResult.success) {
        const error: any = new Error(chainResult.error || 'Failed to allocate forex on blockchain');
        error.code = 'FOREX_ALLOCATE_FAILED';
        logger.error(`[ForexService] AllocateForex failed for ${forexId}: ${error.message}`);
        throw error;
      }
      const blockchainTxId: string | null = chainResult.txId || null;
      logger.info(`✅ [ForexService] Forex ${forexId} allocated on-chain, tx ${blockchainTxId}`);

      // No direct CouchDB write here: the ledger write above is the
      // allocation. The old code PUT the LC (FOREX_ALLOCATED) and a FOREX
      // doc straight into one peer's CouchDB and returned success with
      // txId null even when the chain call had failed — a phantom the
      // other five peers never saw. CouchDB now only reflects the
      // committed block, via the orderer.

      // Postgres mirror — written ONLY after the on-chain allocation
      // above succeeded. Amounts match the chaincode's retention split.
      const allocatedAmount = allocationData.amount;
      const retentionAmount = allocatedAmount * (allocationData.retentionRate / 100);
      const releaseAmount = allocatedAmount - retentionAmount;

      // currentStatus is the PG value, or the chaincode value when the row
      // only exists on the ledger (forex is undefined in that case).
      // 'APPROVED' is a legacy PG value the old NBE approve route wrote;
      // the FOREX table is chain-pure (REQUESTED/CONFIRMED → ALLOCATED),
      // so normalise it to CONFIRMED here rather than adding a legacy
      // edge to the table (TEST-STATUS-MATRIX §17 #12).
      const validatedStatus = currentStatus === 'APPROVED' ? 'CONFIRMED' : currentStatus;
      await statusManager.updateEntityStatus('FOREX', forexId, validatedStatus, 'ALLOCATED');

      // Update LC status to FOREX_ALLOCATED in PostgreSQL, mirroring the
      // on-chain LC status AllocateForex just set on the ledger.
      try {
        await this.dbService.run(
          `UPDATE letters_of_credit 
           SET status = $1, updated_at = NOW()
           WHERE lc_id = $2 AND status IN ('APPROVED', 'ISSUED', 'REQUESTED')`,
          ['FOREX_ALLOCATED', lcId]
        );
        logger.info(`✅ [ForexService] LC ${lcId} status updated to FOREX_ALLOCATED in PostgreSQL`);
      } catch (lcErr) {
        logger.warn(`⚠️ Failed to update LC status in PostgreSQL: ${lcErr}`);
      }

      await this.dbService.run(
        `UPDATE forex_allocations 
         SET status = $1, lc_id = $2, exchange_rate = $3, retention_rate = $4,
             allocated_amount = $5, retention_amount = $6, release_amount = $7,
             allocated_by = $8, allocated_at = NOW(), approval_ref = $9,
             expiry_date = $10, blockchain_tx_id = $11
         WHERE forex_id = $12`,
        [
          'ALLOCATED',
          lcId,
          allocationData.exchangeRate,
          allocationData.retentionRate,
          allocatedAmount,
          retentionAmount,
          releaseAmount,
          allocationData.officer,
          allocationData.approvalRef,
          allocationData.expiryDate,
          blockchainTxId,
          forexId,
        ]
      );

      await this.auditService.log({
        entityType: 'FOREX',
        entityId: forexId,
        action: 'ALLOCATE',
        performedBy: allocationData.userId,
        organization: allocationData.userOrg,
        performedByOrg: allocationData.userOrg,
        oldValue: forex?.status || currentStatus,
        newValue: 'ALLOCATED',
        reason: 'Forex allocated',
        metadata: {
          lcId: lcId,
          allocatedAmount,
          retentionAmount,
          releaseAmount,
          retentionRate: allocationData.retentionRate,
        },
      });

      logger.info(`✅ [ForexService] Forex allocated: ${forexId} (Retention: ${retentionAmount} ${forex?.currency || 'USD'})`);
      return { success: true, forexId: forexId, txId: blockchainTxId, retentionAmount, releaseAmount, blockchainSynced: true };
    } catch (error: any) {
      logger.error(`❌ [ForexService] Allocation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Utilize forex (mark as used when payment is made)
   */
  async utilizeForex(forexId: string, utilizedAmount: number, userId: string, userOrg: string) {
    try {
      logger.info(`[ForexService] Utilizing forex: ${forexId}`);

      const forex = await this.dbService.get(
        'SELECT * FROM forex_allocations WHERE forex_id = $1',
        [forexId]
      );

      if (!forex) {
        throw new Error('Forex allocation not found');
      }

      const result = await this.fabricService.invokeChaincode('UtilizeForex', [
        forexId,
        utilizedAmount.toString(),
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to utilize forex on blockchain');
      }

      await statusManager.updateEntityStatus('FOREX', forexId, forex.status, 'UTILIZED');

      await this.dbService.run(
        `UPDATE forex_allocations 
         SET status = $1, utilized_amount = $2, utilized_at = NOW(), blockchain_tx_id = $3
         WHERE forex_id = $4`,
        ['UTILIZED', utilizedAmount, result.txId, forexId]
      );

      await this.auditService.log({
        entityType: 'FOREX',
        entityId: forexId,
        action: 'UTILIZE',
        performedBy: userId,
        organization: userOrg,
        performedByOrg: userOrg,
        oldValue: forex.status,
        newValue: 'UTILIZED',
        reason: 'Forex utilized',
        metadata: { utilizedAmount },
      });

      logger.info(`✅ [ForexService] Forex utilized: ${forexId}`);
      return { success: true, forexId, txId: result.txId };
    } catch (error: any) {
      logger.error(`❌ [ForexService] Utilization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get forex by ID
   */
  async getForex(forexId: string) {
    return await this.dbService.get(
      'SELECT * FROM forex_allocations WHERE forex_id = $1',
      [forexId]
    );
  }

  /**
   * Get forex allocations by LC
   */
  async getForexByLC(lcId: string) {
    return await this.dbService.all(
      'SELECT * FROM forex_allocations WHERE lc_id = $1 ORDER BY created_at DESC',
      [lcId]
    );
  }

  /**
   * ✅ EXPERT FIX: Verify LC status has propagated to blockchain
   * This prevents race conditions in distributed blockchain systems
   */
  private async verifyLCStatusOnBlockchain(
    lcId: string, 
    expectedStatus: string, 
    maxRetries: number = 10, 
    delayMs: number = 3000
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Query blockchain directly (not database cache)
        const result = await this.fabricService.queryChaincode('ReadLC', [lcId]);
        
        if (result.success && result.data) {
          const lcData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
          
          if (lcData.Status === expectedStatus || lcData.status === expectedStatus) {
            logger.info(`✅ LC ${lcId} status verified as ${expectedStatus} on blockchain (attempt ${attempt}/${maxRetries})`);
            return true;
          }
          
          logger.info(`⏳ LC ${lcId} status is ${lcData.Status || lcData.status}, waiting for ${expectedStatus} (attempt ${attempt}/${maxRetries})`);
        }
      } catch (error: any) {
        logger.warn(`⚠️ Error verifying LC status (attempt ${attempt}/${maxRetries}): ${error.message}`);
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    logger.error(`❌ LC ${lcId} status verification failed after ${maxRetries} attempts`);
    return false;
  }
}

export const forexService = ForexService.getInstance();
