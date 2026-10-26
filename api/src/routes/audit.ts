// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Audit Trail API - Cryptographic Verification & Compliance Reporting

import express, { Request, Response } from 'express';
import { Gateway, Network, Contract } from 'fabric-network';
import crypto from 'crypto';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { AuditService } from '../services/auditService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const dbService = DatabaseService.getInstance();
const auditService = AuditService.getInstance();

// ================================
// PORTAL AUDIT TRAIL ENDPOINTS
// ================================

// POST /audit/log - Record a workflow rejection or other explicit audit event.
router.post('/log', authMiddleware, async (req: Request, res: Response) => {
  const { entity_type: entityType, entity_id: entityId, action, status, reason, timestamp } = req.body || {};
  if (!entityType || !entityId || !action || !reason) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'entity_type, entity_id, action, and reason are required' },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const user = (req as any).user || {};
    const organization = user.organization || user.org || user.role || 'SYSTEM';
    await auditService.log({
      entityType: String(entityType).toUpperCase(),
      entityId: String(entityId),
      action: String(action).toUpperCase(),
      performedBy: user.username || user.sub || 'UNKNOWN',
      organization,
      performedByOrg: user.org || organization,
      newValue: status ? String(status) : undefined,
      reason: String(reason),
      metadata: { timestamp, source: 'PORTAL_WORKFLOW' },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      data: { entityType, entityId, action, recorded: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[AUDIT] Failed to record explicit portal audit event:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'AUDIT_LOG_FAILED', message: 'Failed to record workflow audit event' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /audit/portal/recent
 * Get recent audit logs for the current user's portal
 * Automatically filters by user's organization and relevant entity types
 */
router.get('/portal/recent', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { limit = 100, entityType, action, performedBy } = req.query;
    
    logger.info(`[AUDIT] Fetching portal audit logs for ${user.org || user.role}`);
    
    // Determine relevant entity types based on user's role/organization
    const entityTypes: string[] = [];
    const userOrg = (user.org || '').toUpperCase();
    const userRole = (user.role || '').toUpperCase();
    
    // Map organizations to their relevant entity types
    if (userRole === 'ADMIN') {
      // Admin sees EVERYTHING - no entity type filter needed
      // entityTypes remains empty = no filter applied
    } else if (userOrg === 'ECTAMSP' || userRole.includes('ECTA')) {
      entityTypes.push('CONTRACT', 'EXPORTER', 'EXPORTER_APPLICATION', 'QUALITY', 'INSPECTION', 'PERMIT', 'DOCUMENT');
    } else if (userOrg === 'BANKSMSP' || userRole.includes('BANK')) {
      entityTypes.push('LC', 'LETTER_OF_CREDIT', 'CONTRACT', 'PAYMENT', 'FOREX', 'DOCUMENT');
    } else if (userOrg === 'NBEMSP' || userRole.includes('NBE')) {
      entityTypes.push('FOREX', 'LC', 'PAYMENT', 'CONTRACT');
    } else if (userOrg === 'CUSTOMSMSP' || userRole.includes('CUSTOMS')) {
      entityTypes.push('SHIPMENT', 'CUSTOMS_DECLARATION', 'DOCUMENT');
    } else if (userOrg === 'SHIPPINGMSP' || userRole.includes('SHIPPING')) {
      entityTypes.push('SHIPMENT', 'BILL_OF_LADING', 'DOCUMENT');
    } else if (userRole.includes('EXPORTER')) {
      entityTypes.push('CONTRACT', 'SHIPMENT', 'PAYMENT', 'LC', 'DOCUMENT', 'EXPORTER', 'EXPORTER_APPLICATION');
    }
    
    // Build query
    let query = `
      SELECT 
        id,
        entity_type,
        entity_id,
        action,
        performed_by,
        performed_by_org,
        old_value,
        new_value,
        reason,
        metadata,
        ip_address,
        created_at
      FROM audit_trail
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // For exporters, filter by performed_by (their username) OR entity_id containing their username
    // This shows activities THEY performed OR activities performed ON their entities
    if (userRole.includes('EXPORTER') && !performedBy) {
      query += ` AND (performed_by = $${paramIndex} OR entity_id LIKE $${paramIndex + 1})`;
      params.push(user.username);
      params.push(`%${user.username}%`);
      paramIndex += 2;
    }
    
    // If performedBy is explicitly provided (for filtering), use it
    if (performedBy) {
      query += ` AND performed_by = $${paramIndex}`;
      params.push(performedBy);
      paramIndex++;
    }
    
    // Filter by entity types
    if (entityTypes.length > 0 && !entityType) {
      query += ` AND entity_type = ANY($${paramIndex})`;
      params.push(entityTypes);
      paramIndex++;
    }
    
    // Filter by specific entity type if provided
    if (entityType) {
      query += ` AND entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }
    
    // Filter by action if provided
    if (action) {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    // Order and limit
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));
    
    const logs = await dbService.all(query, params);
    
    // Parse metadata
    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
    }));
    
    // Get statistics
    const stats = {
      total: parsedLogs.length,
      byAction: parsedLogs.reduce((acc: any, log: any) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      byEntityType: parsedLogs.reduce((acc: any, log: any) => {
        acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
        return acc;
      }, {}),
      byOrganization: parsedLogs.reduce((acc: any, log: any) => {
        acc[log.performed_by_org] = (acc[log.performed_by_org] || 0) + 1;
        return acc;
      }, {}),
    };
    
    res.json({
      success: true,
      data: {
        logs: parsedLogs,
        statistics: stats,
        filters: {
          organization: userRole === 'ADMIN' ? 'ALL' : user.org,
          role: user.role,
          entityTypes: entityTypes.length > 0 ? entityTypes : 'ALL',
          limit: parseInt(limit as string)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching portal audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch audit logs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /audit/portal/stats
 * Get audit statistics for the current user's portal
 */
router.get('/portal/stats', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;
    
    const stats = await auditService.getStatistics({
      organization: user.org,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /audit/portal/search
 * Professional search audit logs with advanced filters
 */
router.post('/portal/search', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const filters = req.body;
    
    logger.info(`[AUDIT] Searching audit logs with filters for ${user.org || user.role}`);
    
    // Add user's organization filter if not admin
    if (user.role !== 'ADMIN') {
      filters.organization = user.org;
    }
    
    const result = await auditService.search(filters);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error searching audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search audit logs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /audit/portal/summary
 * Get audit trail summary for date range
 */
router.get('/portal/summary', authMiddleware, async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const summary = await auditService.getSummary(startDate as string, endDate as string);
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching audit summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch summary',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /audit/portal/integrity
 * Verify audit trail integrity (Admin only)
 */
router.get('/portal/integrity', authMiddleware, requireRole('ADMIN'), async (req: any, res: Response) => {
  try {
    logger.info('[AUDIT] Verifying audit trail integrity');
    
    const result = await auditService.verifyIntegrity();
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error verifying integrity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify integrity',
      timestamp: new Date().toISOString()
    });
  }
});

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Generate SHA-256 hash of data
 */
function generateHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Extract audit trail from blockchain history using FabricService
 */
async function getEntityHistoryViaService(fabricService: FabricService, entityType: string, entityId: string): Promise<any[]> {
  try {
    let historyKey = '';
    
    // Determine the correct history query based on entity type
    switch (entityType.toUpperCase()) {
      case 'EXPORTER':
        historyKey = `EXPORTER_${entityId}`;
        break;
      case 'CONTRACT':
        historyKey = `CONTRACT_${entityId}`;
        break;
      case 'SHIPMENT':
        historyKey = `SHIPMENT_${entityId}`;
        break;
      case 'LC':
      case 'LETTER_OF_CREDIT':
        historyKey = `LC_${entityId}`;
        break;
      case 'PAYMENT':
        historyKey = `PAYMENT_${entityId}`;
        break;
      case 'FOREX':
        historyKey = `FOREX_${entityId}`;
        break;
      case 'PERMIT':
        historyKey = `PERMIT_${entityId}`;
        break;
      case 'QUALITY':
      case 'INSPECTION':
        historyKey = `INSPECTION_${entityId}`;
        break;
      default:
        historyKey = `${entityType.toUpperCase()}_${entityId}`;
    }

    logger.info(`[AUDIT] Fetching history for key: ${historyKey}`);
    
    // Query blockchain history using FabricService
    const response = await fabricService.queryChaincode('GetHistory', [historyKey]);
    if (!response.success || !response.data) {
      logger.info(`[AUDIT] No history found for ${historyKey}`);
      return [];
    }
    
    const history = response.data;
    
    if (!Array.isArray(history)) {
      logger.info(`[AUDIT] No history found for ${historyKey}`);
      return [];
    }

    logger.info(`[AUDIT] GetHistory returned ${history.length} entries. First timestamp: ${history[0]?.Timestamp}, Last timestamp: ${history[history.length - 1]?.Timestamp}`);
    
    // Hyperledger Fabric GetHistory returns transactions in REVERSE chronological order (newest first)
    // We need to reverse it to get oldest-first for proper hash chain verification
    const historyOldestFirst = [...history].reverse();
    logger.info(`[AUDIT] After reverse - First timestamp: ${historyOldestFirst[0]?.Timestamp}, Last timestamp: ${historyOldestFirst[historyOldestFirst.length - 1]?.Timestamp}`);

    // Process each history entry with proper state hash calculation
    // Safely parse a value that may already be an object or a JSON string
    const safeParse = (raw: any): any => {
      if (raw === null || raw === undefined) return {};
      if (typeof raw === 'object') return raw;
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    };

    const auditLogs = await Promise.all(historyOldestFirst.map(async (entry: any, index: number) => {
      const value = safeParse(entry.Value);
      const ledgerTransaction = typeof entry.TxId === 'string'
        ? await fabricService.getTransactionDetails(entry.TxId)
        : null;
      const actionType = ledgerTransaction?.chaincodeFunction || 'STATE_UPDATE';
      
      // This is a derived fingerprint of a state snapshot returned by
      // GetHistory, not a stored block hash or an audit-chain link.
      const ledgerStateFingerprint = generateHash(value);
      
      // Extract status change - check multiple possible field names
      const previousParsed = index > 0 ? safeParse(historyOldestFirst[index - 1]?.Value) : null;
      const getPossibleStatus = (obj: any): string => {
        // Check all possible status field names (entity-specific and generic)
        return obj?.contractStatus || obj?.ContractStatus ||
               obj?.licenseStatus || obj?.LicenseStatus ||  // Exporter status
               obj?.lcStatus || obj?.LCStatus || 
               obj?.forexStatus || obj?.ForexStatus || 
               obj?.paymentStatus || obj?.PaymentStatus ||
               obj?.shipmentStatus || obj?.ShipmentStatus || 
               obj?.inspectionStatus || obj?.InspectionStatus ||
               obj?.declarationStatus || obj?.DeclarationStatus ||
               obj?.bookingStatus || obj?.BookingStatus ||
               obj?.status || obj?.Status ||
               'UNKNOWN';
      };
      
      const statusBefore = previousParsed ? getPossibleStatus(previousParsed) : 'INITIAL';
      const statusAfter = getPossibleStatus(value);
      
      // Calculate field changes
      const changes: any[] = [];
      if (index > 0 && historyOldestFirst[index - 1]?.Value !== undefined && historyOldestFirst[index - 1]?.Value !== null) {
        const previousValue = safeParse(historyOldestFirst[index - 1].Value);
        Object.keys(value).forEach(key => {
          if (value[key] !== previousValue[key] && key !== 'UpdatedAt' && key !== 'updatedAt') {
            changes.push({
              fieldName: key,
              oldValue: previousValue[key] ? String(previousValue[key]) : 'N/A',
              newValue: value[key] ? String(value[key]) : 'N/A',
              dataType: typeof value[key]
            });
          }
        });
      }
      
      // Compliance checks
      const complianceData = {
        ectaCompliance: value.ECTAApproved || value.ectaApproved || false,
        nbeCompliance: value.NBEApproved || value.nbeApproved || false,
        ucp600Check: value.UCP600Compliant || value.ucp600Compliant || false,
        eudrCompliance: value.EUDRCompliant || value.eudrCompliant || true,
        icoCompliance: value.ICOCompliant || value.icoCompliant || true,
        complianceNote: value.ComplianceNote || value.complianceNote || 'All regulatory requirements met'
      };
      
      const txInfo = {
        transactionId: entry.TxId || null,
        timestamp: ledgerTransaction?.timestamp || entry.Timestamp || null,
        channelId: ledgerTransaction?.channelId || null,
        caller: ledgerTransaction ? {
          mspId: ledgerTransaction.creator.mspId,
          commonName: ledgerTransaction.creator.certificateSubject || ledgerTransaction.creator.identity,
          signatureValid: ledgerTransaction.creator.signatureValid,
          certificateTrustStatus: ledgerTransaction.creator.certificateTrustStatus,
        } : null,
        endorsers: ledgerTransaction?.endorsers || [],
        validationCode: ledgerTransaction?.validationCode ?? null,
        validationStatus: ledgerTransaction?.validationStatus || 'UNVERIFIED',
        chaincodeName: ledgerTransaction?.chaincodeName || null,
        chaincodeFunction: ledgerTransaction?.chaincodeFunction || null,
        blockNumber: ledgerTransaction?.blockNumber ?? null,
        blockHash: ledgerTransaction?.blockHash ?? null,
        ledgerStateFingerprint,
        ledgerStateFingerprintSource: 'SHA256_OF_FABRIC_HISTORY_VALUE',
      };

      return {
        logId: entry.TxId || `STATE-${entityId}-${index}`,
        actionType,
        entityType: entityType.toUpperCase(),
        entityId,
        signature: txInfo,
        statusBefore,
        statusAfter,
        changes,
        reason: value.Reason || value.reason || value.ApprovalNote || value.RejectionReason || '',
        complianceData,
        createdAt: ledgerTransaction?.timestamp || entry.Timestamp || null,
        blockNumber: txInfo.blockNumber,
        blockHash: txInfo.blockHash,
        tamperStatus: 'NOT_CHECKED'
      };
    }));

    logger.info(`[AUDIT] Loaded ${auditLogs.length} committed state snapshots; transaction proof is resolved separately through QSCC`);

    return auditLogs;
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching entity history:', error);
    
    // If blockchain is not available, return empty array instead of error
    if (error.message?.includes('connection') || error.message?.includes('ECONNREFUSED')) {
      logger.info('[AUDIT] Blockchain not available, returning empty audit trail');
      return [];
    }
    
    throw error;
  }
}

// ================================
// API ROUTES
// ================================

/**
 * GET /audit/entity/:entityType/:entityId
 * Get complete audit trail for an entity with full cryptographic details
 * Includes BOTH database actions (applications, approvals) AND blockchain transactions
 */
router.get('/entity/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Fetching complete audit trail (DB + Blockchain) for ${entityType} ${entityId}`);
    
    let allAuditLogs: any[] = [];
    
    // STEP 1: Query actual AUDIT_* logs from blockchain (created by CreateAuditLog chaincode function)
    try {
      logger.info('[AUDIT] Querying blockchain audit logs...');
      
      // Use QueryAuditLogsByEntity chaincode function to get all audit logs for this entity
      const auditResponse = await fabricService.queryChaincode('QueryAuditLogsByEntity', [entityType, entityId]);
      
      if (auditResponse.success && auditResponse.data && Array.isArray(auditResponse.data)) {
        logger.info(`[AUDIT] Found ${auditResponse.data.length} blockchain audit logs`);
        
        // ✅ ON-DEMAND SYNC: Cache blockchain logs to PostgreSQL for fast future queries
        for (const bcLog of auditResponse.data) {
          try {
            const txId = bcLog.signature?.transactionId || bcLog.Signature?.TransactionID;
            const ledgerTransaction = txId ? await fabricService.getTransactionDetails(txId) : null;
            
            if (txId) {
              // Check if already cached
              const existing = await dbService.get(
                `SELECT id FROM audit_trail WHERE metadata->>'blockchainTxId' = $1`,
                [txId]
              );
              
              if (!existing) {
                // Cache to PostgreSQL
                await dbService.run(
                  `INSERT INTO audit_trail (
                    entity_type, entity_id, action, performed_by, organization, performed_by_org,
                    old_value, new_value, reason, metadata, ip_address, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [
                    bcLog.entityType || bcLog.EntityType,
                    bcLog.entityId || bcLog.EntityID,
                    bcLog.actionType || bcLog.ActionType,
                    bcLog.signature?.caller?.commonName || bcLog.Signature?.Caller?.CommonName || 'System',
                    bcLog.signature?.caller?.mspId || bcLog.Signature?.Caller?.MSPID || 'UNKNOWN',
                    bcLog.signature?.caller?.mspId || bcLog.Signature?.Caller?.MSPID || 'UNKNOWN',
                    bcLog.statusBefore || bcLog.StatusBefore || '',
                    bcLog.statusAfter || bcLog.StatusAfter || '',
                    bcLog.reason || bcLog.Reason || '',
                    JSON.stringify({
                      source: 'HYPERLEDGER_FABRIC',
                      ledgerTransactionFound: !!ledgerTransaction,
                      blockchainTxId: txId,
                      ledgerValidationStatus: ledgerTransaction?.validationStatus || 'UNVERIFIED',
                      ledgerBlockNumber: ledgerTransaction?.blockNumber ?? null,
                      ledgerBlockHash: ledgerTransaction?.blockHash ?? null,
                      signature: bcLog.signature || bcLog.Signature,
                      complianceData: bcLog.complianceData || bcLog.ComplianceData,
                      changes: bcLog.changes || bcLog.Changes,
                      syncedAt: new Date().toISOString()
                    }),
                    'blockchain-sync',
                    bcLog.createdAt || bcLog.CreatedAt || new Date().toISOString()
                  ]
                );
                
                logger.debug(`[SYNC] Cached blockchain audit log ${bcLog.logId || bcLog.LogID} to PostgreSQL`);
              }
            }
          } catch (syncErr) {
            logger.warn(`[SYNC] Could not cache audit log to PostgreSQL:`, syncErr);
            // Don't fail the request if sync fails - blockchain is source of truth
          }
        }
        
        // Transform blockchain audit logs to our format
        for (const auditLog of auditResponse.data) {
          const txId = auditLog.signature?.transactionId || auditLog.Signature?.TransactionID || null;
          const ledgerTransaction = txId ? await fabricService.getTransactionDetails(txId) : null;
          const creator = ledgerTransaction?.creator;
          allAuditLogs.push({
            logId: auditLog.logId || auditLog.LogID,
            actionType: auditLog.actionType || auditLog.ActionType,
            entityType: auditLog.entityType || auditLog.EntityType,
            entityId: auditLog.entityId || auditLog.EntityID,
            hashVersion: auditLog.hashVersion || auditLog.HashVersion || 1,
            signature: {
              transactionId: txId,
              timestamp: ledgerTransaction?.timestamp || auditLog.createdAt || auditLog.CreatedAt || null,
              channelId: ledgerTransaction?.channelId || null,
              functionName: ledgerTransaction?.chaincodeFunction || null,
              caller: creator ? {
                mspId: creator.mspId,
                commonName: creator.certificateSubject || creator.identity,
                signatureValid: creator.signatureValid,
                certificateTrustStatus: creator.certificateTrustStatus,
              } : null,
              endorsers: ledgerTransaction?.endorsers || [],
              validationCode: ledgerTransaction?.validationCode ?? null,
              validationStatus: ledgerTransaction?.validationStatus || 'UNVERIFIED',
              dataHash: auditLog.signature?.dataHash || auditLog.Signature?.DataHash || null,
              dataHashScope: (auditLog.hashVersion || auditLog.HashVersion) >= 2 ? 'FULL_AUDIT_PAYLOAD' : 'LEGACY_STATUS_FIELDS',
              previousStateHash: auditLog.signature?.previousStateHash || auditLog.Signature?.PreviousStateHash || null,
              newStateHash: auditLog.signature?.newStateHash || auditLog.Signature?.NewStateHash || null,
              blockHash: ledgerTransaction?.blockHash || null,
              blockNumber: ledgerTransaction?.blockNumber ?? null,
              chaincodeName: ledgerTransaction?.chaincodeName || null,
              chaincodeFunction: ledgerTransaction?.chaincodeFunction || null,
              ledgerTransactionFound: !!ledgerTransaction,
            },
            statusBefore: auditLog.statusBefore || auditLog.StatusBefore || '',
            statusAfter: auditLog.statusAfter || auditLog.StatusAfter || '',
            changes: auditLog.changes || auditLog.Changes || [],
            reason: auditLog.reason || auditLog.Reason || '',
            complianceData: auditLog.complianceData || auditLog.ComplianceData || {},
            createdAt: ledgerTransaction?.timestamp || auditLog.createdAt || auditLog.CreatedAt || null,
            blockNumber: ledgerTransaction?.blockNumber ?? null,
            blockHash: ledgerTransaction?.blockHash || null,
            source: 'BLOCKCHAIN_AUDIT_LOG'
          });
        }
      }
    } catch (blockchainErr) {
      logger.warn('[AUDIT] Could not fetch blockchain audit logs:', blockchainErr);
    }
    
    // STEP 2: Fetch database audit trail (applications, approvals, user actions)
    if (entityType.toUpperCase() === 'EXPORTER') {
      try {
        logger.info('[AUDIT] Fetching database audit trail for exporter application');
        
        // Get the exporter application from database
        const applicationQuery = `
          SELECT 
            ea.*,
            approver.username as reviewed_by_username,
            approver.role as reviewed_by_role
          FROM exporter_applications ea
          LEFT JOIN users approver ON ea.reviewed_by = approver.username
          WHERE ea.exporter_id = $1
          ORDER BY ea.submitted_at ASC
        `;
        
        const appResult = await dbService.query(applicationQuery, [entityId]);
        
        if (appResult.rows.length > 0) {
          const application = appResult.rows[0];
          
          // APPLICATION SUBMISSION LOG
          allAuditLogs.push({
            logId: `LOG-DB-APPLICATION-${application.application_id}`,
            actionType: 'APPLICATION_SUBMITTED',
            entityType: 'EXPORTER_APPLICATION',
            entityId: application.application_id,
            signature: {
              transactionId: null,
              timestamp: application.submitted_at,
              source: 'PostgreSQL Database',
              recordType: 'DATABASE',
              caller: {
                userId: 'EXPORTER',
                username: application.company_name,
                role: 'EXPORTER',
                organization: application.company_name,
                action: 'Submitted exporter application'
              },
              dataHash: generateHash({
                applicationId: application.application_id,
                companyName: application.company_name,
                exporterId: application.exporter_id,
                submittedAt: application.submitted_at
              })
            },
            statusBefore: 'NOT_STARTED',
            statusAfter: application.status,
            changes: [
              {
                fieldName: 'Application Created',
                oldValue: 'N/A',
                newValue: 'Application submitted with all documents',
                dataType: 'string'
              },
              {
                fieldName: 'Company Name',
                oldValue: 'N/A',
                newValue: application.company_name,
                dataType: 'string'
              },
              {
                fieldName: 'Exporter Type',
                oldValue: 'N/A',
                newValue: application.exporter_type,
                dataType: 'string'
              },
              {
                fieldName: 'Capital Requirement',
                oldValue: 'N/A',
                newValue: application.capital_requirement?.toString() || 'N/A',
                dataType: 'number'
              }
            ],
            reason: 'Initial application submission by exporter',
            complianceData: {
              ectaCompliance: false,
              nbeCompliance: false,
              ucp600Check: false,
              eudrCompliance: true,
              icoCompliance: true,
              complianceNote: 'Application under review'
            },
            applicationDetails: {
              applicationId: application.application_id,
              companyName: application.company_name,
              exporterType: application.exporter_type,
              capitalRequirement: application.capital_requirement,
              professionalTaster: application.professional_taster,
              tasterCertificate: application.taster_certificate,
              laboratoryFacility: application.laboratory_facility,
              laboratoryCertificateNumber: application.laboratory_certificate_number,
              tinNumber: application.tin_number,
              businessLicenseNumber: application.business_license_number,
              address: application.address,
              city: application.city,
              region: application.region,
              contactPerson: application.contact_person,
              phoneNumber: application.phone,
              email: application.email,
              bankName: application.bank_name,
              bankAccountNumber: application.bank_account_number,
              bankBranch: application.bank_branch,
              documentsSubmitted: application.documents ? application.documents.length : 0
            },
            createdAt: application.submitted_at,
            blockNumber: null,
            blockHash: null,
            source: 'POSTGRESQL_APPLICATION_RECORD'
          });
          
          // ECTA REVIEW/APPROVAL LOG (if reviewed)
          if (application.approved_at || application.rejected_at) {
            const reviewAction = application.status === 'approved' ? 'APPLICATION_APPROVED' : 
                                application.status === 'rejected' ? 'APPLICATION_REJECTED' : 'APPLICATION_REVIEWED';
            
            allAuditLogs.push({
              logId: `LOG-DB-REVIEW-${application.application_id}`,
              actionType: reviewAction,
              entityType: 'EXPORTER_APPLICATION',
              entityId: application.application_id,
              signature: {
                transactionId: null,
                timestamp: application.approved_at || application.rejected_at,
                source: 'PostgreSQL Database',
                recordType: 'DATABASE',
                caller: {
                  userId: application.reviewed_by || 'ECTA',
                  username: application.reviewed_by_username || application.reviewed_by || 'ECTA Admin',
                  role: application.reviewed_by_role || 'ECTA',
                  organization: 'ECTA',
                  action: `${application.status === 'approved' ? 'Approved' : 'Rejected'} exporter application`
                },
                dataHash: generateHash({
                  applicationId: application.application_id,
                  reviewedBy: application.reviewed_by,
                  status: application.status,
                  reviewedAt: application.approved_at || application.rejected_at
                })
              },
              statusBefore: 'PENDING',
              statusAfter: application.status.toUpperCase(),
              changes: [
                {
                  fieldName: 'Status',
                  oldValue: 'PENDING',
                  newValue: application.status.toUpperCase(),
                  dataType: 'string'
                },
                {
                  fieldName: 'Reviewed By',
                  oldValue: 'N/A',
                  newValue: application.reviewed_by_username || application.reviewed_by || 'ECTA Admin',
                  dataType: 'string'
                },
                {
                  fieldName: 'Review Notes',
                  oldValue: 'N/A',
                  newValue: application.rejection_reason || 'Application approved',
                  dataType: 'string'
                },
                {
                  fieldName: 'ECTA License Number',
                  oldValue: 'N/A',
                  newValue: application.ecta_license_number || 'Pending',
                  dataType: 'string'
                }
              ],
              reason: application.rejection_reason || `Application ${application.status.toLowerCase()}`,
              complianceData: {
                ectaCompliance: application.status === 'approved',
                nbeCompliance: false,
                ucp600Check: false,
                eudrCompliance: true,
                icoCompliance: true,
                complianceNote: application.status === 'approved' 
                  ? 'ECTA compliance verified and approved' 
                  : 'Application rejected - compliance requirements not met'
              },
              reviewDetails: {
                reviewedBy: application.reviewed_by_username || application.reviewed_by || 'ECTA Admin',
                reviewedAt: application.approved_at || application.rejected_at,
                rejectionReason: application.rejection_reason,
                ectaLicenseNumber: application.ecta_license_number,
                licenseExpiryDate: application.license_expiry_date
              },
              createdAt: application.approved_at || application.rejected_at,
              blockNumber: null,
              blockHash: null,
              source: 'POSTGRESQL_APPLICATION_RECORD'
            });
          }
          
          // BLOCKCHAIN REGISTRATION LOG (if approved and registered)
          if (application.status === 'approved' && application.approved_at) {
            allAuditLogs.push({
              logId: `LOG-DB-BLOCKCHAIN-REG-${application.application_id}`,
              actionType: 'BLOCKCHAIN_REGISTRATION',
              entityType: 'EXPORTER',
              entityId: application.exporter_id,
              signature: {
                transactionId: null,
                timestamp: application.approved_at,
                source: 'System - Blockchain Integration',
                recordType: 'DATABASE',
                caller: {
                  userId: 'SYSTEM',
                  username: 'System',
                  role: 'SYSTEM',
                  organization: 'CECBS',
                  action: 'Registered approved exporter on blockchain'
                },
                dataHash: generateHash({
                  exporterId: application.exporter_id,
                  companyName: application.company_name,
                  ectaLicenseNumber: application.ecta_license_number,
                  registeredAt: application.approved_at
                })
              },
              statusBefore: 'APPROVED',
              statusAfter: 'REGISTERED',
              changes: [
                {
                  fieldName: 'Blockchain Registration',
                  oldValue: 'Not Registered',
                  newValue: 'Registered on Hyperledger Fabric',
                  dataType: 'string'
                },
                {
                  fieldName: 'Exporter ID',
                  oldValue: 'Pending',
                  newValue: application.exporter_id,
                  dataType: 'string'
                },
                {
                  fieldName: 'ECTA License',
                  oldValue: 'Pending',
                  newValue: application.ecta_license_number,
                  dataType: 'string'
                }
              ],
              reason: 'Automatic blockchain registration after ECTA approval',
              complianceData: {
                ectaCompliance: true,
                nbeCompliance: false,
                ucp600Check: false,
                eudrCompliance: true,
                icoCompliance: true,
                complianceNote: 'Exporter registered on immutable blockchain ledger'
              },
              blockchainDetails: {
                channel: 'coffeechannel',
                chaincode: 'coffee',
                function: 'RegisterExporter',
                exporterId: application.exporter_id,
                ectaLicenseNumber: application.ecta_license_number
              },
              createdAt: application.approved_at,
              blockNumber: null,
              blockHash: null,
              source: 'POSTGRESQL_APPLICATION_RECORD'
            });
          }
        }
      } catch (dbError) {
        logger.error('[AUDIT] Error fetching database audit trail:', dbError);
      }
    }
    
    // Sort audit logs by timestamp
    allAuditLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // STEP 3: Add a separate fingerprint for the ledger state snapshot.
    try {
      logger.info('[AUDIT] Enriching audit logs with state snapshot fingerprints...');
      const historyLogs = await getEntityHistoryViaService(fabricService, entityType, entityId);

      // Keep stored audit-chain hashes untouched. GetHistory fingerprints are
      // derived values and are presented separately from those chain hashes.
      for (const auditLog of allAuditLogs) {
        const matchingHistory = historyLogs.find(h => 
          h.signature.transactionId === auditLog.signature.transactionId
        );
        
        if (matchingHistory) {
          auditLog.signature.ledgerStateFingerprint = matchingHistory.signature.ledgerStateFingerprint;
          auditLog.signature.ledgerStateFingerprintSource = matchingHistory.signature.ledgerStateFingerprintSource;
        }
      }
      
      logger.info(`[AUDIT] Enriched ${allAuditLogs.length} audit logs with state snapshot fingerprints`);
    } catch (enrichErr) {
      logger.warn('[AUDIT] Could not enrich with state hashes:', enrichErr);
    }
    
    // STEP 4: FOR SHIPMENTS - Fetch complete workflow history (Exporter → Contract → LC → Forex → Shipment → Payment)
    if (entityType.toUpperCase() === 'SHIPMENT') {
      logger.info(`[AUDIT] ==========================================`);
      logger.info(`[AUDIT] 🚀 SHIPMENT WORKFLOW TRIGGERED`);
      logger.info(`[AUDIT] Entity Type: ${entityType}, ID: ${entityId}`);
      logger.info(`[AUDIT] ==========================================`);
      try {
        logger.info('[AUDIT] 🔗 Fetching complete cross-entity workflow for shipment...');
        
        // Get shipment details to find related entities
        const shipmentResult = await fabricService.queryChaincode('ReadShipment', [entityId]);
        if (shipmentResult.success && shipmentResult.data) {
          const shipment = shipmentResult.data;
          const contractId = shipment.contractId || shipment.ContractID || shipment.contractID;
          const exporterId = shipment.exporterId || shipment.ExporterID || shipment.exporterID;
          
          logger.info(`[AUDIT] 📦 Shipment links: Exporter=${exporterId}, Contract=${contractId}`);
          
          // 1. Fetch exporter history
          if (exporterId) {
            const exporterHistory = await getEntityHistoryViaService(fabricService, 'EXPORTER', exporterId);
            exporterHistory.forEach(log => {
              log.entityType = 'EXPORTER';
              log.entityId = exporterId;
              log.workflowStage = '1. Exporter Registration';
              log.source = 'RELATED_ENTITY';
            });
            allAuditLogs.push(...exporterHistory);
            logger.info(`[AUDIT] ✅ Added ${exporterHistory.length} exporter history records`);
          }
          
          // 2. Fetch contract history
          if (contractId) {
            const contractHistory = await getEntityHistoryViaService(fabricService, 'CONTRACT', contractId);
            contractHistory.forEach(log => {
              log.entityType = 'CONTRACT';
              log.entityId = contractId;
              log.workflowStage = '2. Contract Registration';
              log.source = 'RELATED_ENTITY';
            });
            allAuditLogs.push(...contractHistory);
            logger.info(`[AUDIT] ✅ Added ${contractHistory.length} contract history records`);
            
            // 3. Fetch LC history linked to this contract
            const lcResult = await fabricService.queryChaincode('QueryLCsByContract', [contractId]);
            if (lcResult.success && lcResult.data && Array.isArray(lcResult.data)) {
              logger.info(`[AUDIT] Found ${lcResult.data.length} LCs for contract ${contractId}`);
              for (const lc of lcResult.data) {
                // Try multiple field name variations
                const lcId = lc.lcId || lc.LCID || lc.lcID || lc.LcId || lc.LCId;
                logger.info(`[AUDIT] Processing LC: ${JSON.stringify(Object.keys(lc)).substring(0, 200)}`);
                logger.info(`[AUDIT] LC ID extracted: ${lcId}`);
                
                if (lcId) {
                  const lcHistory = await getEntityHistoryViaService(fabricService, 'LC', lcId);
                  lcHistory.forEach(log => {
                    log.entityType = 'LC';
                    log.entityId = lcId;
                    log.workflowStage = '3. Letter of Credit';
                    log.source = 'RELATED_ENTITY';
                  });
                  allAuditLogs.push(...lcHistory);
                  logger.info(`[AUDIT] ✅ Added ${lcHistory.length} LC history records for ${lcId}`);
                } else {
                  logger.warn(`[AUDIT] ⚠️ Could not extract LC ID from LC object. Keys: ${Object.keys(lc).join(', ')}`);
                }
              }
            }
            
            // 4. Fetch Forex allocation history linked to this contract
            const forexResult = await fabricService.queryChaincode('QueryForexByContract', [contractId]);
            if (forexResult.success && forexResult.data && Array.isArray(forexResult.data)) {
              logger.info(`[AUDIT] Found ${forexResult.data.length} Forex allocations for contract ${contractId}`);
              for (const forex of forexResult.data) {
                const forexId = forex.forexId || forex.ForexID || forex.forexID || forex.ForexId;
                logger.info(`[AUDIT] Forex ID extracted: ${forexId}`);
                
                if (forexId) {
                  const forexHistory = await getEntityHistoryViaService(fabricService, 'FOREX', forexId);
                  forexHistory.forEach(log => {
                    log.entityType = 'FOREX';
                    log.entityId = forexId;
                    log.workflowStage = '4. Forex Allocation';
                    log.source = 'RELATED_ENTITY';
                  });
                  allAuditLogs.push(...forexHistory);
                  logger.info(`[AUDIT] ✅ Added ${forexHistory.length} forex history records for ${forexId}`);
                } else {
                  logger.warn(`[AUDIT] ⚠️ Could not extract Forex ID. Keys: ${Object.keys(forex).join(', ')}`);
                }
              }
            }
          }
          
          // 5. Fetch payment history for this contract (payments are linked to contracts, not shipments)
          if (contractId) {
            const paymentResult = await fabricService.queryChaincode('QueryPaymentsByContract', [contractId]);
            if (paymentResult.success && paymentResult.data && Array.isArray(paymentResult.data)) {
              logger.info(`[AUDIT] Found ${paymentResult.data.length} payments for contract ${contractId}`);
              for (const payment of paymentResult.data) {
                const paymentId = payment.paymentId || payment.PaymentID || payment.paymentID || payment.PaymentId;
                logger.info(`[AUDIT] Payment ID extracted: ${paymentId}`);
                
                if (paymentId) {
                  const paymentHistory = await getEntityHistoryViaService(fabricService, 'PAYMENT', paymentId);
                  paymentHistory.forEach(log => {
                    log.entityType = 'PAYMENT';
                    log.entityId = paymentId;
                    log.workflowStage = '6. Payment Settlement';
                    log.source = 'RELATED_ENTITY';
                  });
                  allAuditLogs.push(...paymentHistory);
                  logger.info(`[AUDIT] ✅ Added ${paymentHistory.length} payment history records for ${paymentId}`);
                } else {
                  logger.warn(`[AUDIT] ⚠️ Could not extract Payment ID. Keys: ${Object.keys(payment).join(', ')}`);
                }
              }
            }
          }
          
          // Re-sort all logs chronologically
          allAuditLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          // Deduplicate by transaction ID (multiple entities can share same TX in Fabric batch transactions)
          const seenTxIds = new Set<string>();
          const uniqueLogs = allAuditLogs.filter(log => {
            const txId = log.signature?.transactionId || log.logId;
            if (seenTxIds.has(txId)) {
              logger.debug(`[AUDIT] Skipping duplicate TX: ${txId}`);
              return false; // Skip duplicate
            }
            seenTxIds.add(txId);
            return true; // Keep unique
          });
          
          // Preserve each entity's on-ledger state-hash chain. Cross-entity timeline order is not a shared hash chain.
          allAuditLogs = uniqueLogs;
        }
      } catch (workflowErr) {
        logger.warn('[AUDIT] Could not fetch complete workflow history:', workflowErr);
      }
    }
    
    logger.info(`[AUDIT] Total audit logs: ${allAuditLogs.length} (${allAuditLogs.filter(l => l.source === 'BLOCKCHAIN_AUDIT_LOG').length} from blockchain audit logs, ${allAuditLogs.filter(l => l.blockHash === 'DATABASE_RECORD').length} from database)`);
    
    res.json({
      success: true,
      message: `Retrieved ${allAuditLogs.length} audit log(s) from complete lifecycle`,
      data: allAuditLogs,
      sources: {
        database: allAuditLogs.filter(l => l.source === 'POSTGRESQL_APPLICATION_RECORD').length,
        blockchainAuditLogs: allAuditLogs.filter(l => l.source === 'BLOCKCHAIN_AUDIT_LOG').length,
        total: allAuditLogs.length
      },
      entityType,
      entityId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch audit trail',
      entityType: req.params.entityType,
      entityId: req.params.entityId
    });
  }
});

/**
 * GET /audit/verify/:entityType/:entityId
 * Verify audit trail integrity with cryptographic validation
 */
router.get('/verify/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Verifying complete audit trail for ${entityType} ${entityId}`);
    
    // Verify the chaincode's stored audit hashes, then check each audit
    // transaction against QSCC and configured MSP certificate roots.
    let applicationMetadataCount = 0;
    if (entityType.toUpperCase() === 'EXPORTER') {
      try {
        const appResult = await dbService.query(
          'SELECT COUNT(*)::int AS count FROM exporter_applications WHERE exporter_id = $1',
          [entityId],
        );
        applicationMetadataCount = Number(appResult.rows[0]?.count || 0);
      } catch (dbError) {
        logger.warn('[AUDIT] Could not count exporter application metadata');
      }
    }
    
    const verification = await auditService.verifyBlockchainAuditChain(entityType, entityId);
    
    res.json({
      success: true,
      message: verification.message,
      data: verification,
      applicationMetadataCount,
      entityType,
      entityId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error verifying audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify audit trail',
      entityType: req.params.entityType,
      entityId: req.params.entityId
    });
  }
});

/**
 * GET /audit/compliance-report/:entityType/:entityId
 * Generate comprehensive compliance report with all business history
 */
router.get('/compliance-report/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Generating compliance report for ${entityType} ${entityId}`);
    
    // Fetch complete audit history (database + blockchain)
    const allAuditLogs: any[] = [];
    let applicationData: any = null;
    
    // Fetch database audit trail for exporters
    if (entityType.toUpperCase() === 'EXPORTER') {
      try {
        const applicationQuery = `
          SELECT 
            ea.*,
            approver.username as reviewed_by_username,
            approver.role as reviewed_by_role
          FROM exporter_applications ea
          LEFT JOIN users approver ON ea.reviewed_by = approver.username
          WHERE ea.exporter_id = $1
          ORDER BY ea.submitted_at ASC
        `;
        
        const appResult = await dbService.query(applicationQuery, [entityId]);
        
        if (appResult.rows.length > 0) {
          applicationData = appResult.rows[0];
          
          // Add application logs
          allAuditLogs.push({
            logId: `LOG-DB-APPLICATION-${applicationData.application_id}`,
            actionType: 'APPLICATION_SUBMITTED',
            createdAt: applicationData.submitted_at,
            complianceData: { ectaCompliance: false }
          });
          
          if (applicationData.approved_at || applicationData.rejected_at) {
            allAuditLogs.push({
              logId: `LOG-DB-REVIEW-${applicationData.application_id}`,
              actionType: applicationData.status === 'approved' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
              createdAt: applicationData.approved_at || applicationData.rejected_at,
              complianceData: { ectaCompliance: applicationData.status === 'approved' }
            });
          }
        }
      } catch (dbError) {
        logger.warn('[AUDIT] Could not fetch database audit trail');
      }
    }
    
    // Fetch blockchain history
    const blockchainLogs = await getEntityHistoryViaService(fabricService, entityType, entityId);
    allAuditLogs.push(...blockchainLogs);
    allAuditLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Get current state
    let currentState: any = {};
    try {
      const currentResponse = await fabricService.queryChaincode('Read', [`${entityType.toUpperCase()}_${entityId}`]);
      if (currentResponse.success && currentResponse.data) {
        currentState = currentResponse.data;
      }
    } catch (error) {
      logger.warn('[AUDIT] Could not fetch current state');
    }
    
    // Get related business data with comprehensive tracking
    const businessHistory: any = {
      // Core Export Business
      contracts: { 
        total: 0, 
        registered: 0,
        approved: 0, 
        active: 0, 
        completed: 0, 
        rejected: 0,
        totalValue: 0,
        averageValue: 0,
        details: [] 
      },
      shipments: { 
        total: 0, 
        inTransit: 0, 
        delivered: 0, 
        customs_cleared: 0,
        totalQuantity: 0,
        totalValue: 0,
        details: [] 
      },
      
      // Banking & Finance
      letterOfCredit: { 
        total: 0, 
        requested: 0,
        issued: 0, 
        utilized: 0,
        expired: 0, 
        totalAmount: 0,
        details: [] 
      },
      payments: { 
        total: 0, 
        pending: 0,
        completed: 0, 
        failed: 0,
        totalAmount: 0,
        totalFees: 0,
        details: [] 
      },
      forexAllocations: { 
        total: 0, 
        allocated: 0,
        utilized: 0, 
        totalAllocated: 0,
        totalUtilized: 0,
        details: [] 
      },
      advancePayments: {
        total: 0,
        approved: 0,
        disbursed: 0,
        totalAmount: 0,
        details: []
      },
      
      // Compliance & Quality
      qualityInspections: { 
        total: 0, 
        passed: 0,
        approved: 0, 
        rejected: 0,
        pending: 0,
        details: [] 
      },
      permits: { 
        total: 0, 
        active: 0,
        expired: 0,
        details: [] 
      },
      phytosanitary: { 
        total: 0, 
        active: 0,
        expired: 0,
        details: [] 
      },
      insurance: { 
        total: 0, 
        active: 0,
        totalCoverage: 0,
        details: [] 
      },
      
      // Customs & Logistics
      customs: { 
        total: 0, 
        declared: 0,
        cleared: 0,
        held: 0,
        totalDuty: 0,
        details: [] 
      },
      
      // ECX & Coffee Lots
      ecxLots: {
        total: 0,
        graded: 0,
        released: 0,
        totalWeight: 0,
        details: []
      },
      
      // Financial Transactions
      swiftMessages: {
        total: 0,
        sent: 0,
        received: 0,
        details: []
      },
      consignments: {
        total: 0,
        active: 0,
        settled: 0,
        totalAmount: 0,
        details: []
      },
      collections: {
        total: 0,
        presented: 0,
        accepted: 0,
        paid: 0,
        totalAmount: 0,
        details: []
      }
    };
    
    // If this is an exporter, fetch ALL related business data
    if (entityType.toUpperCase() === 'EXPORTER') {
      try {
        // 1. Fetch Contracts
        logger.info('[AUDIT] Fetching contracts for exporter');
        const contractsResponse = await fabricService.queryChaincode('QueryAllContracts', []);
        if (contractsResponse.success && contractsResponse.data) {
          const allContracts = contractsResponse.data;
          const contracts = allContracts.filter((c: any) => 
            c.exporterId === entityId || c.ExporterId === entityId
          );
          businessHistory.contracts.details = contracts;
          businessHistory.contracts.total = contracts.length;
          businessHistory.contracts.registered = contracts.filter((c: any) => c.contractStatus === 'REGISTERED' || c.Status === 'REGISTERED').length;
          businessHistory.contracts.approved = contracts.filter((c: any) => c.contractStatus === 'APPROVED' || c.Status === 'APPROVED').length;
          businessHistory.contracts.active = contracts.filter((c: any) => c.contractStatus === 'ACTIVE' || c.Status === 'ACTIVE').length;
          businessHistory.contracts.completed = contracts.filter((c: any) => c.contractStatus === 'COMPLETED' || c.Status === 'COMPLETED').length;
          businessHistory.contracts.rejected = contracts.filter((c: any) => c.contractStatus === 'REJECTED' || c.Status === 'REJECTED').length;
          businessHistory.contracts.totalValue = contracts.reduce((sum: number, c: any) => 
            sum + (parseFloat(c.totalValue || c.TotalValue || '0')), 0);
          businessHistory.contracts.averageValue = contracts.length > 0 ? businessHistory.contracts.totalValue / contracts.length : 0;
        }
        
        // 2. Fetch Shipments
        logger.info('[AUDIT] Fetching shipments for exporter');
        const shipmentsResponse = await fabricService.queryChaincode('QueryAllShipments', []);
        if (shipmentsResponse.success && shipmentsResponse.data) {
          const allShipments = shipmentsResponse.data;
          const shipments = allShipments.filter((s: any) => 
            s.exporterId === entityId || s.ExporterId === entityId
          );
          businessHistory.shipments.details = shipments;
          businessHistory.shipments.total = shipments.length;
          businessHistory.shipments.inTransit = shipments.filter((s: any) => s.status === 'IN_TRANSIT' || s.Status === 'IN_TRANSIT').length;
          businessHistory.shipments.delivered = shipments.filter((s: any) => s.status === 'DELIVERED' || s.Status === 'DELIVERED').length;
          businessHistory.shipments.customs_cleared = shipments.filter((s: any) => s.status === 'CUSTOMS_CLEARED' || s.Status === 'CUSTOMS_CLEARED').length;
          businessHistory.shipments.totalQuantity = shipments.reduce((sum: number, s: any) => 
            sum + (parseFloat(s.quantity || s.Quantity || '0')), 0);
          businessHistory.shipments.totalValue = shipments.reduce((sum: number, s: any) => 
            sum + (parseFloat(s.valueUsd || s.ValueUSD || '0')), 0);
        }
        
        // 3. Fetch Letters of Credit
        logger.info('[AUDIT] Fetching LCs for exporter');
        const lcsResponse = await fabricService.queryChaincode('QueryAllLCs', []);
        if (lcsResponse.success && lcsResponse.data) {
          const allLCs = lcsResponse.data;
          const lcs = allLCs.filter((lc: any) => 
            lc.exporterId === entityId || lc.ExporterId === entityId
          );
          businessHistory.letterOfCredit.details = lcs;
          businessHistory.letterOfCredit.total = lcs.length;
          businessHistory.letterOfCredit.requested = lcs.filter((lc: any) => lc.status === 'REQUESTED' || lc.Status === 'REQUESTED').length;
          businessHistory.letterOfCredit.issued = lcs.filter((lc: any) => lc.status === 'ISSUED' || lc.Status === 'ISSUED').length;
          businessHistory.letterOfCredit.utilized = lcs.filter((lc: any) => lc.status === 'UTILIZED' || lc.Status === 'UTILIZED').length;
          businessHistory.letterOfCredit.expired = lcs.filter((lc: any) => lc.status === 'EXPIRED' || lc.Status === 'EXPIRED').length;
          businessHistory.letterOfCredit.totalAmount = lcs.reduce((sum: number, lc: any) => 
            sum + (parseFloat(lc.amount || lc.Amount || '0')), 0);
        }
        
        // 4. Fetch Payments
        logger.info('[AUDIT] Fetching payments for exporter');
        const paymentsResponse = await fabricService.queryChaincode('QueryAllPayments', []);
        if (paymentsResponse.success && paymentsResponse.data) {
          const allPayments = paymentsResponse.data;
          const payments = allPayments.filter((p: any) => 
            p.exporterId === entityId || p.ExporterId === entityId
          );
          businessHistory.payments.details = payments;
          businessHistory.payments.total = payments.length;
          businessHistory.payments.pending = payments.filter((p: any) => p.status === 'PENDING' || p.Status === 'PENDING').length;
          businessHistory.payments.completed = payments.filter((p: any) => p.status === 'COMPLETED' || p.Status === 'COMPLETED').length;
          businessHistory.payments.failed = payments.filter((p: any) => p.status === 'FAILED' || p.Status === 'FAILED').length;
          businessHistory.payments.totalAmount = payments.reduce((sum: number, p: any) => 
            sum + (parseFloat(p.amount || p.Amount || '0')), 0);
          businessHistory.payments.totalFees = payments.reduce((sum: number, p: any) => 
            sum + (parseFloat(p.fees || p.Fees || '0')), 0);
        }
        
        // 5. Fetch Forex Allocations
        logger.info('[AUDIT] Fetching forex allocations for exporter');
        const forexResponse = await fabricService.queryChaincode('QueryAllForex', []);
        if (forexResponse.success && forexResponse.data) {
          const allForex = forexResponse.data;
          const forex = allForex.filter((f: any) => 
            f.exporterId === entityId || f.ExporterId === entityId
          );
          businessHistory.forexAllocations.details = forex;
          businessHistory.forexAllocations.total = forex.length;
          businessHistory.forexAllocations.allocated = forex.filter((f: any) => f.status === 'ALLOCATED' || f.Status === 'ALLOCATED').length;
          businessHistory.forexAllocations.utilized = forex.filter((f: any) => f.status === 'UTILIZED' || f.Status === 'UTILIZED').length;
          businessHistory.forexAllocations.totalAllocated = forex.reduce((sum: number, f: any) => 
            sum + (parseFloat(f.amountUSD || f.AmountUSD || '0')), 0);
          businessHistory.forexAllocations.totalUtilized = forex.reduce((sum: number, f: any) => 
            sum + (parseFloat(f.utilizedAmount || f.UtilizedAmount || '0')), 0);
        }
        
        // 6. Fetch Quality Inspections
        logger.info('[AUDIT] Fetching quality inspections for exporter');
        const inspectionsResponse = await fabricService.queryChaincode('QueryAllInspections', []);
        if (inspectionsResponse.success && inspectionsResponse.data) {
          const allInspections = inspectionsResponse.data;
          const inspections = allInspections.filter((i: any) => 
            i.exporterId === entityId || i.ExporterId === entityId
          );
          businessHistory.qualityInspections.details = inspections;
          businessHistory.qualityInspections.total = inspections.length;
          businessHistory.qualityInspections.passed = inspections.filter((i: any) => i.result === 'PASS' || i.Result === 'PASS').length;
          businessHistory.qualityInspections.approved = inspections.filter((i: any) => i.status === 'APPROVED' || i.Status === 'APPROVED').length;
          businessHistory.qualityInspections.rejected = inspections.filter((i: any) => i.result === 'FAIL' || i.Result === 'FAIL').length;
          businessHistory.qualityInspections.pending = inspections.filter((i: any) => i.status === 'PENDING' || i.Status === 'PENDING').length;
        }
        
        // 7. Fetch Export Permits
        logger.info('[AUDIT] Fetching permits for exporter');
        const permitsResponse = await fabricService.queryChaincode('QueryAllPermits', []);
        if (permitsResponse.success && permitsResponse.data) {
          const allPermits = permitsResponse.data;
          const permits = allPermits.filter((p: any) => 
            p.exporterId === entityId || p.ExporterId === entityId
          );
          businessHistory.permits.details = permits;
          businessHistory.permits.total = permits.length;
          businessHistory.permits.active = permits.filter((p: any) => p.status === 'ISSUED' || p.Status === 'ISSUED').length;
          businessHistory.permits.expired = permits.filter((p: any) => p.status === 'EXPIRED' || p.Status === 'EXPIRED').length;
        }
        
        // 8. Fetch Phytosanitary Certificates
        logger.info('[AUDIT] Fetching phytosanitary certificates for exporter');
        const phytoResponse = await fabricService.queryChaincode('QueryAllPhytosanitaryCertificates', []);
        if (phytoResponse.success && phytoResponse.data) {
          const allPhyto = phytoResponse.data;
          const phyto = allPhyto.filter((p: any) => 
            p.exporterId === entityId || p.ExporterId === entityId
          );
          businessHistory.phytosanitary.details = phyto;
          businessHistory.phytosanitary.total = phyto.length;
          businessHistory.phytosanitary.active = phyto.filter((p: any) => p.status === 'ISSUED' || p.Status === 'ISSUED').length;
          businessHistory.phytosanitary.expired = phyto.filter((p: any) => p.status === 'EXPIRED' || p.Status === 'EXPIRED').length;
        }
        
        // 9. Fetch Insurance Certificates
        logger.info('[AUDIT] Fetching insurance certificates for exporter');
        const insuranceResponse = await fabricService.queryChaincode('QueryAllInsuranceCertificates', []);
        if (insuranceResponse.success && insuranceResponse.data) {
          const allInsurance = insuranceResponse.data;
          const insurance = allInsurance.filter((i: any) => 
            i.exporterId === entityId || i.ExporterId === entityId
          );
          businessHistory.insurance.details = insurance;
          businessHistory.insurance.total = insurance.length;
          businessHistory.insurance.active = insurance.filter((i: any) => i.status === 'ACTIVE' || i.Status === 'ACTIVE').length;
          businessHistory.insurance.totalCoverage = insurance.reduce((sum: number, i: any) => 
            sum + (parseFloat(i.insuredAmount || i.InsuredAmount || '0')), 0);
        }
        
        // 10. Fetch Customs Declarations
        logger.info('[AUDIT] Fetching customs declarations for exporter');
        const customsResponse = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
        if (customsResponse.success && customsResponse.data) {
          const allCustoms = customsResponse.data;
          const customs = allCustoms.filter((c: any) => 
            c.exporterId === entityId || c.ExporterId === entityId
          );
          businessHistory.customs.details = customs;
          businessHistory.customs.total = customs.length;
          businessHistory.customs.declared = customs.filter((c: any) => c.status === 'DECLARED' || c.Status === 'DECLARED').length;
          businessHistory.customs.cleared = customs.filter((c: any) => c.status === 'CLEARED' || c.Status === 'CLEARED').length;
          businessHistory.customs.held = customs.filter((c: any) => c.status === 'HELD' || c.Status === 'HELD').length;
          businessHistory.customs.totalDuty = customs.reduce((sum: number, c: any) => 
            sum + (parseFloat(c.dutyAmount || c.DutyAmount || '0')), 0);
        }
        
        // 11. Fetch ECX Lots
        logger.info('[AUDIT] Fetching ECX lots for exporter');
        const ecxResponse = await fabricService.queryChaincode('QueryAllECXLots', []);
        if (ecxResponse.success && ecxResponse.data) {
          const allECX = ecxResponse.data;
          const ecxLots = allECX.filter((e: any) => 
            e.exporterId === entityId || e.ExporterId === entityId || e.sellerId === entityId || e.SellerId === entityId
          );
          businessHistory.ecxLots.details = ecxLots;
          businessHistory.ecxLots.total = ecxLots.length;
          businessHistory.ecxLots.graded = ecxLots.filter((e: any) => e.status === 'GRADED' || e.Status === 'GRADED').length;
          businessHistory.ecxLots.released = ecxLots.filter((e: any) => e.status === 'RELEASED' || e.Status === 'RELEASED').length;
          businessHistory.ecxLots.totalWeight = ecxLots.reduce((sum: number, e: any) => 
            sum + (parseFloat(e.quantity || e.Quantity || '0')), 0);
        }
        
        // 12. Fetch Advance Payments
        logger.info('[AUDIT] Fetching advance payments for exporter');
        const advanceResponse = await fabricService.queryChaincode('QueryAllAdvancePayments', []);
        if (advanceResponse.success && advanceResponse.data) {
          const allAdvance = advanceResponse.data;
          const advances = allAdvance.filter((a: any) => 
            a.exporterId === entityId || a.ExporterId === entityId
          );
          businessHistory.advancePayments.details = advances;
          businessHistory.advancePayments.total = advances.length;
          businessHistory.advancePayments.approved = advances.filter((a: any) => a.status === 'APPROVED' || a.Status === 'APPROVED').length;
          businessHistory.advancePayments.disbursed = advances.filter((a: any) => a.status === 'DISBURSED' || a.Status === 'DISBURSED').length;
          businessHistory.advancePayments.totalAmount = advances.reduce((sum: number, a: any) => 
            sum + (parseFloat(a.amount || a.Amount || '0')), 0);
        }
        
        // 13. Fetch SWIFT Messages
        logger.info('[AUDIT] Fetching SWIFT messages for exporter');
        const swiftResponse = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
        if (swiftResponse.success && swiftResponse.data) {
          const allSwift = swiftResponse.data;
          const swift = allSwift.filter((s: any) => 
            s.exporterId === entityId || s.ExporterId === entityId ||
            s.beneficiary === entityId || s.Beneficiary === entityId
          );
          businessHistory.swiftMessages.details = swift;
          businessHistory.swiftMessages.total = swift.length;
          businessHistory.swiftMessages.sent = swift.filter((s: any) => s.direction === 'OUTGOING' || s.Direction === 'OUTGOING').length;
          businessHistory.swiftMessages.received = swift.filter((s: any) => s.direction === 'INCOMING' || s.Direction === 'INCOMING').length;
        }
        
        // 14. Fetch Consignment Payments
        logger.info('[AUDIT] Fetching consignment payments for exporter');
        const consignResponse = await fabricService.queryChaincode('QueryAllConsignments', []);
        if (consignResponse.success && consignResponse.data) {
          const allConsign = consignResponse.data;
          const consignments = allConsign.filter((c: any) => 
            c.exporterId === entityId || c.ExporterId === entityId
          );
          businessHistory.consignments.details = consignments;
          businessHistory.consignments.total = consignments.length;
          businessHistory.consignments.active = consignments.filter((c: any) => c.status === 'ACTIVE' || c.Status === 'ACTIVE').length;
          businessHistory.consignments.settled = consignments.filter((c: any) => c.status === 'SETTLED' || c.Status === 'SETTLED').length;
          businessHistory.consignments.totalAmount = consignments.reduce((sum: number, c: any) => 
            sum + (parseFloat(c.amount || c.Amount || '0')), 0);
        }
        
        // 15. Fetch Documentary Collections
        logger.info('[AUDIT] Fetching documentary collections for exporter');
        const collectionResponse = await fabricService.queryChaincode('QueryAllCollections', []);
        if (collectionResponse.success && collectionResponse.data) {
          const allCollections = collectionResponse.data;
          const collections = allCollections.filter((c: any) => 
            c.exporterId === entityId || c.ExporterId === entityId
          );
          businessHistory.collections.details = collections;
          businessHistory.collections.total = collections.length;
          businessHistory.collections.presented = collections.filter((c: any) => c.status === 'PRESENTED' || c.Status === 'PRESENTED').length;
          businessHistory.collections.accepted = collections.filter((c: any) => c.status === 'ACCEPTED' || c.Status === 'ACCEPTED').length;
          businessHistory.collections.paid = collections.filter((c: any) => c.status === 'PAID' || c.Status === 'PAID').length;
          businessHistory.collections.totalAmount = collections.reduce((sum: number, c: any) => 
            sum + (parseFloat(c.amount || c.Amount || '0')), 0);
        }
        
        logger.info('[AUDIT] All business data fetched successfully');
      } catch (error) {
        logger.error('[AUDIT] Error fetching comprehensive business data:', error);
      }
    }
    
    // Calculate comprehensive summary statistics
    const summary = {
      // Financial Metrics
      totalExportValue: businessHistory.contracts.totalValue || 0,
      averageContractValue: businessHistory.contracts.averageValue || 0,
      totalShipmentValue: businessHistory.shipments.totalValue || 0,
      totalShipmentWeight: businessHistory.shipments.totalQuantity || 0,
      totalLCAmount: businessHistory.letterOfCredit.totalAmount || 0,
      totalPaymentAmount: businessHistory.payments.totalAmount || 0,
      totalPaymentFees: businessHistory.payments.totalFees || 0,
      totalForexAllocated: businessHistory.forexAllocations.totalAllocated || 0,
      totalForexUtilized: businessHistory.forexAllocations.totalUtilized || 0,
      totalAdvancePayments: businessHistory.advancePayments.totalAmount || 0,
      totalConsignments: businessHistory.consignments.totalAmount || 0,
      totalCollections: businessHistory.collections.totalAmount || 0,
      totalInsuranceCoverage: businessHistory.insurance.totalCoverage || 0,
      totalCustomsDuty: businessHistory.customs.totalDuty || 0,
      
      // Transaction Counts
      totalTransactions: allAuditLogs.length,
      totalContracts: businessHistory.contracts.total,
      totalShipments: businessHistory.shipments.total,
      totalLCs: businessHistory.letterOfCredit.total,
      totalPayments: businessHistory.payments.total,
      totalForexAllocations: businessHistory.forexAllocations.total,
      totalAdvances: businessHistory.advancePayments.total,
      totalConsignmentPayments: businessHistory.consignments.total,
      totalDocumentaryCollections: businessHistory.collections.total,
      
      // Compliance & Quality
      totalInspections: businessHistory.qualityInspections.total,
      passedInspections: businessHistory.qualityInspections.passed,
      rejectedInspections: businessHistory.qualityInspections.rejected,
      totalPermits: businessHistory.permits.total,
      activePermits: businessHistory.permits.active,
      totalPhytosanitary: businessHistory.phytosanitary.total,
      totalInsurance: businessHistory.insurance.total,
      
      // Customs & Logistics
      totalCustomsDeclarations: businessHistory.customs.total,
      clearedDeclarations: businessHistory.customs.cleared,
      heldDeclarations: businessHistory.customs.held,
      
      // ECX & Commodities
      totalECXLots: businessHistory.ecxLots.total,
      ecxTotalWeight: businessHistory.ecxLots.totalWeight,
      releasedLots: businessHistory.ecxLots.released,
      
      // Communications
      totalSWIFTMessages: businessHistory.swiftMessages.total,
      swiftSent: businessHistory.swiftMessages.sent,
      swiftReceived: businessHistory.swiftMessages.received,
      
      // Performance Ratios
      contractCompletionRate: businessHistory.contracts.total > 0 
        ? ((businessHistory.contracts.completed / businessHistory.contracts.total) * 100).toFixed(2) + '%'
        : '0%',
      contractApprovalRate: businessHistory.contracts.total > 0
        ? ((businessHistory.contracts.approved / businessHistory.contracts.total) * 100).toFixed(2) + '%'
        : '0%',
      inspectionPassRate: businessHistory.qualityInspections.total > 0
        ? ((businessHistory.qualityInspections.passed / businessHistory.qualityInspections.total) * 100).toFixed(2) + '%'
        : '0%',
      customsClearanceRate: businessHistory.customs.total > 0
        ? ((businessHistory.customs.cleared / businessHistory.customs.total) * 100).toFixed(2) + '%'
        : '0%',
      paymentSuccessRate: businessHistory.payments.total > 0
        ? ((businessHistory.payments.completed / businessHistory.payments.total) * 100).toFixed(2) + '%'
        : '0%',
      forexUtilizationRate: businessHistory.forexAllocations.totalAllocated > 0
        ? ((businessHistory.forexAllocations.totalUtilized / businessHistory.forexAllocations.totalAllocated) * 100).toFixed(2) + '%'
        : '0%',
      
      // Status Breakdown
      contractsByStatus: {
        registered: businessHistory.contracts.registered,
        approved: businessHistory.contracts.approved,
        active: businessHistory.contracts.active,
        completed: businessHistory.contracts.completed,
        rejected: businessHistory.contracts.rejected
      },
      shipmentsByStatus: {
        inTransit: businessHistory.shipments.inTransit,
        delivered: businessHistory.shipments.delivered,
        customsCleared: businessHistory.shipments.customs_cleared
      },
      lcsByStatus: {
        requested: businessHistory.letterOfCredit.requested,
        issued: businessHistory.letterOfCredit.issued,
        utilized: businessHistory.letterOfCredit.utilized,
        expired: businessHistory.letterOfCredit.expired
      },
      paymentsByStatus: {
        pending: businessHistory.payments.pending,
        completed: businessHistory.payments.completed,
        failed: businessHistory.payments.failed
      }
    };
    
    // Audit trail summary with database + blockchain
    const auditTrail = {
      totalActions: allAuditLogs.length,
      databaseActions: allAuditLogs.filter(l => l.actionType?.includes('APPLICATION')).length,
      blockchainActions: blockchainLogs.length,
      complianceSummary: {
        ectaCompliance: allAuditLogs.filter(l => l.complianceData?.ectaCompliance).length,
        nbeCompliance: allAuditLogs.filter(l => l.complianceData?.nbeCompliance).length,
        ucp600Compliance: allAuditLogs.filter(l => l.complianceData?.ucp600Check).length,
        eudrCompliance: allAuditLogs.filter(l => l.complianceData?.eudrCompliance).length,
        icoCompliance: allAuditLogs.filter(l => l.complianceData?.icoCompliance).length
      },
      actionsByType: allAuditLogs.reduce((acc: any, log: any) => {
        acc[log.actionType] = (acc[log.actionType] || 0) + 1;
        return acc;
      }, {}),
      actorSummary: allAuditLogs.reduce((acc: any, log: any) => {
        const actor = log.signature?.caller?.commonName || log.signature?.caller?.username || 'Unknown';
        acc[actor] = (acc[actor] || 0) + 1;
        return acc;
      }, {}),
      detailedLogs: allAuditLogs
    };
    
    const report = {
      reportGeneratedAt: new Date().toISOString(),
      entityType,
      entityId,
      currentState,
      applicationPhase: applicationData ? {
        applicationId: applicationData.application_id,
        submittedBy: applicationData.company_name,
        submittedAt: applicationData.submitted_at,
        reviewedBy: applicationData.reviewed_by_username || applicationData.reviewed_by || 'ECTA Admin',
        reviewedAt: applicationData.approved_at || applicationData.rejected_at,
        status: applicationData.status,
        rejectionReason: applicationData.rejection_reason,
        ectaLicenseNumber: applicationData.ecta_license_number,
        licenseExpiryDate: applicationData.license_expiry_date
      } : null,
      summary,
      auditTrail,
      businessHistory
    };
    
    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate compliance report',
      entityType: req.params.entityType,
      entityId: req.params.entityId
    });
  }
});

export default router;


/**
 * GET /audit/blockchain/:entityType/:entityId
 * Get TRUE blockchain audit trail directly from Hyperledger Fabric
 * Returns the complete immutable audit chain with cryptographic signatures
 */
router.get('/blockchain/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Fetching TRUE blockchain audit trail for ${entityType} ${entityId}`);
    
    const logs = await auditService.getBlockchainAuditLogs({
      entityType,
      entityId
    });
    
    // Get chain verification
    const verification = await auditService.verifyBlockchainAuditChain(entityType, entityId);
    
    res.json({
      success: true,
      data: {
        logs,
        verification,
        source: 'HYPERLEDGER_FABRIC',
        totalLogs: logs.length,
        chainIntegrity: {
          verified: verification.verified,
          message: verification.message,
          brokenLinks: verification.brokenLinks.length,
          immutable: true,
          cryptographicallyVerified: verification.verified
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching blockchain audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch blockchain audit trail',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /audit/verify-chain/:entityType/:entityId
 * Verify the complete blockchain audit chain for an entity
 * Checks cryptographic linking: previousStateHash → newStateHash
 */
router.post('/verify-chain/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Verifying blockchain audit chain for ${entityType} ${entityId}`);
    
    const verification = await auditService.verifyBlockchainAuditChain(entityType, entityId);
    
    res.json({
      success: true,
      data: verification,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error verifying blockchain audit chain:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify blockchain audit chain',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /audit/verify/:logId
 * Verify a specific audit log entry against blockchain
 */
router.post('/verify/:logId', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    // Only admins and ECTA officers can verify logs
    if (user.role !== 'ADMIN' && !user.role?.includes('ECTA')) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators and ECTA officers can verify audit logs',
        timestamp: new Date().toISOString()
      });
    }
    
    const logId = parseInt(req.params.logId);
    
    logger.info(`[AUDIT] Verifying log ${logId} against blockchain`);
    
    const verification = await auditService.verifyAgainstBlockchain(logId);
    
    res.json({
      success: true,
      data: verification,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error verifying log:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify log against blockchain',
      timestamp: new Date().toISOString()
    });
  }
});


/**
 * GET /audit/trail/:entityType/:entityId
 * Get audit trail for a specific entity (database + blockchain combined)
 */
router.get('/trail/:entityType/:entityId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    logger.info(`[AUDIT] Fetching audit trail for ${entityType} ${entityId}`);
    
    // Get database audit logs
    const dbLogs = await auditService.getEntityLogs(entityType, entityId);
    
    // Try to get blockchain logs too
    let blockchainLogs: any[] = [];
    try {
      const bcResult = await auditService.getBlockchainAuditLogs({
        entityType,
        entityId
      });
      blockchainLogs = bcResult || [];
    } catch (bcErr) {
      logger.warn(`[AUDIT] Could not fetch blockchain logs: ${bcErr}`);
    }
    
    // Combine and sort by timestamp
    const allLogs = [...dbLogs, ...blockchainLogs].sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp || a.created_at).getTime();
      const timeB = new Date(b.timestamp || b.created_at).getTime();
      return timeB - timeA; // Most recent first
    });
    
    res.json({
      success: true,
      data: allLogs,
      metadata: {
        totalLogs: allLogs.length,
        databaseLogs: dbLogs.length,
        blockchainLogs: blockchainLogs.length,
        entityType,
        entityId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[AUDIT] Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch audit trail',
      timestamp: new Date().toISOString()
    });
  }
});
