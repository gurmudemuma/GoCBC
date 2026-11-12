/**
 * Audit Trail Helper Service
 * 
 * CRITICAL: The audit_trail table has JSONB columns (old_value, new_value, metadata).
 * NEVER insert plain strings - always use JSON objects.
 * 
 * This helper ensures type-safe audit trail logging with proper JSONB formatting.
 */

import { DatabaseService } from './databaseService';
import logger from '../utils/logger';

/**
 * Audit trail entry types
 */
export type AuditEntityType = 
  | 'CONTRACT'
  | 'DOCUMENT'
  | 'EXPORTER'
  | 'SHIPMENT'
  | 'LC'
  | 'CUSTOMS_DECLARATION'
  | 'CERTIFICATE'
  | 'FOREX'
  | 'REPATRIATION'
  | 'USER'
  | 'ROLE';

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'SIGN'
  | 'VERIFY'
  | 'SUBMIT'
  | 'RELEASE'
  | 'CLEAR'
  | string; // Allow custom actions

/**
 * JSONB value wrapper - ensures values are always JSON objects
 */
export interface AuditValueWrapper {
  [key: string]: any;
}

/**
 * Audit trail entry parameters
 */
export interface AuditTrailEntry {
  entityType: AuditEntityType | string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  performedByOrg: string;
  oldValue?: AuditValueWrapper | null; // MUST be object, not plain string
  newValue?: AuditValueWrapper | null; // MUST be object, not plain string
  reason?: string | null;
  metadata?: AuditValueWrapper | null; // MUST be object, not plain string
  ipAddress?: string | null;
  organization?: string | null;
}

/**
 * Helper to ensure value is a valid JSON object/array (or SQL NULL).
 *
 * Migration 065's validate_audit_trail_jsonb() trigger rejects anything
 * that is not NULL or a JSON object/array. Two cases used to slip
 * through and lose the row:
 *  - absent values returned JSON.stringify(null) === 'null', a JSON null
 *    scalar (jsonb_typeof 'null'), not SQL NULL — now returns null;
 *  - strings that parse to a JSON scalar ('"REQUESTED"', '123', 'true')
 *    were re-stringified as the same scalar — now wrapped as { value }.
 */
function ensureJsonObject(value: any, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // If it's already a string, try to parse it to validate
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed !== null && typeof parsed === 'object') {
        return JSON.stringify(parsed);
      }
      // JSON scalar ("REQUESTED", 123, true, null) — wrap it; a bare
      // scalar is rejected by the audit_trail trigger.
      logger.warn(`[AUDIT_TRAIL_HELPER] ${fieldName} was a JSON scalar. Wrapping in JSON object.`);
      return JSON.stringify({ value: parsed });
    } catch (e) {
      // Plain string - wrap it in an object
      logger.warn(`[AUDIT_TRAIL_HELPER] ${fieldName} was plain string "${value}". Wrapping in JSON object.`);
      return JSON.stringify({ value });
    }
  }

  // If it's an object, stringify it
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      logger.error(`[AUDIT_TRAIL_HELPER] Failed to stringify ${fieldName}:`, e);
      return JSON.stringify({ error: 'Failed to serialize value' });
    }
  }

  // Primitive type (number, boolean) - wrap in object
  return JSON.stringify({ value });
}

/**
 * Log an audit trail entry with proper JSONB formatting
 * 
 * @param entry - Audit trail entry parameters
 * @param db - Optional database instance (uses singleton if not provided)
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await logAuditTrail({
 *   entityType: 'DOCUMENT',
 *   entityId: 'DOC-123',
 *   action: 'SIGN',
 *   performedBy: 'user@example.com',
 *   performedByOrg: 'ECTA',
 *   oldValue: { status: 'unsigned' },  // ✓ Correct - object
 *   newValue: { status: 'signed' },    // ✓ Correct - object
 *   metadata: { signatureType: 'APPROVE' },
 *   ipAddress: '192.168.1.1'
 * });
 * ```
 * 
 * @example WRONG USAGE
 * ```typescript
 * // ✗ WRONG - will be auto-corrected but generates warning
 * await logAuditTrail({
 *   oldValue: 'unsigned',  // ✗ Plain string
 *   newValue: 'signed'     // ✗ Plain string
 * });
 * ```
 */
