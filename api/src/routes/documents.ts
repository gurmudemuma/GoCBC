import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/documents');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, DOC, DOCX, XLS, XLSX files are allowed'));
    }
  }
});

const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: errors.array() },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

router.post('/',
  authMiddleware,
  [
    body('documentID').notEmpty(),
    body('documentType').notEmpty(),
    body('fileName').notEmpty(),
    body('fileHash').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentID, shipmentID, contractID, documentType, fileName, fileHash, ipfsCID } = req.body;
      const user = (req as any).user;
      const exporterID = user.exporterId || user.username;

      await postgresDb.run(
        `INSERT INTO documents (
          document_id, shipment_id, contract_id, exporter_id, document_type,
          file_name, file_hash, ipfs_cid, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [documentID, shipmentID || null, contractID || null, exporterID,
         documentType, fileName, fileHash, ipfsCID || null, user.username]
      );

      res.json({
        success: true,
        data: { documentID, status: 'uploaded' },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.post('/:documentID/verify',
  authMiddleware,
  [body('verified').isBoolean()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentID } = req.params;
      const { verified, remarks } = req.body;
      const user = (req as any).user;
      const verificationID = `VER-${Date.now()}`;

      await postgresDb.run(
        `INSERT INTO document_verifications (
          verification_id, document_id, verified_by, verified_by_org, verified, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [verificationID, documentID, user.username, user.organization, verified, remarks || null]
      );

      res.json({
        success: true,
        data: { documentID, verified },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Document verification error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.get('/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { shipmentID, contractID } = req.query;
      let query = 'SELECT * FROM documents WHERE 1=1';
      const params: any[] = [];
      let idx = 1;

      if (shipmentID) {
        query += ` AND shipment_id = $${idx++}`;
        params.push(shipmentID);
      }
      if (contractID) {
        query += ` AND contract_id = $${idx++}`;
        params.push(contractID);
      }

      query += ' ORDER BY upload_date DESC';
      const documents = await postgresDb.all(query, params);

      res.json({ success: true, data: { documents }, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get documents by entity type and ID
router.get('/entity/:entityType/:entityId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      const documents = await postgresDb.all(
        `SELECT * FROM documents 
         WHERE entity_type = $1 AND entity_id = $2 
         ORDER BY uploaded_at DESC`,
        [entityType, entityId]
      );

      // Return documents array directly in data field
      res.json({ 
        success: true, 
        data: documents || [], // Array directly, not nested
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      logger.error('Get documents by entity error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ✅ FIX: Add general upload endpoint with authentication
router.post('/upload',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const user = (req as any).user;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
          timestamp: new Date().toISOString()
        });
      }

      const { fileName, entityType, entityId, documentType, encrypt, description } = req.body;
      
      // Calculate file hash
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      const documentID = `DOC-${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const finalEntityType = entityType || 'CONTRACT';
      const finalEntityId = entityId || documentID;
      
      // ✅ AUTOMATIC TYPE CORRECTION: Convert SALES_CONTRACT to CONTRACT_SIGNED for contracts
      let finalDocType = documentType || 'OTHER';
      if (finalEntityType === 'CONTRACT' && finalDocType === 'SALES_CONTRACT') {
        finalDocType = 'CONTRACT_SIGNED';
        logger.info(`Auto-corrected document type from SALES_CONTRACT to CONTRACT_SIGNED for contract ${finalEntityId}`);
      }
      
      const finalFileName = fileName || file.originalname;

      logger.info('Uploading authenticated document:', { 
        documentID, 
        finalEntityType, 
        finalEntityId, 
        finalFileName,
        fileSize: file.size,
        uploadedBy: user.username
      });

      // Store document in database with file path
      await postgresDb.run(
        `INSERT INTO documents (
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path, uploaded_by, status, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          documentID, 
          finalEntityType, 
          finalEntityId, 
          finalDocType, 
          finalFileName,
          fileHash,
          file.mimetype,
          file.size,
          file.path,
          user.username,
          'active',
          description || null
        ]
      );

      logger.info('Authenticated document uploaded successfully:', documentID);

      res.json({
        success: true,
        data: { 
          documentId: documentID,
          fileName: finalFileName,
          hash: fileHash,
          ipfsCID: null, // Not using IPFS for now
          status: 'uploaded'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Upload authenticated document error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Upload registration document (for exporter applications - NO AUTH REQUIRED)
router.post('/upload-registration',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
          timestamp: new Date().toISOString()
        });
      }

      const { fileName, entityType, entityId, documentType, encrypt } = req.body;
      
      // Calculate file hash
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      const documentID = `DOC-${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const finalEntityType = entityType || 'EXPORTER_APPLICATION';
      const finalEntityId = entityId || documentID;
      const finalDocType = documentType || 'OTHER';
      const finalFileName = fileName || file.originalname;

      logger.info('Uploading registration document:', { 
        documentID, 
        finalEntityType, 
        finalEntityId, 
        finalFileName,
        fileSize: file.size,
        filePath: file.path
      });

      // Store document in database with file path
      await postgresDb.run(
        `INSERT INTO documents (
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          documentID, 
          finalEntityType, 
          finalEntityId, 
          finalDocType, 
          finalFileName,
          fileHash,
          file.mimetype,
          file.size,
          file.path,
          'applicant',
          'active'
        ]
      );

      logger.info('Registration document uploaded successfully:', documentID);

      res.json({
        success: true,
        data: { 
          documentId: documentID,
          fileName: finalFileName,
          hash: fileHash,
          ipfsCID: null, // Not using IPFS for now
          status: 'uploaded'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Upload registration document error:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Download/View document
router.get('/:documentId/download',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { inline } = req.query; // Support ?inline=true for viewing
      
      logger.info(`Document download/view requested: ${documentId}, inline: ${inline}`);
      
      // Get document info from database
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );
      
      if (!doc) {
        logger.warn(`Document not found in database: ${documentId}`);
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`Document found: ${doc.file_name}, path: ${doc.file_path}`);
      
      // Check if file exists
      if (!doc.file_path || !fs.existsSync(doc.file_path)) {
        logger.error(`File not found on disk: ${doc.file_path}`);
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Document file not found on server' },
          timestamp: new Date().toISOString()
        });
      }
      
      // Set content type
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      
      // Set content disposition based on inline parameter
      if (inline === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
      }
      
      logger.info(`Streaming file: ${doc.file_name}`);
      
      // Send file
      const fileStream = fs.createReadStream(doc.file_path);
      fileStream.pipe(res);
      
      // ✅ LOG TO AUDIT TRAIL - Document Viewed
      try {
        const user = (req as any).user;
        await postgresDb.run(
          `INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, performed_by_org, 
            old_value, new_value, reason, metadata, ip_address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            'DOCUMENT',
            documentId,
            'VIEW',
            user?.sub || user?.username || 'USER',
            user?.org || 'UNKNOWN',
            'N/A',
            'VIEWED',
            `Document ${inline === 'true' ? 'viewed' : 'downloaded'}: ${doc.file_name}`,
            JSON.stringify({
              documentId,
              fileName: doc.file_name,
              entityType: doc.entity_type,
              entityId: doc.entity_id,
              documentType: doc.document_type,
              fileSize: doc.file_size,
              mimeType: doc.mime_type,
              inline: inline === 'true',
              viewedBy: user?.username,
              role: user?.role,
              organization: user?.org,
              timestamp: new Date().toISOString()
            }),
            req.ip || (req as any).connection?.remoteAddress || 'unknown'
          ]
        );
        logger.info(`✅ Audit log created for document view: ${documentId} by ${user?.username}`);
      } catch (auditError) {
        logger.error('Failed to create document view audit log:', auditError);
        // Don't fail the request if audit logging fails
      }
      
      fileStream.on('error', (err) => {
        logger.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: { code: 'STREAM_ERROR', message: 'Failed to stream file' },
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (error: any) {
      logger.error('Document download error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  }
);

// Add alias for /view endpoint (same as /download with inline=true)
router.get('/:documentId/view',
  authMiddleware,
  async (req: Request, res: Response, next: Function) => {
    // Redirect to download with inline=true
    req.query.inline = 'true';
    next();
  }
);

// Add alias without /download suffix
router.get('/:documentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      
      // Get document info only (metadata)
      const doc = await postgresDb.get(
        'SELECT document_id, entity_type, entity_id, document_type, file_name, file_hash, mime_type, file_size, uploaded_by, status, uploaded_at FROM documents WHERE document_id = $1',
        [documentId]
      );
      
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        data: doc,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Get document metadata error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET documents by entity (for viewing application documents in ECTA portal)
router.get('/entity/:entityType/:entityId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      logger.info(`Fetching documents for ${entityType}/${entityId}`);
      
      const documents = await postgresDb.all(
        `SELECT 
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, uploaded_by, status, uploaded_at
        FROM documents 
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY uploaded_at DESC`,
        [entityType, entityId]
      );
      
      logger.info(`Found ${documents.length} documents for ${entityType}/${entityId}`);
      
      res.json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error fetching documents by entity:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
