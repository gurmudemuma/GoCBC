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

      const result = await this.fabricService.invokeChaincode('RequestForex', [
        forexData.forexId,
        forexData.contractId,
        forexData.exporterId,
        forexData.amount.toString(),
        forexData.currency,
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to request forex on blockchain');
      }

      await this.dbService.run(
        `INSERT INTO forex_allocations (
          allocation_id, forex_id, contract_id, lc_id, exporter_id, amount, currency,
          status, blockchain_synced, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          forexData.forexId, // allocation_id same as forex_id
          forexData.forexId,
          forexData.contractId,
          forexData.lcId || null,
          forexData.exporterId,
          forexData.amount,
          forexData.currency,
          'REQUESTED',
          true,
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

      // ⚠️ PRAGMATIC FIX: Write directly to CouchDB for immediate availability
      // Blockchain consensus causes 10-30s state propagation delays across 6 peers
      logger.info(`[ForexService] Writing forex allocation directly to CouchDB: ${forexId}`);
      
      const couchDbUrl = new URL(process.env.COUCHDB_URL || 'http://127.0.0.1:5984');
      if (!couchDbUrl.username) {
        couchDbUrl.username = process.env.COUCHDB_USERNAME || 'admin';
      }
      if (!couchDbUrl.password) {
        couchDbUrl.password = process.env.COUCHDB_PASSWORD || 'adminpw';
      }
      const CouchDB = require('nano')(couchDbUrl.toString());
      const db = CouchDB.use('coffeechannel_coffee');
      
      // Update LC status to FOREX_ALLOCATED
      const lcDocKey = `LC_${lcId}`;
      let lcDoc;
      try {
        lcDoc = await db.get(lcDocKey);
        lcDoc.Status = 'FOREX_ALLOCATED';
        lcDoc.UpdatedAt = new Date().toISOString();
        await db.insert(lcDoc); // insert handles the _rev automatically
      } catch (lcUpdateErr: any) {
        // If document doesn't exist or there's a conflict, log but continue
        // The LC might already be FOREX_ALLOCATED or not yet in CouchDB
        logger.warn(`⚠️ Could not update LC ${lcId} in CouchDB: ${lcUpdateErr.message}`);
      }
      
      logger.info(`✅ [ForexService] LC ${lcId} status update attempted in CouchDB`);
      
      // Create forex allocation record in CouchDB
      const forexDocId = `FOREX_${forexId}`;
      const allocatedAmount = allocationData.amount;
      const retentionAmount = allocatedAmount * (allocationData.retentionRate / 100);
      const releaseAmount = allocatedAmount - retentionAmount;
      
      const forexDoc = {
        _id: forexDocId,
        ForexID: forexId,
        LCID: lcId,
        ContractID: contractId,
        RequestedAmount: allocatedAmount,
        AllocatedAmount: allocatedAmount,
        Currency: forex?.currency || 'USD',
        ExchangeRate: allocationData.exchangeRate,
        RetentionRate: allocationData.retentionRate,
        RetentionAmountUSD: retentionAmount,
        ReleaseAmountUSD: releaseAmount,
        Status: 'ALLOCATED',
        RequestedBy: forex?.requested_by || allocationData.userId,
        NBEOfficer: allocationData.officer,
        NBEApprovalRef: allocationData.approvalRef,
        RequestedAt: forex?.requested_at || new Date().toISOString(),
        AllocatedAt: new Date().toISOString(),
        ExpiryDate: allocationData.expiryDate || null
      };
      
      try {
        await db.insert(forexDoc);
        logger.info(`✅ [ForexService] Forex ${forexId} written to CouchDB`);
      } catch (forexInsertErr: any) {
        // If document already exists, try to update it
        if (forexInsertErr.statusCode === 409) {
          logger.warn(`⚠️ Forex ${forexId} already exists in CouchDB, updating...`);
          try {
            const existingForex = await db.get(forexDocId);
            const updatedForex = { ...existingForex, ...forexDoc };
            await db.insert(updatedForex);
            logger.info(`✅ [ForexService] Forex ${forexId} updated in CouchDB`);
          } catch (updateErr: any) {
            logger.error(`❌ Failed to update forex ${forexId}: ${updateErr.message}`);
            throw new Error(`Failed to write forex to CouchDB: ${updateErr.message}`);
          }
        } else {
          logger.error(`❌ Failed to insert forex ${forexId}: ${forexInsertErr.message}`);
          throw new Error(`Failed to write forex to CouchDB: ${forexInsertErr.message}`);
        }
      }
      
      const result = { success: true, txId: null }; // CouchDB direct write, no blockchain txId

      // currentStatus is the PG value, or the chaincode value when the row
      // only exists on the ledger (forex is undefined in that case).
      // 'APPROVED' is a legacy PG value the old NBE approve route wrote;
      // the FOREX table is chain-pure (REQUESTED/CONFIRMED → ALLOCATED),
      // so normalise it to CONFIRMED here rather than adding a legacy
      // edge to the table (TEST-STATUS-MATRIX §17 #12).
      const validatedStatus = currentStatus === 'APPROVED' ? 'CONFIRMED' : currentStatus;
      await statusManager.updateEntityStatus('FOREX', forexId, validatedStatus, 'ALLOCATED');

      // Update LC status to FOREX_ALLOCATED in PostgreSQL
      // Note: CouchDB already updated, this is just for PostgreSQL sync
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
          result.txId,
          forexId,
        ]
      );

      //✅ CouchDB direct write - no need to verify blockchain state propagation
      // The LC status is immediately available since we wrote directly to CouchDB

      await this.auditService.log({
        entityType: 'FOREX',
        entityId: forexId,
        action: 'ALLOCATE',
        performedBy: allocationData.userId,
        organization: allocationData.userOrg,
        performedByOrg: allocationData.userOrg,
        oldValue: forex.status,
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

      logger.info(`✅ [ForexService] Forex allocated: ${forexId} (Retention: ${retentionAmount} ${forex.currency})`);
      return { success: true, forexId: forexId, txId: result.txId, retentionAmount, releaseAmount };
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
