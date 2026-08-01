// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Document Validation Utilities

import { logger } from './logger';

/**
 * Document types with their requirements
 */
export const DOCUMENT_TYPES = {
  // Contract Documents
  CONTRACT_SIGNED: {
    category: 'CONTRACT',
    name: 'Signed Sales Contract',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 10,
    required: true,
  },
  PROFORMA_INVOICE: {
    category: 'CONTRACT',
    name: 'Proforma Invoice',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },
  BUYER_CONFIRMATION: {
    category: 'CONTRACT',
    name: 'Buyer Purchase Order',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },

  // Exporter Documents
  BUSINESS_LICENSE: {
    category: 'EXPORTER',
    name: 'Ethiopian Business License',
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: true,
  },
  TIN_CERTIFICATE: {
    category: 'EXPORTER',
    name: 'Tax Identification Number Certificate',
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: true,
  },
  ECTA_LICENSE: {
    category: 'EXPORTER',
    name: 'ECTA Exporter License',
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: true,
  },
  BANK_STATEMENT: {
    category: 'EXPORTER',
    name: 'Bank Account Verification',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  TASTER_CERTIFICATE: {
    category: 'EXPORTER',
    name: 'Professional Taster Certification',
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: true,
  },
  LAB_CERTIFICATE: {
    category: 'EXPORTER',
    name: 'Laboratory Facility Certification',
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: false,
  },

  // Quality Documents
  QUALITY_CERTIFICATE: {
    category: 'QUALITY',
    name: 'ECTA/ECX Quality Certificate',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  CUPPING_REPORT: {
    category: 'QUALITY',
    name: 'Detailed Cupping Scores',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  LAB_TEST_RESULTS: {
    category: 'QUALITY',
    name: 'Laboratory Test Results',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },
  SAMPLE_IMAGES: {
    category: 'QUALITY',
    name: 'Coffee Sample Photos',
    allowedFormats: ['image/jpeg', 'image/png'],
    maxSizeMB: 5,
    required: false,
  },

  // Export Documents
  EXPORT_PERMIT: {
    category: 'EXPORT',
    name: 'ECTA Export Permit',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  PHYTOSANITARY_CERTIFICATE: {
    category: 'EXPORT',
    name: 'Plant Health Certificate',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  CERTIFICATE_OF_ORIGIN: {
    category: 'EXPORT',
    name: 'Form A Certificate of Origin',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  FUMIGATION_CERTIFICATE: {
    category: 'EXPORT',
    name: 'Fumigation Treatment Certificate',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },

  // Shipping Documents
  BILL_OF_LADING: {
    category: 'SHIPPING',
    name: 'Bill of Lading (Clean On-Board)',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  COMMERCIAL_INVOICE: {
    category: 'SHIPPING',
    name: 'Commercial Invoice',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  PACKING_LIST: {
    category: 'SHIPPING',
    name: 'Packing List',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: true,
  },
  INSURANCE_CERTIFICATE: {
    category: 'SHIPPING',
    name: 'Insurance Certificate',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false, // Required for CIF/CIP, optional for FOB
  },

  // Payment Documents
  SWIFT_MT700: {
    category: 'PAYMENT',
    name: 'SWIFT MT700 (LC Issuance)',
    allowedFormats: ['application/pdf', 'text/plain'],
    maxSizeMB: 2,
    required: false,
  },
  SWIFT_MT103: {
    category: 'PAYMENT',
    name: 'SWIFT MT103 (Payment)',
    allowedFormats: ['application/pdf', 'text/plain'],
    maxSizeMB: 2,
    required: false,
  },
  BANK_STATEMENT_PAYMENT: {
    category: 'PAYMENT',
    name: 'Bank Payment Statement',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },
  SETTLEMENT_PROOF: {
    category: 'PAYMENT',
    name: 'Payment Settlement Proof',
    allowedFormats: ['application/pdf'],
    maxSizeMB: 5,
    required: false,
  },
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

/**
 * Validation result interface
 */
export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate document type
 */
export function validateDocumentType(documentType: string): boolean {
  return documentType in DOCUMENT_TYPES;
}

/**
 * Validate document file
 */
export function validateDocument(
  documentType: string,
  mimeType: string,
  fileSizeBytes: number
): DocumentValidationResult {
  const result: DocumentValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if document type is valid
  if (!validateDocumentType(documentType)) {
    result.valid = false;
    result.errors.push(`Invalid document type: ${documentType}`);
    return result;
  }

  const docConfig = DOCUMENT_TYPES[documentType as DocumentType];

  // Check mime type
  if (!(docConfig.allowedFormats as readonly string[]).includes(mimeType)) {
    result.valid = false;
    result.errors.push(
      `Invalid file format for ${docConfig.name}. Allowed: ${docConfig.allowedFormats.join(', ')}, got: ${mimeType}`
    );
  }

  // Check file size
  const maxSizeBytes = docConfig.maxSizeMB * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    result.valid = false;
    result.errors.push(
      `File size exceeds maximum allowed (${docConfig.maxSizeMB}MB). File size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Check for very small files (potential corruption)
  if (fileSizeBytes < 100) {
    result.warnings.push('File size is suspiciously small. Please verify the file is not corrupted.');
  }

  logger.info('Document validation completed', {
    documentType,
    mimeType,
    fileSizeBytes,
    valid: result.valid,
    errors: result.errors.length,
    warnings: result.warnings.length,
  });

  return result;
}

/**
 * Get document requirements for entity type
 */
export function getDocumentRequirements(entityType: string): DocumentType[] {
  const requirements: Record<string, DocumentType[]> = {
    contract: ['CONTRACT_SIGNED', 'PROFORMA_INVOICE'],
    exporter: [
      'BUSINESS_LICENSE',
      'TIN_CERTIFICATE',
      'ECTA_LICENSE',
      'BANK_STATEMENT',
      'TASTER_CERTIFICATE',
    ],
    shipment: [
      'QUALITY_CERTIFICATE',
      'CUPPING_REPORT',
      'EXPORT_PERMIT',
      'PHYTOSANITARY_CERTIFICATE',
      'CERTIFICATE_OF_ORIGIN',
    ],
    customs: [
      'EXPORT_PERMIT',
      'PHYTOSANITARY_CERTIFICATE',
      'CERTIFICATE_OF_ORIGIN',
      'COMMERCIAL_INVOICE',
      'PACKING_LIST',
    ],
    shipping: ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST'],
    payment: ['SWIFT_MT700', 'SWIFT_MT103'],
  };

  return requirements[entityType.toLowerCase()] || [];
}

/**
 * Check if all required documents are present
 */
export function checkRequiredDocuments(
  entityType: string,
  providedDocumentTypes: string[]
): DocumentValidationResult {
  const result: DocumentValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const requiredDocs = getDocumentRequirements(entityType);
  const missingDocs: string[] = [];

  for (const docType of requiredDocs) {
    const config = DOCUMENT_TYPES[docType];
    if (config.required && !providedDocumentTypes.includes(docType)) {
      missingDocs.push(config.name);
    }
  }

  if (missingDocs.length > 0) {
    result.valid = false;
    result.errors.push(`Missing required documents: ${missingDocs.join(', ')}`);
  }

  return result;
}

/**
 * Validate file extension matches mime type
 */
export function validateFileExtension(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeToExt: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'text/plain': ['txt'],
  };

  const allowedExts = mimeToExt[mimeType] || [];
  return allowedExts.includes(ext);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_.-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .substring(0, 255); // Limit length
}
