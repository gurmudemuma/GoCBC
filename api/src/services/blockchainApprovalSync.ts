/**
 * Blockchain Approval Sync Service
 * Syncs approval requirements from PostgreSQL to blockchain
 */

import { DatabaseService } from './databaseService';
import FabricService from './fabricService';
import { logger } from '../utils/logger';

class BlockchainApprovalSyncService {
  private dbService = DatabaseService.getInstance();
  private fabricService = FabricService.getInstance();
  private syncedRequirements = new Set<string>(); // Cache to avoid repeated syncs

  /**
   * Sync approval requirement to blockchain
   */
  async syncRequirementToBlockchain(documentType: string, entityType: string): Promise<boolean> {
    try {
      const cacheKey = `${documentType}_${entityType}`;
      
      // Check if already synced in this session
      if (this.syncedRequirements.has(cacheKey)) {
        logger.debug(`[ApprovalSync] Already synced: ${cacheKey}`);
        return true;
      }

      // Get requirement from PostgreSQL
      const requirement = await this.dbService.get(
        `SELECT document_type, entity_type, min_approvers, required_roles, approval_order, description
         FROM approval_requirements
         WHERE document_type = $1 AND entity_type = $2 AND active = true`,
        [documentType, entityType]
      );

      if (!requirement) {
        logger.debug(`[ApprovalSync] No requirement found for ${documentType}/${entityType}`);
        return true; // No requirement to sync
      }

      // Check if blockchain is connected
      if (!this.fabricService.isConnected()) {
        logger.warn('[ApprovalSync] Blockchain not connected, skipping sync');
        return false;
      }

      // Convert roles array to comma-separated string
      const rolesString = Array.isArray(requirement.required_roles) 
        ? requirement.required_roles.join(',')
        : '';

      // Sync to blockchain
      logger.info(`[ApprovalSync] Syncing requirement to blockchain: ${documentType}/${entityType}`);
      
      const result = await this.fabricService.invokeChaincode('SetApprovalRequirement', [
        documentType,
        entityType,
        requirement.min_approvers.toString(),
        rolesString,
        requirement.approval_order || 'parallel',
        requirement.description || ''
      ]);

      if (!result.success) {
        logger.error(`[ApprovalSync] Failed to sync to blockchain: ${result.error}`);
        return false;
      }

      // Mark as synced
      this.syncedRequirements.add(cacheKey);
      logger.info(`[ApprovalSync] ✅ Synced to blockchain: ${documentType}/${entityType}`);
      
      return true;
    } catch (error) {
      logger.error('[ApprovalSync] Error syncing requirement:', error);
      return false;
    }
  }

  /**
   * Sync all approval requirements to blockchain
   */
  async syncAllRequirements(): Promise<{ success: number; failed: number }> {
    try {
      const requirements = await this.dbService.all(
        `SELECT document_type, entity_type FROM approval_requirements WHERE active = true`
      );

      if (!requirements || requirements.length === 0) {
        logger.info('[ApprovalSync] No requirements to sync');
        return { success: 0, failed: 0 };
      }

      let success = 0;
      let failed = 0;

      for (const req of requirements) {
        const synced = await this.syncRequirementToBlockchain(
          req.document_type,
          req.entity_type
        );
        
        if (synced) {
          success++;
        } else {
          failed++;
        }
      }

      logger.info(`[ApprovalSync] Sync complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      logger.error('[ApprovalSync] Error syncing all requirements:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Ensure requirement is synced before document operation
   */
  async ensureRequirementSynced(documentType: string, entityType: string): Promise<void> {
    const synced = await this.syncRequirementToBlockchain(documentType, entityType);
    if (!synced) {
      logger.warn(`[ApprovalSync] Failed to sync requirement for ${documentType}/${entityType}`);
    }
  }

  /**
   * Clear sync cache (useful for testing or after blockchain restart)
   */
  clearCache(): void {
    this.syncedRequirements.clear();
    logger.info('[ApprovalSync] Cache cleared');
  }
}

export const blockchainApprovalSync = new BlockchainApprovalSyncService();
export default blockchainApprovalSync;
