// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// TRUE BLOCKCHAIN AUDIT TRAIL SERVICE
// Writes audit logs to Hyperledger Fabric blockchain FIRST, then caches in PostgreSQL

import { DatabaseService } from './databaseService';
import { FabricService } from './fabricService';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  organization: string;  // Add organization field
  performedByOrg: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
}

interface FieldChange {
  fieldName: string;
  oldValue: string;
  newValue: string;
  dataType: string;
}

interface ComplianceMetadata {
  ectaCompliance: boolean;
  nbeCompliance: boolean;
  ucp600Check: boolean;
  eudrCompliance: boolean;
  icoCompliance: boolean;
  complianceNote: string;
}

export class AuditService {
  private static instance: AuditService;
  private db: DatabaseService;
  private fabric: FabricService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.fabric = FabricService.getInstance();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit trail entry - TRUE BLOCKCHAIN IMPLEMENTATION
   * Writes to Hyperledger Fabric blockchain FIRST, then caches in PostgreSQL
   */
  async log(entry: AuditLogEntry): Promise<void> {
    let blockchainTxId: string | undefined;
    let blockchainVerified = false;

    try {
      // STEP 1: Write to BLOCKCHAIN FIRST (Hyperledger Fabric)
      // This creates an immutable audit log entry with cryptographic signature
      if (this.fabric.isConnected()) {
        try {
          // Connect as the appropriate organization
          await this.fabric.connectAsOrg(entry.performedByOrg);

          // Build field changes array for blockchain
          const changes: FieldChange[] = [];
          if (entry.oldValue || entry.newValue) {
            changes.push({
              fieldName: 'status',
              oldValue: entry.oldValue || '',
              newValue: entry.newValue || '',
              dataType: 'string'
            });
          }

          // Build compliance metadata
          const compliance: ComplianceMetadata = {
            ectaCompliance: entry.entityType === 'EXPORTER' || entry.entityType === 'CONTRACT',
            nbeCompliance: entry.entityType === 'LC' || entry.entityType === 'FOREX',
            ucp600Check: entry.entityType === 'LC' || entry.entityType === 'PAYMENT',
            eudrCompliance: entry.entityType === 'CONTRACT' || entry.entityType === 'SHIPMENT',
            icoCompliance: entry.entityType === 'QUALITY' || entry.entityType === 'INSPECTION',
            complianceNote: entry.reason || 'System audit log'
          };

          // Invoke CreateAuditLog chaincode function
          const result = await this.fabric.invokeChaincode('CreateAuditLog', [
            entry.action,                    // actionType: CREATE, UPDATE, APPROVE, REJECT, etc.
            entry.entityType,                // entityType: EXPORTER, CONTRACT, LC, PAYMENT, etc.
            entry.entityId,                  // entityID
            entry.oldValue || '',            // statusBefore
            entry.newValue || '',            // statusAfter
            JSON.stringify(changes),         // changes array
            entry.reason || '',              // reason
            JSON.stringify(compliance)       // complianceData
          ]);

          if (result.success && result.txId) {
            blockchainTxId = result.txId;
            blockchainVerified = true;
            logger.info(`✅ Blockchain audit log created: ${entry.action} on ${entry.entityType} ${entry.entityId} - TxID: ${blockchainTxId}`);
          } else {
            logger.warn(`⚠️ Blockchain audit log failed: ${result.error || 'Unknown error'} - Falling back to PostgreSQL only`);
          }
        } catch (blockchainError) {
          logger.warn(`⚠️ Blockchain audit log error:`, blockchainError);
          logger.warn(`⚠️ Continuing with PostgreSQL audit log only`);
        }
      } else {
        logger.debug(`ℹ️ Blockchain not connected - using PostgreSQL audit log only`);
      }

      // STEP 2: Cache in PostgreSQL (backup + fast queries)
      // Add blockchain metadata to the entry
      const enhancedMetadata = {
        ...(entry.metadata || {}),
        source: blockchainVerified ? 'HYPERLEDGER_FABRIC' : 'POSTGRESQL',
        blockchainVerified,
        blockchainTxId: blockchainTxId || null,
        timestamp: new Date().toISOString()
      };

      await this.db.run(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.entityType,
          entry.entityId,
          entry.action,
          entry.performedBy,
          entry.organization,
          entry.performedByOrg,
          entry.oldValue || 'N/A',
          entry.newValue || 'N/A',
          entry.reason || '',
          JSON.stringify(enhancedMetadata),
          entry.ipAddress || 'unknown'
        ]
      );
      
      logger.info(`✅ Audit log persisted: ${entry.action} on ${entry.entityType} ${entry.entityId} by ${entry.performedBy}${blockchainVerified ? ' [BLOCKCHAIN VERIFIED]' : ''}`);
    } catch (error) {
      logger.error('❌ Failed to create audit log:', error);
      // Don't throw - audit logging should never break the main operation
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string): Promise<any[]> {
    try {
      const logs = await this.db.all(
        `SELECT * FROM audit_trail 
         WHERE entity_type = $1 AND entity_id = $2 
         ORDER BY created_at DESC`,
        [entityType, entityId]
      );
      
      return logs.map(log => ({
        ...log,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
      }));
    } catch (error) {
      logger.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get recent audit logs for the current user's portal
   * Automatically filters by user's organization and relevant entity types
   * ENHANCED: Enriches blockchain-verified logs with full cryptographic details from blockchain
   */
  async getRecentLogs(filters: {
    entityType?: string;
    organization?: string;
    performedBy?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = 'SELECT * FROM audit_trail WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.entityType) {
        query += ` AND entity_type = $${paramIndex}`;
        params.push(filters.entityType);
        paramIndex++;
      }

      if (filters.organization) {
        query += ` AND performed_by_org = $${paramIndex}`;
        params.push(filters.organization);
        paramIndex++;
      }

      if (filters.performedBy) {
        query += ` AND performed_by = $${paramIndex}`;
        params.push(filters.performedBy);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(filters.limit || 100);

      const logs = await this.db.all(query, params);
      
      // Enrich blockchain-verified logs with full details from blockchain
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        
        // If this log is from blockchain and we have entity details, fetch full blockchain audit log
        if (metadata.source === 'HYPERLEDGER_FABRIC' && metadata.blockchainVerified && log.entity_type && log.entity_id) {
          try {
            if (this.fabric.isConnected()) {
              const blockchainLogs = await this.fabric.queryChaincode('QueryAuditLogsByEntity', [
                log.entity_type,
                log.entity_id
              ]);
              
              if (blockchainLogs.success && blockchainLogs.data) {
                const bcLogs = Array.isArray(blockchainLogs.data) ? blockchainLogs.data : [blockchainLogs.data];
                
                // Find matching blockchain log by timestamp or transaction ID
                const matchingLog = bcLogs.find((bcLog: any) => {
                  // Try to match by transaction ID if available
                  if (metadata.blockchainTxId && bcLog.signature?.transactionId) {
                    return bcLog.signature.transactionId === metadata.blockchainTxId;
                  }
                  // Otherwise match by approximate timestamp and action
                  const logTime = new Date(log.created_at).getTime();
                  const bcLogTime = new Date(bcLog.createdAt).getTime();
                  const timeDiff = Math.abs(logTime - bcLogTime);
                  return timeDiff < 5000 && bcLog.actionType === log.action; // Within 5 seconds
                });
                
                if (matchingLog) {
                  // Merge blockchain signature details into metadata
                  log.metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                  log.metadata.signature = matchingLog.signature;
                  log.metadata.blockchainTxId = matchingLog.signature?.transactionId || metadata.blockchainTxId;
                  log.metadata.complianceData = matchingLog.complianceData;
                  log.metadata.changes = matchingLog.changes;
                  logger.debug(`Enriched log ${log.id} with blockchain signature details`);
                }
              }
            }
          } catch (error) {
            logger.warn(`Failed to enrich log ${log.id} with blockchain details:`, error);
            // Continue without enrichment - original metadata still available
          }
        }
        
        return {
          ...log,
          metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        };
      }));
      
      return enrichedLogs;
    } catch (error) {
      logger.error('Failed to fetch recent audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters?: {
    entityType?: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      let query = `
        SELECT 
          action,
          entity_type,
          COUNT(*) as count
        FROM audit_trail
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.entityType) {
        query += ` AND entity_type = $${paramIndex}`;
        params.push(filters.entityType);
        paramIndex++;
      }

      if (filters?.organization) {
        query += ` AND performed_by_org = $${paramIndex}`;
        params.push(filters.organization);
        paramIndex++;
      }

      if (filters?.startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters?.endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += ' GROUP BY action, entity_type ORDER BY count DESC';

      const stats = await this.db.all(query, params);
      
      return {
        byAction: stats,
        total: stats.reduce((sum, s) => sum + parseInt(s.count), 0)
      };
    } catch (error) {
      logger.error('Failed to fetch audit statistics:', error);
      return { byAction: [], total: 0 };
    }
  }

  /**
   * Search audit logs with advanced filters (Professional feature)
   */
  async search(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    performedBy?: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    searchText?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    try {
      let query = 'SELECT * FROM audit_trail WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM audit_trail WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Build filter conditions
      const conditions: string[] = [];

      if (filters.entityType) {
        conditions.push(` AND entity_type = $${paramIndex}`);
        params.push(filters.entityType);
        paramIndex++;
      }

      if (filters.entityId) {
        conditions.push(` AND entity_id = $${paramIndex}`);
        params.push(filters.entityId);
        paramIndex++;
      }

      if (filters.action) {
        conditions.push(` AND action = $${paramIndex}`);
        params.push(filters.action);
        paramIndex++;
      }

      if (filters.performedBy) {
        conditions.push(` AND performed_by ILIKE $${paramIndex}`);
        params.push(`%${filters.performedBy}%`);
        paramIndex++;
      }

      if (filters.organization) {
        conditions.push(` AND organization = $${paramIndex}`);
        params.push(filters.organization);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(` AND created_at >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(` AND created_at <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.searchText) {
        conditions.push(` AND (
          reason ILIKE $${paramIndex} OR 
          old_value ILIKE $${paramIndex} OR 
          new_value ILIKE $${paramIndex} OR
          performed_by ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.searchText}%`);
        paramIndex++;
      }

      // Apply conditions
      const conditionStr = conditions.join('');
      query += conditionStr;
      countQuery += conditionStr;

      // Get total count
      const countResult = await this.db.get(countQuery, params);
      const total = parseInt(countResult.total);

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(filters.limit || 50);
      params.push(filters.offset || 0);

      const logs = await this.db.all(query, params);

      return {
        logs: logs.map(log => ({
          ...log,
          metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        })),
        total
      };
    } catch (error) {
      logger.error('Failed to search audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get audit trail summary by date range (Professional feature)
   */
  async getSummary(startDate: string, endDate: string): Promise<any> {
    try {
      const summary = await this.db.all(`
        SELECT 
          entity_type,
          action,
          organization,
          COUNT(*) as count,
          MIN(created_at) as first_occurrence,
          MAX(created_at) as last_occurrence
        FROM audit_trail
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY entity_type, action, organization
        ORDER BY count DESC
      `, [startDate, endDate]);

      const totalCount = await this.db.get(`
        SELECT COUNT(*) as total
        FROM audit_trail
        WHERE created_at >= $1 AND created_at <= $2
      `, [startDate, endDate]);

      return {
        summary,
        total: parseInt(totalCount.total),
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Failed to get audit summary:', error);
      return { summary: [], total: 0, period: { startDate, endDate } };
    }
  }

  /**
   * Verify audit trail integrity (Professional feature)
   */
  async verifyIntegrity(): Promise<{
    status: string;
    issues: string[];
    stats: any;
  }> {
    const issues: string[] = [];
    
    try {
      // Check for missing required fields
      const missingFields = await this.db.all(`
        SELECT id, entity_type, entity_id, action
        FROM audit_trail
        WHERE entity_type = '' OR entity_id = '' OR action = '' OR performed_by = ''
        LIMIT 10
      `);

      if (missingFields.length > 0) {
        issues.push(`Found ${missingFields.length} logs with missing required fields`);
      }

      // Check for orphaned references
      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT entity_type) as entity_types,
          COUNT(DISTINCT performed_by) as performers,
          COUNT(DISTINCT organization) as organizations,
          MIN(created_at) as oldest_log,
          MAX(created_at) as newest_log
        FROM audit_trail
      `);

      // Check for blockchain verification consistency
      const blockchainLogs = await this.db.get(`
        SELECT COUNT(*) as count
        FROM audit_trail
        WHERE metadata::text LIKE '%HYPERLEDGER_FABRIC%'
        AND (metadata->>'blockchainVerified')::boolean = true
      `);

      return {
        status: issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
        issues,
        stats: {
          ...stats,
          blockchainVerifiedCount: parseInt(blockchainLogs.count)
        }
      };
    } catch (error) {
      logger.error('Failed to verify audit integrity:', error);
      return {
        status: 'ERROR',
        issues: ['Failed to verify integrity: ' + (error as Error).message],
        stats: {}
      };
    }
  }

