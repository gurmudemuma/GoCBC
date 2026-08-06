// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Document Management API Routes

import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import DocumentStorageService from '../services/documentStorageService';
import { logger } from '../utils/logger';
import {
  validateDocument,
  validateDocumentType,
  getDocumentRequirements,
  checkRequiredDocuments,
  sanitizeFilename,
  validateFileExtension,
  DOCUMENT_TYPES,
  DocumentType,
} from '../utils/documentValidation';

const router = express.Router();
const db = DatabaseService.getInstance();
const storage = DocumentStorageService.getInstance();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, TXT`));
    }
  },
});

/**
 * @swagger
 * /api/v1/documents/types:
 *   get:
 *     summary: Get all available document types
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: List of document types
 */
router.get('/types', authMiddleware, async (req: Request, res: Response) => {
  try {
    const documentTypes = Object.entries(DOCUMENT_TYPES).map(([key, value]) => ({
      type: key,
      name: value.name,
      category: value.category,
      allowedFormats: value.allowedFormats,
      maxSizeMB: value.maxSizeMB,
      required: value.required,
    }));

    res.json({
      success: true,
      data: documentTypes,
      count: documentTypes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching document types:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/upload-registration:
 *   post:
 *     summary: Upload a document for exporter registration (PUBLIC - no auth required)
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 description: Type of document (TIN_CERTIFICATE, BUSINESS_LICENSE, etc.)
 *               description:
 *                 type: string
 *                 description: Optional description of the document
 *               encrypt:
 *                 type: boolean
 *                 description: Whether to encrypt the document
 */
router.post(
  '/upload-registration',
  // NO authMiddleware - this is a public endpoint for registration
  (req: Request, res: Response, next: any) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds 10MB limit',
            },
            timestamp: new Date().toISOString(),
          });
        }
        if (err.message && err.message.includes('Unexpected field')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FIELD_NAME',
              message: `Wrong form field name. Expected 'file'. Please ensure the file input has name="file"`,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed',
          },
          timestamp: new Date().toISOString(),
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const { documentType, description, encrypt = 'true' } = req.body;
      const file = req.file;

      // Validate required fields
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!documentType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'documentType is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate document type
      if (!validateDocumentType(documentType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_TYPE',
            message: `Invalid document type: ${documentType}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate file
      const validationResult = validateDocument(
        documentType,
        file.mimetype,
        file.size
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Document validation failed',
            errors: validationResult.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate file extension
      if (!validateFileExtension(file.originalname, file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_EXTENSION',
            message: 'File extension does not match mime type',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Upload to storage service FIRST (it generates the document ID)
      const shouldEncrypt = encrypt === 'true' || encrypt === true;
      const metadata = await storage.uploadDocument(
        file.buffer,
        sanitizeFilename(file.originalname),
        file.mimetype,
        documentType,
        'REGISTRATION_SYSTEM', // System user for public uploads
        shouldEncrypt
      );

      // Use the document ID generated by storage service
      const documentId = metadata.documentId;

      // Calculate hash for blockchain
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Store in database with temporary entity (will be linked to application later)
      await db.run(
        `INSERT INTO documents (
          document_id, document_type, entity_type, entity_id,
          file_name, file_size, mime_type, file_hash,
          ipfs_cid, uploaded_by, encrypted, description,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          documentId,
          documentType,
          'EXPORTER_APPLICATION',
          'PENDING', // Temporary entityId until application is created
          metadata.filename,
          file.size,
          file.mimetype,
          hash,
          metadata.ipfsCID || null,
          'REGISTRATION_SYSTEM',
          shouldEncrypt,
          description || null,
          'active',
        ]
      );

      logger.info(`✅ Registration document uploaded: ${documentId} (Type: ${documentType})`);

      res.status(201).json({
        success: true,
        data: {
          documentId,
          fileName: metadata.filename,
          fileSize: file.size,
          documentType,
          hash,
          ipfsCID: metadata.ipfsCID || null,
          encrypted: shouldEncrypt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error uploading registration document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload document',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/requirements/{entityType}:
 *   get:
 *     summary: Get document requirements for entity type
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/requirements/:entityType', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const requirements = getDocumentRequirements(entityType);

    const detailedRequirements = requirements.map((docType) => ({
      type: docType,
      name: DOCUMENT_TYPES[docType].name,
      category: DOCUMENT_TYPES[docType].category,
      allowedFormats: DOCUMENT_TYPES[docType].allowedFormats,
      maxSizeMB: DOCUMENT_TYPES[docType].maxSizeMB,
      required: DOCUMENT_TYPES[docType].required,
    }));

    res.json({
      success: true,
      data: {
        entityType,
        requirements: detailedRequirements,
        count: requirements.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching document requirements:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/upload:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *               - entityType
 *               - entityId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 */
router.post(
  '/upload',
  authMiddleware,
  (req: Request, res: Response, next: any) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds 10MB limit',
            },
            timestamp: new Date().toISOString(),
          });
        }
        // Handle unexpected field error
        if (err.message && err.message.includes('Unexpected field')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FIELD_NAME',
              message: `Wrong form field name. Expected 'file'. Please ensure the file input has name="file"`,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'File upload failed',
          },
          timestamp: new Date().toISOString(),
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const { documentType, entityType, entityId, expiryDate } = req.body;
      const file = req.file;
      const user = (req as any).user;

      // Validate required fields
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!documentType || !entityType || !entityId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'documentType, entityType, and entityId are required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate document type
      if (!validateDocumentType(documentType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_TYPE',
            message: `Invalid document type: ${documentType}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate file
      const validationResult = validateDocument(
        documentType,
        file.mimetype,
        file.size
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Document validation failed',
            errors: validationResult.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate file extension
      if (!validateFileExtension(file.originalname, file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_EXTENSION',
            message: 'File extension does not match mime type',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Upload to storage service FIRST (it generates the document ID)
      const metadata = await storage.uploadDocument(
        file.buffer,
        sanitizeFilename(file.originalname),
        file.mimetype,
        documentType,
        user.userId || user.sub,
        true // Encrypt by default
      );

      // Use the document ID generated by storage service
      const documentId = metadata.documentId;

      // Calculate hash for blockchain
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Store in database
      await db.run(
        `INSERT INTO documents (
          document_id, document_type, entity_type, entity_id,
          original_filename, mime_type, file_size, storage_path,
          uploaded_by, blockchain_hash, expiry_date, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          documentType,
          entityType,
          entityId,
          sanitizeFilename(file.originalname),
          file.mimetype,
          file.size,
          metadata.documentId, // Storage service document ID
          user.userId || user.sub,
          hash,
          expiryDate || null,
          JSON.stringify({
            ipfsCID: metadata.ipfsCID,
            category: metadata.category,
          }),
        ]
      );

      // ✅ CRITICAL FIX: Submit document hash to blockchain for tamper-proof anchoring
      try {
        const { FabricService } = await import('../services/fabricService');
        const fabricService = FabricService.getInstance();
        
        const blockchainResult = await fabricService.registerDocumentHash(
          documentId,
          entityId,
          entityType,
          hash,
          metadata.ipfsCID || '',
          sanitizeFilename(file.originalname),
          documentType
        );

        if (blockchainResult.success && blockchainResult.txId) {
          // Update database with blockchain transaction ID
          await db.run(
            'UPDATE documents SET blockchain_tx_id = ? WHERE document_id = ?',
            [blockchainResult.txId, documentId]
          );
          
          logger.info('✅ Document hash anchored on blockchain', {
            documentId,
            hash,
            txId: blockchainResult.txId,
          });
        } else {
          logger.warn('⚠️ Document hash NOT anchored on blockchain (non-critical)', {
            documentId,
            error: blockchainResult.error,
          });
        }
      } catch (blockchainError: any) {
        // Non-breaking: Document still saved locally even if blockchain fails
        logger.warn('⚠️ Blockchain anchoring failed (non-critical)', {
          documentId,
          error: blockchainError.message,
        });
      }

      logger.info('✅ Document uploaded successfully', {
        documentId,
        documentType,
        entityType,
        entityId,
        filename: file.originalname,
        size: file.size,
        uploadedBy: user.userId || user.sub,
      });

      res.status(201).json({
        success: true,
        data: {
          documentId,
          documentType,
          entityType,
          entityId,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          hash,
          uploadedAt: new Date().toISOString(),
        },
        warnings: validationResult.warnings,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/upload/bulk:
 *   post:
 *     summary: Upload multiple documents at once
 *     tags: [Documents]
 */
router.post(
  '/upload/bulk',
  authMiddleware,
  upload.array('files', 5),
  async (req: Request, res: Response) => {
    try {
      const { documentTypes, entityType, entityId } = req.body;
      const files = req.files as Express.Multer.File[];
      const user = (req as any).user;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files uploaded',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Parse document types (comma-separated or JSON array)
      let docTypesArray: string[];
      try {
        docTypesArray = Array.isArray(documentTypes)
          ? documentTypes
          : JSON.parse(documentTypes);
      } catch {
        docTypesArray = documentTypes.split(',');
      }

      if (docTypesArray.length !== files.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISMATCH',
            message: 'Number of files must match number of document types',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const results: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentType = docTypesArray[i].trim();

        try {
          // Validate document type
          if (!validateDocumentType(documentType)) {
            throw new Error(`Invalid document type: ${documentType}`);
          }

          // Validate file
          const validationResult = validateDocument(
            documentType,
            file.mimetype,
            file.size
          );

          if (!validationResult.valid) {
            throw new Error(validationResult.errors.join(', '));
          }

          // Upload to storage FIRST (it generates the document ID)
          const metadata = await storage.uploadDocument(
            file.buffer,
            sanitizeFilename(file.originalname),
            file.mimetype,
            documentType,
            user.userId || user.sub,
            true
          );

          // Use the document ID generated by storage service
          const documentId = metadata.documentId;

          // Calculate hash
          const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

          // Store in database
          await db.run(
            `INSERT INTO documents (
              document_id, document_type, entity_type, entity_id,
              original_filename, mime_type, file_size, storage_path,
              uploaded_by, blockchain_hash, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              documentId,
              documentType,
              entityType,
              entityId,
              sanitizeFilename(file.originalname),
              file.mimetype,
              file.size,
              metadata.documentId,
              user.userId || user.sub,
              hash,
              JSON.stringify({ ipfsCID: metadata.ipfsCID, category: metadata.category }),
            ]
          );

          // ✅ CRITICAL FIX: Submit document hash to blockchain
          try {
            const { FabricService } = await import('../services/fabricService');
            const fabricService = FabricService.getInstance();
            
            const blockchainResult = await fabricService.registerDocumentHash(
              documentId,
              entityId,
              entityType,
              hash,
              metadata.ipfsCID || '',
              sanitizeFilename(file.originalname),
              documentType
            );

            if (blockchainResult.success && blockchainResult.txId) {
              await db.run(
                'UPDATE documents SET blockchain_tx_id = ? WHERE document_id = ?',
                [blockchainResult.txId, documentId]
              );
            }
          } catch (blockchainError: any) {
            logger.warn('⚠️ Blockchain anchoring failed for bulk upload', {
              documentId,
              error: blockchainError.message,
            });
          }

          results.push({
            documentId,
            documentType,
            filename: file.originalname,
            success: true,
          });
        } catch (error: any) {
          errors.push({
            filename: file.originalname,
            documentType,
            error: error.message,
          });
        }
      }

      logger.info('✅ Bulk upload completed', {
        total: files.length,
        successful: results.length,
        failed: errors.length,
      });

      res.status(errors.length > 0 ? 207 : 201).json({
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error in bulk upload:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_UPLOAD_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{documentId}:
 *   get:
 *     summary: Get document metadata
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:documentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await db.get(
      'SELECT * FROM documents WHERE document_id = ? AND status != ?',
      [documentId, 'deleted']
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Parse metadata
    try {
      document.metadata = JSON.parse(document.metadata || '{}');
    } catch {
      document.metadata = {};
    }

    res.json({
      success: true,
      data: document,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/{documentId}/download:
 *   get:
 *     summary: Download document file
 *     tags: [Documents]
 */
router.get('/:documentId/download', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    // Get document metadata from database
    const document = await db.get(
      'SELECT * FROM documents WHERE document_id = ? AND status = ?',
      [documentId, 'active']
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Retrieve from storage service using document_id
    const { data, metadata } = await storage.getDocument(document.document_id);

    // Set headers for download
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name || metadata.filename}"`);
    res.setHeader('Content-Length', data.length);
    res.setHeader('X-Document-Hash', document.file_hash);

    logger.info('✅ Document downloaded', {
      documentId,
      filename: document.file_name || metadata.filename,
      size: data.length,
    });

    res.send(data);
  } catch (error: any) {
    logger.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get all documents for an entity
 *     tags: [Documents]
 */
router.get('/entity/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { includeArchived = 'false' } = req.query;

    let query = `
      SELECT * FROM documents 
      WHERE entity_type = ? AND entity_id = ? AND status != 'deleted'
    `;

    if (includeArchived === 'false') {
      query += " AND status = 'active'";
    }

    query += ' ORDER BY uploaded_at DESC';

    const documents = await db.all(query, [entityType, entityId]);

    // Parse metadata for each document
    documents.forEach((doc: any) => {
      try {
        doc.metadata = JSON.parse(doc.metadata || '{}');
      } catch {
        doc.metadata = {};
      }
    });

    // Check required documents
    const providedTypes = documents.map((doc: any) => doc.document_type);
    const requirementCheck = checkRequiredDocuments(entityType, providedTypes);

    res.json({
      success: true,
      data: {
        documents,
        count: documents.length,
        entityType,
        entityId,
        requirements: {
          allRequired: requirementCheck.valid,
          missing: requirementCheck.errors,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching entity documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/{documentId}/verify:
 *   post:
 *     summary: Verify a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 */
router.post('/:documentId/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { verified, comments } = req.body;
    const user = (req as any).user;

    // Check if document exists
    const document = await db.get(
      'SELECT * FROM documents WHERE document_id = ? AND status = ?',
      [documentId, 'active']
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if already verified
    if (document.verification_status === 'verified') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Document is already verified',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const verificationStatus = verified ? 'verified' : 'rejected';

    // Update verification status
    await db.run(
      `UPDATE documents 
       SET verification_status = ?, verified_by = ?, verified_at = ?, 
           metadata = json_set(metadata, '$.verificationComments', ?)
       WHERE document_id = ?`,
      [
        verificationStatus,
        user.userId || user.sub,
        new Date().toISOString(),
        comments || '',
        documentId,
      ]
    );

    logger.info(`✅ Document ${verificationStatus}`, {
      documentId,
      verifiedBy: user.userId || user.sub,
      comments,
    });

    res.json({
      success: true,
      data: {
        documentId,
        verificationStatus,
        verifiedBy: user.userId || user.sub,
        verifiedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error verifying document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/{documentId}:
 *   delete:
 *     summary: Delete a document (soft delete)
 *     tags: [Documents]
 */
router.delete('/:documentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    // Check if document exists
    const document = await db.get(
      'SELECT * FROM documents WHERE document_id = ? AND status != ?',
      [documentId, 'deleted']
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Soft delete (mark as deleted, don't actually remove)
    await db.run(
      `UPDATE documents SET status = ?, 
       metadata = json_set(metadata, '$.deletedBy', ?, '$.deletedAt', ?)
       WHERE document_id = ?`,
      ['deleted', user.userId || user.sub, new Date().toISOString(), documentId]
    );

    logger.info('✅ Document deleted (soft)', {
      documentId,
      deletedBy: user.userId || user.sub,
    });

    res.json({
      success: true,
      data: {
        documentId,
        status: 'deleted',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/{documentId}/archive:
 *   post:
 *     summary: Archive a document
 *     tags: [Documents]
 */
router.post('/:documentId/archive', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    const document = await db.get(
      'SELECT * FROM documents WHERE document_id = ? AND status = ?',
      [documentId, 'active']
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Active document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    await db.run(
      `UPDATE documents SET status = ?, 
       metadata = json_set(metadata, '$.archivedBy', ?, '$.archivedAt', ?)
       WHERE document_id = ?`,
      ['archived', user.userId || user.sub, new Date().toISOString(), documentId]
    );

    logger.info('✅ Document archived', {
      documentId,
      archivedBy: user.userId || user.sub,
    });

    res.json({
      success: true,
      data: {
        documentId,
        status: 'archived',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error archiving document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARCHIVE_FAILED',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/search:
 *   get:
 *     summary: Search documents
 *     tags: [Documents]
 */
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      documentType,
      entityType,
      uploadedBy,
      verificationStatus,
      fromDate,
      toDate,
      limit = '50',
      offset = '0',
    } = req.query;

    let query = 'SELECT * FROM documents WHERE status != ?';
    const params: any[] = ['deleted'];

    if (documentType) {
      query += ' AND document_type = ?';
      params.push(documentType);
    }

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (uploadedBy) {
      query += ' AND uploaded_by = ?';
      params.push(uploadedBy);
    }

    if (verificationStatus) {
      query += ' AND verification_status = ?';
      params.push(verificationStatus);
    }

    if (fromDate) {
      query += ' AND uploaded_at >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND uploaded_at <= ?';
      params.push(toDate);
    }

    query += ' ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const documents = await db.all(query, params);

    // Parse metadata
    documents.forEach((doc: any) => {
      try {
        doc.metadata = JSON.parse(doc.metadata || '{}');
      } catch {
        doc.metadata = {};
      }
    });

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE status != ?';
    const countParams: any[] = ['deleted'];

    if (documentType) {
      countQuery += ' AND document_type = ?';
      countParams.push(documentType);
    }
    if (entityType) {
      countQuery += ' AND entity_type = ?';
      countParams.push(entityType);
    }
    if (uploadedBy) {
      countQuery += ' AND uploaded_by = ?';
      countParams.push(uploadedBy);
    }
    if (verificationStatus) {
      countQuery += ' AND verification_status = ?';
      countParams.push(verificationStatus);
    }

    const { total } = await db.get(countQuery, countParams);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + documents.length < total,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error searching documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/documents/{documentId}/hash:
 *   get:
 *     summary: Get document hash for blockchain verification
 *     tags: [Documents]
 */
router.get('/:documentId/hash', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await db.get(
      'SELECT document_id, blockchain_hash, blockchain_tx_id FROM documents WHERE document_id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${documentId} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        documentId: document.document_id,
        hash: document.blockchain_hash,
        blockchainTxId: document.blockchain_tx_id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching document hash:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
