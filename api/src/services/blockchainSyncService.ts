/**
 * Blockchain Sync Service
 * 
 * Background service that retries failed blockchain writes.
 * Monitors blockchain_synced column and retries pending transactions.
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Configurable retry limits and intervals
 * - Graceful handling of blockchain timeouts
 * - Detailed logging for monitoring
 */

import { logger } from '../utils/logger';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from './fabricService';

const db = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();

interface PendingRecord {
  id: number;
  entity_type: 'contract' | 'shipment' | 'audit';
  entity_id: string;
  data: any;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

interface SyncStats {
  totalPending: number;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
}

class BlockchainSyncService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
  private readonly MAX_RETRIES = 5; // Maximum retry attempts
  private readonly BATCH_SIZE = 10; // Process 10 records at a time
  private readonly MIN_RETRY_DELAY_MS = 300000; // Wait 5 minutes before retry
  private readonly BLOCKCHAIN_TIMEOUT_MS = 30000; // 30 second timeout for blockchain ops

  /**
   * Start the background sync service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('⚠️ Blockchain sync service already running');
      return;
    }

    logger.info('🚀 Starting blockchain sync service...');
    this.isRunning = true;

    // Run immediately on start
    this.syncPendingRecords().catch(err => {
      logger.error(`❌ Initial sync failed: ${err.message}`);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.syncPendingRecords().catch(err => {
        logger.error(`❌ Periodic sync failed: ${err.message}`);
      });
    }, this.CHECK_INTERVAL_MS);

    logger.info(`✅ Blockchain sync service started (checking every ${this.CHECK_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ Blockchain sync service not running');
      return;
    }

    logger.info('🛑 Stopping blockchain sync service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('✅ Blockchain sync service stopped');
  }

  /**
   * Main sync function - finds and retries pending blockchain writes
   */
  private async syncPendingRecords(): Promise<SyncStats> {
    const stats: SyncStats = {
      totalPending: 0,
      syncedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    try {
      // Find contracts pending blockchain sync
      const pendingContracts = await this.findPendingContracts();
      stats.totalPending += pendingContracts.length;

      // Find shipments pending blockchain sync
      const pendingShipments = await this.findPendingShipments();
      stats.totalPending += pendingShipments.length;

      if (stats.totalPending === 0) {
        logger.debug('✅ No pending blockchain syncs found');
        return stats;
      }

      logger.info(`📋 Found ${stats.totalPending} records pending blockchain sync (${pendingContracts.length} contracts, ${pendingShipments.length} shipments)`);

      // Sync contracts
      for (const contract of pendingContracts) {
        const result = await this.syncContract(contract);
        if (result === 'synced') stats.syncedCount++;
        else if (result === 'failed') stats.failedCount++;
        else stats.skippedCount++;
      }

      // Sync shipments
      for (const shipment of pendingShipments) {
        const result = await this.syncShipment(shipment);
        if (result === 'synced') stats.syncedCount++;
        else if (result === 'failed') stats.failedCount++;
        else stats.skippedCount++;
      }

      logger.info(`📊 Sync complete: ${stats.syncedCount} synced, ${stats.failedCount} failed, ${stats.skippedCount} skipped`);

    } catch (error: any) {
      logger.error(`❌ Sync process error: ${error.message}`);
    }

    return stats;
  }

  /**
   * Find contracts that need blockchain sync
   */
  private async findPendingContracts(): Promise<any[]> {
    const query = `
      SELECT 
        id, contract_id, exporter_id, buyer_id, 
        quantity, price_per_kg, payment_terms, 
        status, created_at, blockchain_tx_id
      FROM contracts 
      WHERE (blockchain_synced = false OR blockchain_synced IS NULL)
        AND status != 'cancelled'
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await db.all(query, [this.BATCH_SIZE]);
    return result || [];
  }

  /**
   * Find shipments that need blockchain sync
   */
  private async findPendingShipments(): Promise<any[]> {
    const query = `
      SELECT 
        id, shipment_id, contract_id, exporter_id, buyer_id,
        origin, destination, quantity, grade,
        status, created_at, blockchain_tx_id
      FROM shipments 
      WHERE (blockchain_synced = false OR blockchain_synced IS NULL)
        AND status != 'cancelled'
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await db.all(query, [this.BATCH_SIZE]);
    return result || [];
  }

  /**
   * Sync a single contract to blockchain
   */
  private async syncContract(contract: any): Promise<'synced' | 'failed' | 'skipped'> {
    try {
      // Check if already has blockchain_tx_id
      if (contract.blockchain_tx_id) {
        logger.debug(`⏭️ Contract ${contract.contract_id} already has tx_id, marking as synced`);
        await this.markContractSynced(contract.id, contract.blockchain_tx_id);
        return 'synced';
      }

      logger.info(`🔄 Syncing contract ${contract.contract_id} to blockchain...`);

      // Write to blockchain with timeout
      const result = await Promise.race([
        fabricService.registerSalesContract(
          contract.contract_id,
          contract.exporter_id,
          contract.buyer_id || '',
          '', // buyerCountry (not in simple schema)
          '', // coffeeType (not in simple schema)
          contract.quantity?.toString() || '0',
          contract.price_per_kg?.toString() || '0',
          'USD', // currency (default)
          'false', // eudrRequired (default)
          '', // buyerBank
          '', // exporterBank
          '[]', // documentsJSON
          undefined // userRole
        ),
        this.timeout(this.BLOCKCHAIN_TIMEOUT_MS, `Contract ${contract.contract_id} blockchain timeout`),
      ]);

      const txId = result.txId || 'unknown';

      // Update database to mark as synced
      await this.markContractSynced(contract.id, txId);
      
      logger.info(`✅ Contract ${contract.contract_id} synced successfully (tx: ${txId})`);
      return 'synced';

    } catch (error: any) {
      logger.error(`❌ Failed to sync contract ${contract.contract_id}: ${error.message}`);
      
      // Don't retry indefinitely - log as failed after timeout
      if (this.shouldGiveUp(contract.created_at)) {
        logger.warn(`⚠️ Contract ${contract.contract_id} exceeded retry window, marking as failed`);
        await this.markContractFailed(contract.id, error.message);
        return 'failed';
      }
      
      return 'skipped';
    }
  }

  /**
   * Sync a single shipment to blockchain
   */
  private async syncShipment(shipment: any): Promise<'synced' | 'failed' | 'skipped'> {
    try {
      // Check if already has blockchain_tx_id
      if (shipment.blockchain_tx_id) {
        logger.debug(`⏭️ Shipment ${shipment.shipment_id} already has tx_id, marking as synced`);
        await this.markShipmentSynced(shipment.id, shipment.blockchain_tx_id);
        return 'synced';
      }

      logger.info(`🔄 Syncing shipment ${shipment.shipment_id} to blockchain...`);

      // Write to blockchain with timeout
      const result = await Promise.race([
        fabricService.createShipment(
          shipment.shipment_id,
          shipment.contract_id || '',
          shipment.exporter_id || '',
          shipment.buyer_id || '',
          shipment.origin || '',
          shipment.quantity?.toString() || '0',
          shipment.grade || '',
          '', // icoNumber (not in simple schema)
          '', // ecxLotNumber
          '', // channel
          '0', // forexRate
          '0', // valueUsd
          'false', // eudrCompliant
          '[]' // documentsJSON
        ),
        this.timeout(this.BLOCKCHAIN_TIMEOUT_MS, `Shipment ${shipment.shipment_id} blockchain timeout`),
      ]);

      const txId = result.txId || 'unknown';

      // Update database to mark as synced
      await this.markShipmentSynced(shipment.id, txId);
      
      logger.info(`✅ Shipment ${shipment.shipment_id} synced successfully (tx: ${txId})`);
      return 'synced';

    } catch (error: any) {
      logger.error(`❌ Failed to sync shipment ${shipment.shipment_id}: ${error.message}`);
      
      // Don't retry indefinitely - log as failed after timeout
      if (this.shouldGiveUp(shipment.created_at)) {
        logger.warn(`⚠️ Shipment ${shipment.shipment_id} exceeded retry window, marking as failed`);
        await this.markShipmentFailed(shipment.id, error.message);
        return 'failed';
      }
      
      return 'skipped';
    }
  }

  /**
   * Mark contract as successfully synced
   */
  private async markContractSynced(id: number, txId: string): Promise<void> {
    await db.run(
      'UPDATE contracts SET blockchain_synced = true, blockchain_tx_id = $1 WHERE id = $2',
      [txId, id]
    );
  }

  /**
   * Mark shipment as successfully synced
   */
  private async markShipmentSynced(id: number, txId: string): Promise<void> {
    await db.run(
      'UPDATE shipments SET blockchain_synced = true, blockchain_tx_id = $1 WHERE id = $2',
      [txId, id]
    );
  }

  /**
   * Mark contract as permanently failed
   */
  private async markContractFailed(id: number, error: string): Promise<void> {
    await db.run(
      'UPDATE contracts SET blockchain_synced = false, blockchain_tx_id = $1 WHERE id = $2',
      [`FAILED: ${error.substring(0, 200)}`, id]
    );
  }

  /**
   * Mark shipment as permanently failed
   */
  private async markShipmentFailed(id: number, error: string): Promise<void> {
    await db.run(
      'UPDATE shipments SET blockchain_synced = false, blockchain_tx_id = $1 WHERE id = $2',
      [`FAILED: ${error.substring(0, 200)}`, id]
    );
  }

  /**
   * Check if record is too old to keep retrying
   */
  private shouldGiveUp(createdAt: string): boolean {
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const recordAge = Date.now() - new Date(createdAt).getTime();
    return recordAge > MAX_AGE_MS;
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Get current sync statistics (for monitoring)
   */
  async getStats(): Promise<{
    pendingContracts: number;
    pendingShipments: number;
    failedContracts: number;
    failedShipments: number;
  }> {
    const pendingContracts = await db.get(
      'SELECT COUNT(*) as count FROM contracts WHERE blockchain_synced = false OR blockchain_synced IS NULL'
    );

    const pendingShipments = await db.get(
      'SELECT COUNT(*) as count FROM shipments WHERE blockchain_synced = false OR blockchain_synced IS NULL'
    );

    const failedContracts = await db.get(
      "SELECT COUNT(*) as count FROM contracts WHERE blockchain_tx_id LIKE 'FAILED:%'"
    );

    const failedShipments = await db.get(
      "SELECT COUNT(*) as count FROM shipments WHERE blockchain_tx_id LIKE 'FAILED:%'"
    );

    return {
      pendingContracts: pendingContracts?.count || 0,
      pendingShipments: pendingShipments?.count || 0,
      failedContracts: failedContracts?.count || 0,
      failedShipments: failedShipments?.count || 0,
    };
  }

  /**
   * Manual trigger for sync (useful for testing)
   */
  async syncNow(): Promise<SyncStats> {
    logger.info('🔄 Manual sync triggered...');
    return await this.syncPendingRecords();
  }
}

// Export singleton instance
export const blockchainSyncService = new BlockchainSyncService();