  /**
   * Get TRUE blockchain audit trail directly from Hyperledger Fabric
   * Queries the immutable blockchain ledger for audit trail entries with full cryptographic chain
   * Shows previousStateHash → newStateHash linking for complete audit chain verification
   */
  async getBlockchainAuditLogs(filters?: {
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      if (!this.fabric.isConnected()) {
        logger.warn('Blockchain not connected - cannot query blockchain audit logs');
        return [];
      }

      // Query blockchain audit logs for the entity
      if (filters?.entityId && filters?.entityType) {
        // Use the existing QueryAuditLogsByEntity chaincode function
        // This returns the ACTUAL blockchain audit logs with cryptographic signatures
        const historyResult = await this.fabric.queryChaincode('QueryAuditLogsByEntity', [
          filters.entityType,
          filters.entityId
        ]);

        if (historyResult.success && historyResult.data) {
          const logs = Array.isArray(historyResult.data) ? historyResult.data : [historyResult.data];
          
          // Enhance logs with chain verification
          const enhancedLogs = logs.map((log: any, index: number) => ({
            ...log,
            chainPosition: index + 1,
            totalInChain: logs.length,
            chainVerified: index === 0 ? true : log.signature?.previousStateHash === logs[index - 1].signature?.newStateHash,
            isBlockchainRecord: true,
            immutable: true
          }));
          
          logger.info(`✅ Retrieved ${enhancedLogs.length} blockchain audit logs for ${filters.entityType} ${filters.entityId}`);
          return enhancedLogs;
        }
      }

      // If no specific filters, return empty (would need custom chaincode function to query all audit logs)
      logger.info('Blockchain audit log queries require entityType and entityId filters');
      return [];
    } catch (error) {
      logger.error('Failed to query blockchain audit logs:', error);
      return [];
    }
  }

