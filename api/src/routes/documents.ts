/**
 * Document Management Routes
 * Off-chain document storage with blockchain hash verification
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import DocumentStorageService from '../services/documentStorageService';
import { FabricService } from '../services/fabricService';
import logger from '../utils/logger';

const router = express.Router();
const documentStorage = DocumentStorageService.getInstance();
const fabricService = FabricService.getInstance();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX'));
    }
  },
});

/**
 * POST /api/v1/documents/upload
 * Upload document with optional blockchain hash registration
 */
router.post('/upload',
  authMiddleware,
  upload.single('document'),
  [
    body('category').notEmpty().withMessage('Document category is required'),
    body('entityId').optional().isString(),
    body('entityType').optional().isString(), // 'LC', 'PAYMENT', 'SHIPMENT', etc.
    body('description').optional().isString(),
    body('encrypt').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
        });
      }

      const user = (req as any).user;
      const { category, entityId, entityType, description, encrypt } = req.body;
      const shouldEncrypt = encrypt === 'true' || encrypt === true;

      logger.info('Uploading document', {
        filename: req.file.originalname,
        size: req.file.size,
        category,
        user: user?.exporterId || user?.org,
      });

      // Upload to storage
      const metadata = await documentStorage.uploadDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        category,
        user?.exporterId || user?.org || 'SYSTEM',
        shouldEncrypt
      );

      // Register document hash on blockchain if entityId provided
      if (entityId && entityType) {
        try {
          const result = await fabricService.invokeChaincode('RegisterDocumentHash', [
            metadata.documentId,
            entityId,
            entityType,
            metadata.hash,
            metadata.ipfsCID || '',
            metadata.filename,
            category,
          ]);

          if (result.success) {
            logger.info('✅ Document hash registered on blockchain', {
              documentId: metadata.documentId,
              entityId,
              hash: metadata.hash,
            });
          } else {
            logger.warn('⚠️ Failed to register document hash on blockchain', {
              documentId: metadata.documentId,
              error: result.error,
            });
          }
        } catch (blockchainError) {
          logger.warn('⚠️ Blockchain registration failed', { error: blockchainError });
          // Continue - document is still stored off-chain
        }
      }

      res.json({
        success: true,
        data: {
          documentId: metadata.documentId,
          filename: metadata.filename,
          size: metadata.size,
          hash: metadata.hash,
          ipfsCID: metadata.ipfsCID,
          uploadedAt: metadata.uploadedAt,
          encrypted: metadata.encrypted,
          category: metadata.category,
        },
        message: 'Document uploaded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Document upload error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Document upload failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/documents/:documentId
 * Download document
 */
router.get('/:documentId',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      const { data, metadata } = await documentStorage.getDocument(documentId);

      // Set headers
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.filename}"`);
      res.setHeader('Content-Length', data.length);
      res.setHeader('X-Document-Hash', metadata.hash);
      if (metadata.ipfsCID) {
        res.setHeader('X-IPFS-CID', metadata.ipfsCID);
      }

      res.send(data);
    } catch (error) {
      logger.error('Document download error', { error });
      res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found or access denied',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/documents/:documentId/metadata
 * Get document metadata without downloading
 */
router.get('/:documentId/metadata',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { metadata } = await documentStorage.getDocument(documentId);

      res.json({
        success: true,
        data: metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Document metadata error', { error });
      res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/documents
 * List documents with filters
 */
router.get('/',
  authMiddleware,
  [
    query('category').optional().isString(),
    query('uploadedBy').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { category, uploadedBy } = req.query;

      const documents = await documentStorage.listDocuments({
        category: category as string | undefined,
        uploadedBy: uploadedBy as string | undefined,
      });

      res.json({
        success: true,
        data: documents,
        count: documents.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Document list error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: 'Failed to list documents',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/v1/documents/:documentId
 * Delete document
 */
router.delete('/:documentId',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const user = (req as any).user;

      // Check ownership
      const { metadata } = await documentStorage.getDocument(documentId);
      if (metadata.uploadedBy !== (user?.exporterId || user?.org)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this document',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const deleted = await documentStorage.deleteDocument(documentId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Document deleted successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete document',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Document delete error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete document',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/documents/:documentId/verify
 * Verify document integrity against blockchain hash
 */
router.post('/:documentId/verify',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      // Get document and compute hash
      const { data, metadata } = await documentStorage.getDocument(documentId);
      const crypto = require('crypto');
      const computedHash = crypto.createHash('sha256').update(data).digest('hex');

      // Verify against stored hash
      const localMatch = computedHash === metadata.hash;

      // Try to verify against blockchain if registered
      let blockchainMatch = false;
      try {
        const result = await fabricService.queryChaincode('ReadDocumentHash', [documentId]);
        if (result.success && result.data) {
          blockchainMatch = result.data.hash === computedHash;
        }
      } catch (error) {
        logger.warn('Could not verify against blockchain', { error });
      }

      res.json({
        success: true,
        data: {
          documentId,
          filename: metadata.filename,
          hash: computedHash,
          localMatch,
          blockchainMatch,
          verified: localMatch && (blockchainMatch || !metadata.ipfsCID),
          ipfsCID: metadata.ipfsCID,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Document verification error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Document verification failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/documents/entity/:entityType/:entityId
 * Get documents by entity (CONTRACT, LC, SHIPMENT, etc.)
 */
router.get('/entity/:entityType/:entityId',
  authMiddleware,
  [
    param('entityType').notEmpty().withMessage('Entity type is required'),
    param('entityId').notEmpty().withMessage('Entity ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;

      logger.info('[DOCUMENTS] Fetching documents for entity:', { entityType, entityId });

      // Query blockchain for document hashes linked to this entity
      try {
        const result = await fabricService.evaluateTransaction('QueryDocumentsByEntity', entityType, entityId);
        const documents = JSON.parse(result.toString());
        
        res.json({
          success: true,
          data: documents || [],
          count: documents?.length || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (blockchainError) {
        logger.warn('[DOCUMENTS] Blockchain query failed, returning empty list:', blockchainError);
        // Return empty array if blockchain query fails
        res.json({
          success: true,
          data: [],
          count: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[DOCUMENTS] Error fetching entity documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch entity documents',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;