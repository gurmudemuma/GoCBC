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
          forex_id, contract_id, lc_id, exporter_id, amount, currency,
          status, blockchain_synced, blockchain_tx_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
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

      const forex = await this.dbService.get(
        'SELECT * FROM forex_allocations WHERE forex_id = $1',
        [forexId]
      );

      if (!forex) {
        throw new Error('Forex request not found');
      }

      const result = await this.fabricService.invokeChaincode('AllocateForex', [
        forexId,
        lcId,
        allocationData.amount.toString(),
        allocationData.exchangeRate.toString(),
        allocationData.retentionRate.toString(),
        allocationData.officer,
        allocationData.approvalRef,
        allocationData.expiryDate,
      ]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to allocate forex on blockchain');
      }

      await statusManager.updateEntityStatus('FOREX', forexId, forex.status, 'ALLOCATED');

      // Calculate retention amount
      const allocatedAmount = allocationData.amount;
      const retentionAmount = allocatedAmount * (allocationData.retentionRate / 100);
      const releaseAmount = allocatedAmount - retentionAmount;

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
}

export const forexService = ForexService.getInstance();