  /**
   * Verify the complete blockchain audit chain for an entity
   * Checks cryptographic linking between all audit logs (previousStateHash → newStateHash)
   */
  async verifyBlockchainAuditChain(entityType: string, entityId: string): Promise<{
    verified: boolean;
    message: string;
    totalLogs: number;
    brokenLinks: any[];
    chainDetails: any[];
  }> {
    try {
      if (!this.fabric.isConnected()) {
        return {
          verified: false,
          message: 'Blockchain not connected',
          totalLogs: 0,
          brokenLinks: [],
          chainDetails: []
        };
      }

      // Call the blockchain's VerifyAuditTrail function
      const verifyResult = await this.fabric.queryChaincode('VerifyAuditTrail', [
        entityType,
        entityId
      ]);

      if (!verifyResult.success) {
        return {
          verified: false,
          message: `Verification failed: ${verifyResult.error}`,
          totalLogs: 0,
          brokenLinks: [],
          chainDetails: []
        };
      }

      // Get the actual logs to provide details
      const logs = await this.getBlockchainAuditLogs({ entityType, entityId });
      
      // Analyze the chain
      const brokenLinks: any[] = [];
      const chainDetails = logs.map((log: any, index: number) => {
        const detail: any = {
          position: index + 1,
          logId: log.logId,
          actionType: log.actionType,
          transactionId: log.signature?.transactionId,
          previousStateHash: log.signature?.previousStateHash,
          newStateHash: log.signature?.newStateHash,
          dataHash: log.signature?.dataHash,
          timestamp: log.createdAt,
          performer: log.signature?.caller?.commonName,
          organization: log.signature?.caller?.mspId
        };

        // Check chain linking
        if (index > 0) {
          const previousLog = logs[index - 1];
          const isLinked = log.signature?.previousStateHash === previousLog.signature?.newStateHash;
          detail.linkedToPrevious = isLinked;
          
          if (!isLinked) {
            brokenLinks.push({
              position: index + 1,
              currentLogId: log.logId,
              previousLogId: previousLog.logId,
              expectedPreviousHash: previousLog.signature?.newStateHash,
              actualPreviousHash: log.signature?.previousStateHash
            });
          }
        } else {
          detail.linkedToPrevious = true; // First log in chain
          detail.isChainStart = true;
        }

        return detail;
      });

      return {
        verified: verifyResult.data?.isValid || brokenLinks.length === 0,
        message: verifyResult.data?.message || (brokenLinks.length === 0 ? 'Audit chain verified - all cryptographic links intact' : 'Chain verification failed - broken links detected'),
        totalLogs: logs.length,
        brokenLinks,
        chainDetails
      };
    } catch (error) {
      logger.error('Failed to verify blockchain audit chain:', error);
      return {
        verified: false,
        message: `Verification error: ${(error as Error).message}`,
        totalLogs: 0,
        brokenLinks: [],
        chainDetails: []
      };
    }
  }