export async function logAuditTrail(
  entry: AuditTrailEntry,
  db?: DatabaseService
): Promise<void> {
  const dbInstance = db || DatabaseService.getInstance();

  // Ensure JSONB fields are proper JSON objects
  const oldValueJson = ensureJsonObject(entry.oldValue, 'oldValue');
  const newValueJson = ensureJsonObject(entry.newValue, 'newValue');
  const metadataJson = ensureJsonObject(entry.metadata, 'metadata');

  try {
    await dbInstance.run(
      `INSERT INTO audit_trail (
        entity_type, entity_id, action, performed_by, organization, performed_by_org,
        old_value, new_value, reason, metadata, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.performedBy,
        entry.organization || entry.performedByOrg,
        entry.performedByOrg,
        oldValueJson,
        newValueJson,
        entry.reason || null,
        metadataJson,
        entry.ipAddress || 'unknown'
      ]
    );

    logger.debug(`[AUDIT_TRAIL] Logged: ${entry.entityType}/${entry.entityId} - ${entry.action}`);
  } catch (error) {
    logger.error(`[AUDIT_TRAIL] Failed to log audit entry:`, error);
    logger.error(`[AUDIT_TRAIL] Entry details:`, {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: oldValueJson,
      newValue: newValueJson
    });
    throw error;
  }
}

/**
 * Helper function for document signing audit
 */
export async function logDocumentSignature(params: {
  documentId: string;
  signatureType: string;
  signer: string;
  organization: string;
  visualSignatureAdded?: boolean;
  remarks?: string | null;
  ipAddress?: string;
  db?: DatabaseService;
}): Promise<void> {
  await logAuditTrail({
    entityType: 'DOCUMENT',
    entityId: params.documentId,
    action: `SIGNATURE_${params.signatureType}`,
    performedBy: params.signer,
    performedByOrg: params.organization,
    oldValue: { status: 'unsigned' },
    newValue: { status: 'signed', signatureType: params.signatureType },
    reason: `Document signed with ${params.signatureType} signature`,
    metadata: {
      signatureType: params.signatureType,
      signer: params.signer,
      organization: params.organization,
      visualSignatureAdded: params.visualSignatureAdded || false,
      remarks: params.remarks || null,
      timestamp: new Date().toISOString()
    },
    ipAddress: params.ipAddress
  }, params.db);
}

/**
 * Helper function for contract approval audit
 */
export async function logContractApproval(params: {
  contractId: string;
  approvedBy: string;
  organization: string;
  currentStatus: string;
  transactionId?: string;
  ipAddress?: string;
  db?: DatabaseService;
}): Promise<void> {
  await logAuditTrail({
    entityType: 'CONTRACT',
    entityId: params.contractId,
    action: 'APPROVE',
    performedBy: params.approvedBy,
    performedByOrg: params.organization,
    oldValue: { status: params.currentStatus },
    newValue: { status: 'APPROVED' },
    reason: 'Contract approved for export compliance',
    metadata: {
      contractId: params.contractId,
      approvedBy: params.approvedBy,
      organization: params.organization,
      transactionId: params.transactionId,
      action: 'Export Compliance Approval',
      timestamp: new Date().toISOString()
    },
    ipAddress: params.ipAddress
  }, params.db);
}

/**
 * Helper function for contract rejection audit
 */
export async function logContractRejection(params: {
  contractId: string;
  rejectedBy: string;
  organization: string;
  currentStatus: string;
  rejectionReason: string;
  transactionId?: string;
  ipAddress?: string;
  db?: DatabaseService;
}): Promise<void> {
  await logAuditTrail({
    entityType: 'CONTRACT',
    entityId: params.contractId,
    action: 'REJECT',
    performedBy: params.rejectedBy,
    performedByOrg: params.organization,
    oldValue: { status: params.currentStatus },
    newValue: { status: 'REJECTED' },
    reason: params.rejectionReason,
    metadata: {
      contractId: params.contractId,
      rejectedBy: params.rejectedBy,
      organization: params.organization,
      transactionId: params.transactionId,
      rejectionReason: params.rejectionReason,
      action: 'Contract Rejection - Compliance Issues',
      timestamp: new Date().toISOString()
    },
    ipAddress: params.ipAddress
  }, params.db);
}

/**
 * Helper function for document view audit
 */
export async function logDocumentView(params: {
  documentId: string;
  fileName: string;
  viewer: string;
  organization: string;
  inline?: boolean;
  entityType?: string;
  entityId?: string;
  documentType?: string;
  ipAddress?: string;
  db?: DatabaseService;
}): Promise<void> {
  await logAuditTrail({
    entityType: 'DOCUMENT',
    entityId: params.documentId,
    action: 'VIEW',
    performedBy: params.viewer,
    performedByOrg: params.organization,
    oldValue: { status: 'N/A' },
    newValue: { status: 'VIEWED' },
    reason: `Document ${params.inline ? 'viewed' : 'downloaded'}: ${params.fileName}`,
    metadata: {
      documentId: params.documentId,
      fileName: params.fileName,
      entityType: params.entityType,
      entityId: params.entityId,
      documentType: params.documentType,
      inline: params.inline || false,
      viewedBy: params.viewer,
      organization: params.organization,
      timestamp: new Date().toISOString()
    },
    ipAddress: params.ipAddress
  }, params.db);
}

export default {
  logAuditTrail,
  logDocumentSignature,
  logContractApproval,
  logContractRejection,
  logDocumentView
};
