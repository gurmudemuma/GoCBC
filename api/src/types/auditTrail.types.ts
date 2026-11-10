/**
 * Audit Trail Type Definitions
 * 
 * CRITICAL: audit_trail table columns old_value, new_value, and metadata are JSONB type.
 * TypeScript types enforce this at compile time.
 */

/**
 * Base JSONB value type - ensures values are objects, not plain strings
 * 
 * ✓ CORRECT: { status: 'unsigned' }
 * ✗ WRONG:   'unsigned'
 */
export type AuditJsonbValue = Record<string, any> | null;

/**
 * Audit trail database schema
 */
export interface AuditTrailRecord {
  id?: number;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id?: number | null;
  performed_by?: string | null;
  organization?: string | null;
  performed_by_org?: string | null;
  old_value: AuditJsonbValue;      // ⚠️ MUST be JSON object, not string
  new_value: AuditJsonbValue;      // ⚠️ MUST be JSON object, not string
  reason?: string | null;
  metadata?: AuditJsonbValue;      // ⚠️ MUST be JSON object, not string
  ip_address?: string | null;
  timestamp?: Date;
  created_at?: Date;
}

/**
 * Common audit value types
 */
export interface AuditStatusValue {
  status: string;
  [key: string]: any;
}

export interface AuditFileValue {
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  [key: string]: any;
}

export interface AuditUserValue {
  username?: string;
  email?: string;
  role?: string;
  organization?: string;
  [key: string]: any;
}

/**
 * Entity types supported in audit trail
 */
export enum AuditEntityType {
  CONTRACT = 'CONTRACT',
  DOCUMENT = 'DOCUMENT',
  EXPORTER = 'EXPORTER',
  IMPORTER = 'IMPORTER',
  SHIPMENT = 'SHIPMENT',
  LC = 'LC',
  CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
  CERTIFICATE = 'CERTIFICATE',
  COO = 'COO',
  PHYTOSANITARY = 'PHYTOSANITARY',
  FOREX = 'FOREX',
  REPATRIATION = 'REPATRIATION',
  USER = 'USER',
  ROLE = 'ROLE',
  BANK = 'BANK',
  PAYMENT = 'PAYMENT'
}

/**
 * Common audit actions
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  REVIEW = 'REVIEW',
  SIGN = 'SIGN',
  SIGNATURE_APPROVE = 'SIGNATURE_APPROVE',
  SIGNATURE_REJECT = 'SIGNATURE_REJECT',
  SIGNATURE_ACKNOWLEDGE = 'SIGNATURE_ACKNOWLEDGE',
  VERIFY = 'VERIFY',
  VERIFY_SIGNATURE = 'VERIFY_SIGNATURE',
  RELEASE = 'RELEASE',
  CLEAR = 'CLEAR',
  ALLOCATE = 'ALLOCATE',
  CONFIRM = 'CONFIRM',
  INITIATE = 'INITIATE',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
  ADD_CERTIFICATE_PAGE = 'ADD_CERTIFICATE_PAGE'
}

/**
 * Type guard to ensure value is valid JSONB
 */
export function isValidAuditJsonbValue(value: any): value is AuditJsonbValue {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  return true;
}

/**
 * Helper to convert any value to valid JSONB format
 */
export function toAuditJsonbValue(value: any): AuditJsonbValue {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'object') {
    return value;
  }
  
  // Wrap primitives and strings in object
  return { value };
}

/**
 * Metadata types for specific audit actions
 */
export interface DocumentSignatureMetadata {
  signatureId?: string;
  signatureType: string;
  signer: string;
  organization: string;
  visualSignatureAdded?: boolean;
  remarks?: string | null;
  timestamp: string;
  transactionId?: string;
  blockNumber?: number;
  blockHash?: string;
}

export interface DocumentViewMetadata {
  documentId: string;
  fileName: string;
  entityType?: string;
  entityId?: string;
  documentType?: string;
  fileSize?: number;
  mimeType?: string;
  inline?: boolean;
  viewedBy: string;
  role?: string;
  organization: string;
  timestamp: string;
}

export interface ContractApprovalMetadata {
  contractId: string;
  approvedBy: string;
  role?: string;
  organization: string;
  transactionId?: string;
  action: string;
  timestamp: string;
}

export interface ContractRejectionMetadata {
  contractId: string;
  rejectedBy: string;
  role?: string;
  organization: string;
  transactionId?: string;
  rejectionReason: string;
  action: string;
  timestamp: string;
}

export interface SignatureVerificationMetadata {
  documentId: string;
  verificationStatus: string;
  signatureCount: number;
  cryptoSignatureCount: number;
  isTampered: boolean;
  verifiedBy: string;
  timestamp: string;
}

export interface CertificatePageMetadata {
  documentId: string;
  signatureCount: number;
  addedBy: string;
  derivedFileName: string;
  derivedFileHash: string;
  timestamp: string;
}

/**
 * Query parameters for retrieving audit trail
 */
export interface AuditTrailQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  organization?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit trail response
 */
export interface AuditTrailResponse {
  success: boolean;
  data?: AuditTrailRecord[];
  total?: number;
  error?: string;
}

/**
 * COMPILE-TIME VALIDATION EXAMPLES
 * 
 * These examples will cause TypeScript compilation errors if you try to use them:
 * 
 * ✗ WRONG - will not compile:
 * const record: AuditTrailRecord = {
 *   entity_type: 'DOCUMENT',
 *   entity_id: 'DOC-123',
 *   action: 'SIGN',
 *   old_value: 'unsigned',  // ✗ Type 'string' is not assignable to type 'AuditJsonbValue'
 *   new_value: 'signed'     // ✗ Type 'string' is not assignable to type 'AuditJsonbValue'
 * };
 * 
 * ✓ CORRECT - compiles successfully:
 * const record: AuditTrailRecord = {
 *   entity_type: 'DOCUMENT',
 *   entity_id: 'DOC-123',
 *   action: 'SIGN',
 *   old_value: { status: 'unsigned' },  // ✓ Object type
 *   new_value: { status: 'signed' }     // ✓ Object type
 * };
 */