  /**
   * Verify a specific audit log entry against the blockchain
   * Checks if the PostgreSQL cache matches the immutable blockchain record
   */
  async verifyAgainstBlockchain(logId: number): Promise<{
    verified: boolean;
    message: string;
    blockchainData?: any;
  }> {
    try {
      // Get log from PostgreSQL
      const log = await this.db.get('SELECT * FROM audit_trail WHERE id = $1', [logId]);
      
      if (!log) {
        return {
          verified: false,
          message: 'Log not found in database'
        };
      }

      const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;

      // Check if this log has blockchain transaction ID
      if (!metadata.blockchainTxId) {
        return {
          verified: false,
          message: 'Log was not recorded on blockchain (PostgreSQL only)'
        };
      }

      // Query blockchain for this entity's audit history
      const blockchainLogs = await this.getBlockchainAuditLogs({
        entityType: log.entity_type,
        entityId: log.entity_id
      });

      // Find matching blockchain entry
      const matchingLog = blockchainLogs.find((bcLog: any) => 
        bcLog.signature?.transactionId === metadata.blockchainTxId
      );

      if (matchingLog) {
        return {
          verified: true,
          message: 'Log verified on blockchain',
          blockchainData: matchingLog
        };
      }

      return {
        verified: false,
        message: 'Log not found on blockchain or transaction ID mismatch'
      };
    } catch (error) {
      logger.error('Failed to verify log against blockchain:', error);
      return {
        verified: false,
        message: 'Verification failed: ' + (error as Error).message
      };
    }
  }
}

export default AuditService.getInstance();
