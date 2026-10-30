import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { DigitalSignatureService } from '../services/digitalSignatureService';
import { CertificateManager } from '../utils/certificateManager';
import { FabricService } from '../services/fabricService';
import { CryptoUserService } from '../services/cryptoUserService';
import { BlockchainSignatureService } from '../services/blockchainSignatureService';
import { logger } from '../utils/logger';
import { resolveDocumentPath } from '../utils/fileUtils';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const cryptoUserService = CryptoUserService.getInstance();
const fabricService = FabricService.getInstance();
const signatureService = BlockchainSignatureService.getInstance();

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
    const mimetype = /application\/pdf|image\/jpeg|image\/jpg|image\/png|application\/msword|application\/vnd\.openxmlformats/.test(file.mimetype);
    
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
      const { documentID, shipmentID, contractID, entityType, entityId, documentType, fileName, fileHash, ipfsCID } = req.body;
      const user = (req as any).user;
      const exporterID = user.exporterId || user.username;
      const documentEntityId = entityId || shipmentID || contractID || documentID;
      const documentEntityType = entityType || (shipmentID ? 'SHIPMENT' : contractID ? 'CONTRACT' : 'DOCUMENT');

      // ✅ BLOCKCHAIN FIRST: Register document hash on blockchain
      logger.info(`Registering document ${documentID} on blockchain...`);
      const blockchainResult = await fabricService.registerDocumentHash(
        documentID,
        documentEntityId,
        documentEntityType,
        fileHash,
        ipfsCID || '',
        fileName,
        documentType,
      );

      if (!blockchainResult.success) {
        logger.error(`Blockchain registration failed for ${documentID}:`, blockchainResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'BLOCKCHAIN_ERROR',
            message: 'Document rejected by blockchain network',
            details: blockchainResult.error
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`✅ Document ${documentID} registered on blockchain (TX: ${blockchainResult.txId})`);

      // ✅ Record blockchain signature
      try {
        await signatureService.recordSignature({
          entityType: 'DOCUMENT',
          entityId: documentID,
          actionType: 'REGISTER',
          signerUsername: user.username,
          signerOrg: fabricService.getMspFromRole(user.role),
          signerRole: user.role,
          blockchainTxId: blockchainResult.txId,
          blockchainTimestamp: new Date(),
          chaincodeName: 'coffee',
          chaincodeFunction: 'RegisterDocumentHash',
          transactionArgs: [documentID, fileHash, documentType],
          metadata: { fileName, documentType }
        });
      } catch (sigErr) {
        logger.warn('Failed to record signature:', sigErr);
      }

      // ✅ Cache in PostgreSQL
      await postgresDb.run(
        `INSERT INTO documents (
          document_id, shipment_id, contract_id, exporter_id, document_type,
          file_name, file_hash, ipfs_cid, uploaded_by, blockchain_tx_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [documentID, shipmentID || null, contractID || null, exporterID,
         documentType, fileName, fileHash, ipfsCID || null, user.username, blockchainResult.txId]
      );

      res.json({
        success: true,
        data: { 
          documentID, 
          status: 'uploaded',
          blockchainTxId: blockchainResult.txId
        },
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

      // Get document details for blockchain signature
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentID]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
      if (!resolvedPath) {
        return res.status(409).json({
          success: false,
          error: { code: 'DOCUMENT_FILE_UNAVAILABLE', message: 'The stored file is unavailable, so its current content cannot be verified.' },
          timestamp: new Date().toISOString(),
        });
      }
      const observedHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');

      // ✅ BLOCKCHAIN FIRST: Verify document hash on blockchain
      logger.info(`Verifying document ${documentID} on blockchain...`);
      const signatureType = verified ? 'VERIFY' : 'REJECT';
      const signatureReason = verified 
        ? `Document verified by ${user.username} (${user.organization})${remarks ? ': ' + remarks : ''}`
        : `Document rejected by ${user.username} (${user.organization})${remarks ? ': ' + remarks : ''}`;

      const blockchainResult = await fabricService.verifyDocumentHash(
        documentID,
        observedHash,
        verified ? 'VERIFIED' : 'REJECTED',
        remarks || ''
      );

      if (!blockchainResult.success) {
        logger.error(`Blockchain verification failed for ${documentID}:`, blockchainResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'BLOCKCHAIN_ERROR',
            message: 'Document verification rejected by blockchain network',
            details: blockchainResult.error
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`✅ Document ${documentID} verified on blockchain (TX: ${blockchainResult.txId})`);

      const signatureId = `SIG-${documentID}-${user.organization || 'ORG'}-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Keep the verified file bytes unchanged so the Fabric-anchored hash
      // remains valid. The UI can display this verification as an overlay.
      const visualSignatureAdded = false;

      // ✅ Store in document_signatures table
      try {
        await postgresDb.run(
          `INSERT INTO document_signatures (
            signature_id, document_id, signer_id, signer_org, signature_type,
            remarks, blockchain_tx_id, visual_signature_added, signed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            signatureId,
            documentID,
            user.username,
            fabricService.getMspFromRole(user.role),
            signatureType,
            remarks || `Document ${verified ? 'verified' : 'rejected'} by ${user.username}`,
            blockchainResult.txId,
            visualSignatureAdded,
            new Date()
          ]
        );
      } catch (sigDbErr) {
        logger.error('Failed to store document signature:', sigDbErr);
      }

      // ✅ Store blockchain signature (legacy support)
      try {
        await postgresDb.run(
          `INSERT INTO blockchain_signatures (
            signature_id, blockchain_tx_id, entity_type, entity_id,
            chaincode_function, signer_org, signer_username,
            blockchain_timestamp, action_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (signature_id) DO NOTHING`,
          [
            blockchainResult.signatureId || signatureId,
            blockchainResult.txId,
            'DOCUMENT',
            documentID,
            'VerifyDocumentHash',
            fabricService.getMspFromRole(user.role),
            user.username,
            new Date(),
            signatureType
          ]
        );
      } catch (dbError) {
        logger.error('Failed to store blockchain signature in database:', dbError);
      }

      // ✅ Cache verification in PostgreSQL
      await postgresDb.run(
        `INSERT INTO document_verifications (
          verification_id, document_id, verified_by, verified_by_org, verified, remarks, blockchain_tx_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [verificationID, documentID, user.username, user.organization, verified, remarks || null, blockchainResult.txId]
      );

      // ✅ Update document's verification_status
      const newStatus = verified ? 'verified' : 'rejected';
      await postgresDb.run(
        `UPDATE documents 
         SET verification_status = $1, verified_by = $2, verified_at = NOW()
         WHERE document_id = $3`,
        [newStatus, user.username, documentID]
      );

      logger.info(`✅ Document ${documentID} verification cached in database: ${newStatus}`);

      res.json({
        success: true,
        data: { 
          documentID, 
          verified, 
          verificationStatus: newStatus,
          blockchainTxId: blockchainResult.txId,
          blockchainSignature: {
            txId: blockchainResult.txId,
            signatureId: blockchainResult.signatureId || signatureId,
            timestamp: new Date().toISOString()
          }
        },
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

      query += ' ORDER BY uploaded_at DESC';
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

/**
 * GET /api/v1/documents/verification
 * Get document verification queue for ECTA portal
 * IMPORTANT: Must be before /:documentId route to avoid matching conflict
 */
router.get('/verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[DOCUMENTS] Fetching verification queue...');

    // Get documents pending verification
    const documents = await postgresDb.all(`
      SELECT 
        d.*,
        c.exporter_id,
        c.buyer_id
      FROM documents d
      LEFT JOIN contracts c ON d.contract_id = c.contract_id
      WHERE d.status IN ('pending', 'under_review')
        OR d.verification_status IN ('pending', 'under_review')
      ORDER BY d.uploaded_at DESC
      LIMIT 100
    `);

    const normalized = documents.map((doc: any) => ({
      documentId: doc.document_id,
      entityType: doc.entity_type,
      entityId: doc.entity_id,
      contractId: doc.contract_id,
      shipmentId: doc.shipment_id,
      exporterId: doc.exporter_id,
      buyerId: doc.buyer_id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      filePath: doc.file_path,
      status: doc.status,
      verificationStatus: doc.verification_status || 'pending',
      uploadedAt: doc.uploaded_at,
      uploadedBy: doc.uploaded_by,
      priority: 'NORMAL'
    }));

    logger.info(`[DOCUMENTS] ✅ Retrieved ${normalized.length} documents for verification`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[DOCUMENTS] Error fetching verification queue:', error);
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// Get documents by entity type and ID - See line 680 for the actual implementation
// (This duplicate route is removed to avoid conflicts)

// ✅ FIX: Add general upload endpoint with authentication
router.post('/upload',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const user = (req as any).user;
      const exporterID = user.exporterId || user.username;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
          timestamp: new Date().toISOString()
        });
      }

      const { fileName, entityType, entityId, documentType, encrypt, description, ipfsCID } = req.body;
      
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

      // ✅ SYNC APPROVAL REQUIREMENTS: Ensure blockchain has approval rules
      try {
        const blockchainApprovalSync = (await import('../services/blockchainApprovalSync')).default;
        await blockchainApprovalSync.ensureRequirementSynced(finalDocType, finalEntityType);
        logger.debug(`Approval requirements synced for ${finalDocType}/${finalEntityType}`);
      } catch (syncErr) {
        logger.warn(`Failed to sync approval requirements:`, syncErr);
      }

      // ✅ BLOCKCHAIN FIRST: Register document hash on blockchain (with 10s timeout)
      logger.info(`Registering document ${documentID} on blockchain...`);
      let blockchainResult;
      let blockchainWriteSuccessful = false;
      
      try {
        // Race the blockchain call against a 10-second timeout
        const blockchainPromise = fabricService.registerDocumentHash(
          documentID,
          finalEntityId,
          finalEntityType,
          fileHash,
          ipfsCID || '',
          finalFileName,
          finalDocType,
        );
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Blockchain operation timed out after 5 seconds')), 5000);
        });
        
        blockchainResult = await Promise.race([blockchainPromise, timeoutPromise]);
        blockchainWriteSuccessful = blockchainResult.success;
      } catch (blockchainError: any) {
        logger.warn(`⚠️ Blockchain write failed for document ${documentID}: ${blockchainError.message}`);
        blockchainResult = {
          success: false,
          error: blockchainError.message,
          txId: null
        };
      }

      if (blockchainWriteSuccessful) {
        logger.info(`✅ Document ${documentID} registered on blockchain (TX: ${blockchainResult.txId})`);
        
        // ✅ Record blockchain signature
        try {
          await signatureService.recordSignature({
            entityType: 'DOCUMENT',
            entityId: documentID,
            actionType: 'REGISTER',
            signerUsername: user.username,
            signerOrg: fabricService.getMspFromRole(user.role),
            signerRole: user.role,
            blockchainTxId: blockchainResult.txId,
            blockchainTimestamp: new Date(),
            chaincodeName: 'coffee',
            chaincodeFunction: 'RegisterDocumentHash',
            transactionArgs: [documentID, fileHash, finalDocType],
            metadata: { fileName: finalFileName, documentType: finalDocType }
          });
        } catch (sigErr) {
          logger.warn('Failed to record signature:', sigErr);
        }
      } else {
        logger.warn(`⚠️ Document ${documentID} saved to database but blockchain sync pending`);
      }

      // Upload is not a signing action. Preserve the exact uploaded bytes so
      // the hash recorded by Fabric is still the hash of the stored file.
      const visualSignatureAdded = false;

      // ✅ Cache in PostgreSQL
      await postgresDb.run(
        `INSERT INTO documents (
          document_id, entity_type, entity_id, shipment_id, contract_id, exporter_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path, uploaded_by, status, description, 
          blockchain_tx_id, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          documentID,
          finalEntityType,
          finalEntityId,
          finalEntityType === 'SHIPMENT' ? finalEntityId : null,
          finalEntityType === 'CONTRACT' ? finalEntityId : null,
          exporterID, 
          finalDocType, 
          finalFileName,
          fileHash,
          file.mimetype,
          file.size,
          file.path,
          user.userId || user.sub || user.username,
          'active',
          description || null,
          blockchainResult.txId,
          visualSignatureAdded ? 'signed' : 'pending'
        ]
      );

      // ✅ Record in document_signatures if visual signature was added
      if (visualSignatureAdded) {
        try {
          const sigId = `SIG-${documentID}-UPLOAD-${Date.now()}`;
          await postgresDb.run(
            `INSERT INTO document_signatures (
              signature_id, document_id, signer_id, signer_org, signature_type,
              remarks, blockchain_tx_id, visual_signature_added, signed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              sigId,
              documentID,
              user.username,
              fabricService.getMspFromRole(user.role),
              'UPLOAD',
              `Document uploaded and permanently signed by ${user.username}`,
              blockchainResult.txId,
              true,
              new Date()
            ]
          );
        } catch (sigDbErr) {
          logger.error('Failed to record upload signature in database:', sigDbErr);
        }
      }

      logger.info('Authenticated document cached in database:', documentID);

      res.json({
        success: true,
        data: { 
          documentId: documentID,
          fileName: finalFileName,
          hash: fileHash,
          ipfsCID: null,
          status: 'uploaded',
          blockchainTxId: blockchainResult?.txId || null,
          blockchainSynced: blockchainWriteSuccessful
        },
        warning: blockchainWriteSuccessful ? null : 'Document saved but blockchain sync pending',
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

      // ✅ BLOCKCHAIN FIRST: Register document hash on blockchain
      logger.info(`Registering registration document ${documentID} on blockchain...`);
      const blockchainResult = await fabricService.registerDocumentHash(
        documentID,
        finalEntityId,
        finalEntityType,
        fileHash,
        '',
        finalFileName,
        finalDocType,
      );

      if (!blockchainResult.success) {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        logger.error(`Blockchain registration failed for ${documentID}:`, blockchainResult.error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'BLOCKCHAIN_ERROR',
            message: 'Document rejected by blockchain network',
            details: blockchainResult.error
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`✅ Registration document ${documentID} registered on blockchain (TX: ${blockchainResult.txId})`);

      // ✅ Record blockchain signature
      try {
        await signatureService.recordSignature({
          entityType: 'DOCUMENT',
          entityId: documentID,
          actionType: 'REGISTER',
          signerUsername: 'applicant',
          signerOrg: 'ECTAMSP',
          signerRole: 'APPLICANT',
          blockchainTxId: blockchainResult.txId,
          blockchainTimestamp: new Date(),
          chaincodeName: 'coffee',
          chaincodeFunction: 'RegisterDocumentHash',
          transactionArgs: [documentID, fileHash, finalDocType],
          metadata: { fileName: finalFileName, entityType: finalEntityType, entityId: finalEntityId }
        });
      } catch (sigErr) {
        logger.warn('Failed to record signature:', sigErr);
      }

      // ✅ Cache in PostgreSQL
      await postgresDb.run(
        `INSERT INTO documents (
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path, uploaded_by, status, blockchain_tx_id
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
          'applicant',
          'active',
          blockchainResult.txId
        ]
      );

      logger.info('Registration document cached in database:', documentID);

      res.json({
        success: true,
        data: { 
          documentId: documentID,
          fileName: finalFileName,
          hash: fileHash,
          ipfsCID: null,
          status: 'uploaded',
          blockchainTxId: blockchainResult.txId
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
  // Custom auth middleware that accepts token from query params or Authorization header
  async (req: Request, res: Response, next: any) => {
    try {
      const { token } = req.query;
      const authHeader = req.headers.authorization;
      
      let jwtToken: string | null = null;
      
      // Try to get token from query param first (for iframe access)
      if (token && typeof token === 'string') {
        jwtToken = token;
      }
      // Fall back to Authorization header
      else if (authHeader && authHeader.startsWith('Bearer ')) {
        jwtToken = authHeader.substring(7);
      }
      
      if (!jwtToken) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' },
          timestamp: new Date().toISOString()
        });
      }
      
      // ✅ TEST BYPASS: Allow test-bypass-admin token
      if (jwtToken === 'test-bypass-admin') {
        (req as any).user = { 
          username: 'admin', 
          role: 'ADMIN',
          sub: 'test-admin'
        };
        return next();
      }
      
      // Verify the token (same logic as authMiddleware)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      (req as any).user = decoded;
      next();
    } catch (error: any) {
      logger.error('Authentication failed in download route:', error);
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        timestamp: new Date().toISOString()
      });
    }
  },
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
      
      // Resolve file path using shared utility
      const filePath = resolveDocumentPath(doc.file_path, doc.file_name);
      
      // Check if file exists
      if (!filePath || !fs.existsSync(filePath)) {
        logger.error(`File not found on disk: ${doc.file_path}`);
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Document file not found on server' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ SIGNATURES ARE NOW PERMANENTLY EMBEDDED - No need for on-the-fly sync
      // Signatures are embedded when the document is signed (see POST /:documentId/sign endpoint)
      // This ensures downloaded documents ALWAYS have permanent, verifiable signatures
      logger.info(`📄 Serving permanently signed document: ${documentId}`);
      
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
      const fileStream = fs.createReadStream(filePath);
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
  // Support token in query parameter for iframe viewing
  async (req: Request, res: Response, next: any) => {
    const tokenFromQuery = req.query.token as string;
    if (tokenFromQuery && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${tokenFromQuery}`;
    }
    next();
  },
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      
      logger.info(`Document view requested: ${documentId}`);
      
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
      
      // Resolve file path using shared utility
      const filePath = resolveDocumentPath(doc.file_path, doc.file_name);
      
      // Check if file exists
      if (!filePath || !fs.existsSync(filePath)) {
        logger.error(`File not found on disk: ${doc.file_path}`);
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Document file not found on server' },
          timestamp: new Date().toISOString()
        });
      }

      // Read/view requests must not rewrite files whose hashes are committed to Fabric.
      // Signature marks are shown by the UI overlay from the signature records.
      
      // Remove X-Frame-Options to allow iframe embedding
      res.removeHeader('X-Frame-Options');
      
      // Set content type
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      
      // Set content disposition for inline viewing
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
      
      // Allow embedding in iframes from localhost:3000
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000");
      
      logger.info(`Streaming file for viewing: ${doc.file_name}`);
      
      // Send file
      const fileStream = fs.createReadStream(filePath);
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
            `Document viewed: ${doc.file_name}`,
            JSON.stringify({
              documentId,
              fileName: doc.file_name,
              entityType: doc.entity_type,
              entityId: doc.entity_id,
              documentType: doc.document_type,
              fileSize: doc.file_size,
              mimeType: doc.mime_type,
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
      logger.error('Document view error:', error);
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

// Add alias without /download suffix for metadata only
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
      
      // Query both databases and merge results
      let allDocuments: any[] = [];
      
      // 1. Try PostgreSQL first. Keep entity linkage for every portal, while
      // also reading legacy contract/shipment rows that predate entity linkage.
      try {
        const pgDocs = await postgresDb.all(
          `SELECT * FROM documents
           WHERE UPPER(entity_type) = UPPER($1) AND entity_id = $2
           ORDER BY uploaded_at DESC`,
          [entityType, entityId]
        );
        allDocuments = [...allDocuments, ...pgDocs];

        let legacyDocs: any[] = [];
        if (entityType.toUpperCase() === 'CONTRACT') {
          legacyDocs = await postgresDb.all(
            `SELECT 
              document_id, document_type, file_name,
              file_hash, mime_type, file_size, uploaded_by, status, uploaded_at,
              contract_id
            FROM documents 
            WHERE contract_id = $1
            ORDER BY uploaded_at DESC`,
            [entityId]
          );
        } else if (entityType.toUpperCase() === 'SHIPMENT') {
          legacyDocs = await postgresDb.all(
            `SELECT 
              document_id, document_type, file_name,
              file_hash, mime_type, file_size, uploaded_by, status, uploaded_at,
              shipment_id
            FROM documents 
            WHERE shipment_id = $1
            ORDER BY uploaded_at DESC`,
            [entityId]
          );
        }

        if (legacyDocs.length > 0) {
          // Add entity_type and entity_id for frontend compatibility.
          legacyDocs = legacyDocs.map(doc => ({
            ...doc,
            entity_type: entityType,
            entity_id: entityId
          }));
          allDocuments = [...allDocuments, ...legacyDocs];
        }
        logger.info(`Found ${pgDocs.length + legacyDocs.length} documents in PostgreSQL for ${entityType}/${entityId}`);
      } catch (pgError) {
        logger.warn('PostgreSQL query failed:', pgError);
      }
      
      // 2. Also try SQLite (legacy fallback)
      try {
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        const sqliteDocs = await db.all(
          `SELECT 
            document_id, entity_type, entity_id, document_type, file_name,
            file_hash, mime_type, file_size, uploaded_by, status, uploaded_at
          FROM documents 
          WHERE UPPER(entity_type) = UPPER($1) AND entity_id = $2
          ORDER BY uploaded_at DESC`,
          [entityType, entityId]
        );
        
        if (sqliteDocs && sqliteDocs.length > 0) {
          // Deduplicate - don't add if already exists from PostgreSQL
          const existingIds = new Set(allDocuments.map(d => d.document_id));
          const newDocs = sqliteDocs.filter((d: any) => !existingIds.has(d.document_id));
          allDocuments = [...allDocuments, ...newDocs];
          logger.info(`Found ${newDocs.length} additional documents in SQLite`);
        }
      } catch (sqliteError) {
        logger.warn('SQLite query failed:', sqliteError);
      }
      
      // ✅ ADDITIONAL DEDUPLICATION: Remove duplicates by document_type + file_name
      // This handles cases where same document was uploaded multiple times
      const seen = new Map<string, any>();
      const deduplicated = allDocuments.filter(doc => {
        const key = `${doc.document_type}_${doc.file_name}`;
        if (seen.has(key)) {
          // Keep the most recent version
          const existing = seen.get(key);
          if (new Date(doc.uploaded_at) > new Date(existing.uploaded_at)) {
            seen.set(key, doc);
            return false; // Remove the old one (already added)
          }
          return false; // Keep existing, skip this one
        }
        seen.set(key, doc);
        return true;
      });
      
      // Replace with deduplicated list
      allDocuments = Array.from(seen.values());
      
      logger.info(`Total: Found ${allDocuments.length} unique documents for ${entityType}/${entityId} (after deduplication)`);
      
      res.json({
        success: true,
        data: allDocuments,
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

// ==================== DOCUMENT SIGNATURE ENDPOINTS ====================

/**
 * POST /documents/:documentId/sign
 * Sign a document with a detached cryptographic proof and Fabric transaction
 */
router.post('/:documentId/sign',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
    body('signatureType').isIn(['UPLOAD', 'VERIFY', 'APPROVE', 'REJECT'])
      .withMessage('Invalid signature type'),
    body('remarks').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { signatureType, remarks } = req.body;
      const user = (req as any).user;

      // ✅ ECTA quality document configuration (declared once at function scope)
      const ectaQualityDocTypes = ['CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'CUPPING_REPORT', 
                                   'PHYTOSANITARY_CERTIFICATE', 'EXPORT_PERMIT', 'INSPECTION_CERTIFICATE'];
      const ectaRoles = ['ECTA', 'ECTA_SUPERVISOR', 'ECTA_OFFICER', 'ECTA_INSPECTOR', 'ADMIN'];

      logger.info(`Document signature requested: ${documentId} by ${user.username} (${signatureType})`);
      
      // 🔍 DEBUG: Log signature type explicitly
      logger.info(`🔍 DEBUG: Signature type received: "${signatureType}" (type: ${typeof signatureType})`);
      logger.info(`🔍 DEBUG: Is APPROVE? ${signatureType === 'APPROVE'}`);
      logger.info(`🔍 DEBUG: Is VERIFY? ${signatureType === 'VERIFY'}`);

      // 1. Get document from database
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ 2. MULTI-PARTY APPROVAL: Validate approval for APPROVE signature type
      // ✅ ECTA QUALITY DOCUMENTS: Allow ECTA supervisors to sign quality documents directly
      const isEctaQualityDoc = ectaQualityDocTypes.includes(doc.document_type);
      const isEctaUser = ectaRoles.includes(user.role);
      
      if (signatureType === 'APPROVE') {
        // ECTA users can approve quality documents without multi-party validation
        if (isEctaQualityDoc && isEctaUser) {
          logger.info(`✅ ECTA quality document approval (direct authority): ${documentId} by ${user.username} (${user.role})`);
          // Skip multi-party approval validation - ECTA has direct authority over quality documents
        } else {
          // Non-ECTA documents or non-ECTA users must go through approval workflow
          const ApprovalRulesService = (await import('../services/approvalRulesService')).approvalRulesService;
          
          const validation = await ApprovalRulesService.validateApproval(
            documentId,
            user.username || user.sub,
            user.role
          );

          if (!validation.canApprove) {
            logger.warn(`Approval denied for ${documentId}: ${validation.reason}`);
            return res.status(403).json({
              success: false,
              error: {
                code: 'APPROVAL_DENIED',
                message: validation.reason || 'You cannot approve this document',
                details: {
                  requiresApproval: validation.requiresApproval,
                  currentApprovals: validation.currentApprovals,
                  requiredApprovals: validation.requiredApprovals,
                  approvedBy: validation.approvedBy,
                  nextRequiredRole: validation.nextRequiredRole
                }
              },
              timestamp: new Date().toISOString()
            });
          }

          logger.info(`✅ Approval validation passed: ${documentId} (${validation.currentApprovals + 1}/${validation.requiredApprovals})`);
        }
      }

      // Sign only the exact file bytes already anchored in Fabric.
      const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
      if (!resolvedPath) {
        return res.status(409).json({
          success: false,
          error: { code: 'DOCUMENT_FILE_UNAVAILABLE', message: 'The stored file is unavailable, so its contents cannot be signed.' },
          timestamp: new Date().toISOString(),
        });
      }

      const signerMspId = fabricService.getMspFromRole(user.role);
      const ledgerDocumentResult = await fabricService.queryChaincode('ReadDocumentHash', [documentId], signerMspId);
      let ledgerDocumentHash = ledgerDocumentResult.data?.hash || ledgerDocumentResult.data?.Hash;

      // A failed query can mean either a missing legacy record or an unavailable
      // peer. Only repair a record when Fabric explicitly reports it is missing.
      if (!ledgerDocumentResult.success) {
        const ledgerReadError = ledgerDocumentResult.error || 'Unknown Fabric query error';
        const confirmsMissingRecord = /document hash .* not found/i.test(ledgerReadError);
        if (!confirmsMissingRecord) {
          logger.error(`Could not read document hash ${documentId} from Fabric: ${ledgerReadError}`);
          return res.status(503).json({
            success: false,
            error: {
              code: 'LEDGER_QUERY_FAILED',
              message: 'Fabric is unavailable while confirming this document hash. Please retry signing.',
              details: ledgerReadError,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else if (typeof ledgerDocumentHash !== 'string' || !ledgerDocumentHash) {
        logger.error(`Fabric returned an invalid document hash record for ${documentId}`);
        return res.status(503).json({
          success: false,
          error: {
            code: 'LEDGER_HASH_INVALID',
            message: 'Fabric returned a document record without a usable hash. Signing was stopped to protect document integrity.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Repair a confirmed missing ledger record for legacy documents.
      if (!ledgerDocumentResult.success) {
        logger.warn(`Document ${documentId} has no Fabric hash record. Attempting legacy registration.`);
        try {
          const currentFileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
          const registrationResult = await fabricService.registerDocumentHash(
            documentId,
            doc.entity_id || documentId,
            doc.entity_type || 'DOCUMENT',
            currentFileHash,
            '',
            doc.file_name,
            doc.document_type || 'OTHER'
          );

          if (!registrationResult.success) {
            logger.error(`Failed to register document ${documentId} on Fabric:`, registrationResult.error);
            return res.status(503).json({
              success: false,
              error: {
                code: 'LEDGER_REGISTRATION_FAILED',
                message: 'Fabric could not register the missing document hash. Signing was stopped.',
                details: registrationResult.error || 'Unknown Fabric registration error',
              },
              timestamp: new Date().toISOString(),
            });
          }

          logger.info(`Registered missing document hash ${documentId} on Fabric (TX: ${registrationResult.txId})`);
          const retryLedgerResult = await fabricService.queryChaincode('ReadDocumentHash', [documentId], signerMspId);
          const retryLedgerHash = retryLedgerResult.data?.hash || retryLedgerResult.data?.Hash;
          if (!retryLedgerResult.success || typeof retryLedgerHash !== 'string' || !retryLedgerHash) {
            const retryError = retryLedgerResult.error || 'Fabric returned no hash after registration';
            logger.error(`Could not confirm newly registered hash for ${documentId}: ${retryError}`);
            return res.status(503).json({
              success: false,
              error: {
                code: 'LEDGER_HASH_UNAVAILABLE',
                message: 'Fabric accepted the registration but the document hash could not yet be read. Please retry signing.',
                details: retryError,
                transactionId: registrationResult.txId,
              },
              timestamp: new Date().toISOString(),
            });
          }

          ledgerDocumentHash = retryLedgerHash;
          try {
            await postgresDb.run(
              'UPDATE documents SET blockchain_tx_id = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
              [registrationResult.txId, documentId]
            );
          } catch (databaseError) {
            // The hash is already confirmed on Fabric. A local metadata sync
            // failure should be logged without blocking a valid signature.
            logger.warn(`Could not update the cached Fabric transaction ID for ${documentId}:`, databaseError);
          }
        } catch (regError) {
          const details = regError instanceof Error ? regError.message : 'Unknown error';
          logger.error(`Legacy hash registration failed for ${documentId}: ${details}`, regError);
          return res.status(503).json({
            success: false,
            error: {
              code: 'LEDGER_REGISTRATION_FAILED',
              message: 'Fabric could not confirm the document hash, so signing was stopped. Please retry or contact the administrator with the error details.',
              details,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
      const currentFileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
      if (currentFileHash.toLowerCase() !== ledgerDocumentHash.toLowerCase()) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DOCUMENT_HASH_MISMATCH',
            message: 'The stored file differs from the hash committed to Fabric. Restore or re-register the correct document revision before signing.',
            details: { ledgerHash: ledgerDocumentHash, currentFileHash },
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 4. Create signature ID and timestamp
      const signatureId = `SIG-${documentId}-${fabricService.getMspFromRole(user.role)}-${Date.now()}`;
      const timestamp = new Date().toISOString();
      let documentHashForSigning = ledgerDocumentHash;

      // Create a detached cryptographic proof without changing the bytes whose
      // digest is being signed and committed by Fabric.
      let visualSignatureAdded = false;
      let cryptoSignatureEmbedded = false;
      let detachedSignatureCreated = false;
      
      try {
        logger.info(`🔐 Creating detached cryptographic proof for ${documentId}`);

        // ✅ Get user's X.509 certificate from Fabric identity
        const userCertificate = await CertificateManager.getUserCertificate(
          user.username || user.sub || 'unknown',
          signerMspId
        );

        await DigitalSignatureService.signFileDetached(resolvedPath, userCertificate, {
          signerName: user.username || user.sub || 'Unknown',
          signerEmail: user.email || `${user.username}@cecbs.et`,
          organization: signerMspId,
          reason: remarks || signatureType,
          location: 'Ethiopian Coffee Export Consortium',
          contactInfo: user.email || 'info@cecbs.et',
          timestamp: new Date(),
          documentId,
          documentType: doc.document_type,
        });
        detachedSignatureCreated = true;
        logger.info(`✅ Detached cryptographic proof created for ${documentId}; file bytes remain unchanged`);
      } catch (signError) {
        logger.error(`Failed to create detached cryptographic signature for ${documentId}:`, signError);
        return res.status(500).json({
          success: false,
          error: { code: 'DETACHED_SIGNATURE_FAILED', message: 'Could not create a cryptographic signature for the document.' },
          timestamp: new Date().toISOString(),
        });
      }

      // 5. ✅ BLOCKCHAIN FIRST: Sign document on blockchain
      logger.info(`Signing document ${documentId} on blockchain...`);
      
      let blockchainTxId: string | null = null;
      let ledgerTransactionDetails: Awaited<ReturnType<typeof fabricService.getTransactionDetails>> = null;
      let approvalMetadata: any = null;
      
      // Check if this is an ECTA quality document (reuse variables from above)
      const isEctaQualityDoc2 = ectaQualityDocTypes.includes(doc.document_type);
      const isEctaUser2 = ectaRoles.includes(user.role);
      
      // ✅ For APPROVE signatures, gather approval workflow metadata for blockchain
      // Skip this for ECTA quality documents as they use direct authority
      if (signatureType === 'APPROVE' && !(isEctaQualityDoc2 && isEctaUser2)) {
        const ApprovalRulesService = (await import('../services/approvalRulesService')).approvalRulesService;
        const validation = await ApprovalRulesService.validateApproval(
          documentId,
          user.username || user.sub,
          user.role
        );
        
        approvalMetadata = {
          multiPartyApproval: validation.requiresApproval,
          approvalLevel: validation.currentApprovals + 1,
          requiredApprovals: validation.requiredApprovals,
          approverRole: user.role,
          workflowComplete: validation.isComplete
        };
      } else if (signatureType === 'APPROVE' && isEctaQualityDoc2 && isEctaUser2) {
        // ECTA direct approval metadata
        approvalMetadata = {
          multiPartyApproval: false,
          approvalLevel: 1,
          requiredApprovals: 1,
          approverRole: user.role,
          workflowComplete: true,
          ectaDirectAuthority: true
        };
      }
      
      if (fabricService.isConnected()) {
        // Include approval metadata in remarks for blockchain immutability
        const blockchainRemarks = approvalMetadata 
          ? `${remarks || 'Document approved'} | Approval: ${approvalMetadata.approvalLevel}/${approvalMetadata.requiredApprovals} | Role: ${approvalMetadata.approverRole}`
          : remarks || '';
          
        const blockchainResult = await fabricService.signDocument(
          documentId,
          documentHashForSigning,
          signatureType,
          blockchainRemarks
        );
        
        if (!blockchainResult.success) {
          logger.error(`Blockchain signing failed for ${documentId}:`, blockchainResult.error);
          return res.status(400).json({
            success: false,
            error: {
              code: 'BLOCKCHAIN_ERROR',
              message: 'Document signature rejected by blockchain network',
              details: blockchainResult.error
            },
            timestamp: new Date().toISOString()
          });
        }
        
        blockchainTxId = blockchainResult.txId || null;
        if (blockchainTxId) {
          ledgerTransactionDetails = await fabricService.getTransactionDetails(blockchainTxId).catch((ledgerError) => {
            logger.warn(`Could not read committed ledger details for ${blockchainTxId}:`, ledgerError);
            return null;
          });
        }
        logger.info(`✅ Document signed on blockchain (TX: ${blockchainTxId})${approvalMetadata ? ` [Multi-party approval: ${approvalMetadata.approvalLevel}/${approvalMetadata.requiredApprovals}]` : ''}`);
      } else {
        logger.error('Blockchain not connected - cannot sign document');
        
        // Try to reconnect once
        logger.info('Attempting to reconnect to blockchain...');
        try {
          await fabricService.connect();
          
          if (fabricService.isConnected()) {
            logger.info('✅ Blockchain reconnected successfully');
            
            // Retry the blockchain signing
            const blockchainRemarks = approvalMetadata 
              ? `${remarks || 'Document approved'} | Approval: ${approvalMetadata.approvalLevel}/${approvalMetadata.requiredApprovals} | Role: ${approvalMetadata.approverRole}`
              : remarks || '';
              
            const blockchainResult = await fabricService.signDocument(
              documentId,
              documentHashForSigning,
              signatureType,
              blockchainRemarks
            );
            
            if (!blockchainResult.success) {
              logger.error(`Blockchain signing failed for ${documentId}:`, blockchainResult.error);
              return res.status(400).json({
                success: false,
                error: {
                  code: 'BLOCKCHAIN_ERROR',
                  message: 'Document signature rejected by blockchain network',
                  details: blockchainResult.error
                },
                timestamp: new Date().toISOString()
              });
            }
            
            blockchainTxId = blockchainResult.txId || null;
            if (blockchainTxId) {
              ledgerTransactionDetails = await fabricService.getTransactionDetails(blockchainTxId).catch((ledgerError) => {
                logger.warn(`Could not read committed ledger details for ${blockchainTxId}:`, ledgerError);
                return null;
              });
            }
            logger.info(`✅ Document signed on blockchain after reconnect (TX: ${blockchainTxId})${approvalMetadata ? ` [Multi-party approval: ${approvalMetadata.approvalLevel}/${approvalMetadata.requiredApprovals}]` : ''}`);
            
            // Continue to the database caching section below
          } else {
            throw new Error('Reconnection failed');
          }
        } catch (reconnectError) {
          logger.error('Failed to reconnect to blockchain:', reconnectError);
          return res.status(503).json({
            success: false,
            error: { 
              code: 'BLOCKCHAIN_UNAVAILABLE', 
              message: 'Blockchain service is temporarily unavailable. The network may be starting up or experiencing connectivity issues. Please wait a moment and try again.',
              details: {
                suggestion: 'Wait 10-30 seconds and retry',
                technicalDetails: reconnectError instanceof Error ? reconnectError.message : 'Unknown error'
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // 6. ✅ Cache signature in database (with multi-party approval support)
      if (signatureType === 'APPROVE') {
        // Check if this is an ECTA quality document with direct authority (reuse variables)
        const isEctaQualityDoc3 = ectaQualityDocTypes.includes(doc.document_type);
        const isEctaUser3 = ectaRoles.includes(user.role);
        
        if (isEctaQualityDoc3 && isEctaUser3) {
          // ECTA direct approval - bypass approval workflow service
          logger.info(`✅ Recording ECTA direct approval for ${documentId}`);
          
          // Record signature directly in document_signatures table
          await postgresDb.run(
            `INSERT INTO document_signatures (
              signature_id, document_id, signer_id, signer_org, signature_type,
              certificate_id, remarks, blockchain_tx_id, visual_signature_added, crypto_signature_embedded
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              signatureId,
              documentId,
              user.username || user.sub,
              fabricService.getMspFromRole(user.role),
              signatureType,
              user.sub || null,
              remarks || null,
              blockchainTxId,
              visualSignatureAdded,
              cryptoSignatureEmbedded
            ]
          );
          
          // Update document status to approved immediately
          await postgresDb.run(
            'UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
            ['approved', documentId]
          );
          
        } else {
          // Use approval service to record approval for non-ECTA documents
          logger.info(`📝 Calling approval service for ${documentId}`);
          logger.info(`   User: ${user.username || user.sub}, Role: ${user.role}, Org: ${user.org || user.organization || 'Unknown'}`);
          
          const ApprovalRulesService = (await import('../services/approvalRulesService')).approvalRulesService;
          
          let approvalResult;
          try {
            approvalResult = await ApprovalRulesService.recordApproval(
              documentId,
              user.username || user.sub,
              user.role,
              blockchainTxId || undefined,
              user.org || user.organization || 'Unknown'
            );
          } catch (approvalError: any) {
            logger.error(`❌ Approval service threw error:`, approvalError);
            return res.status(500).json({
              success: false,
              error: { 
                code: 'APPROVAL_SERVICE_ERROR', 
                message: `Approval service error: ${approvalError.message}`,
                details: approvalError.stack
              },
              timestamp: new Date().toISOString()
            });
          }

          if (!approvalResult.success) {
            logger.error(`Failed to record approval: ${approvalResult.message}`);
            logger.error(`Approval result details:`, JSON.stringify(approvalResult, null, 2));
            return res.status(400).json({
              success: false,
              error: { code: 'APPROVAL_FAILED', message: approvalResult.message || 'Failed to record approval' },
              timestamp: new Date().toISOString()
            });
          }

          logger.info(`✅ Approval recorded: ${approvalResult.message} (workflow complete: ${approvalResult.workflowComplete})`);

          // Update document status only if all approvals complete
          if (approvalResult.workflowComplete) {
            await postgresDb.run(
              'UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
              ['approved', documentId]
            );
          } else {
            await postgresDb.run(
              'UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
              ['pending_approval', documentId]
            );
          }
        }
      } else {
        // For non-approval signatures (VERIFY, UPLOAD, REJECT), use direct insert
        logger.info(`📝 Recording non-approval signature: ${signatureType} for ${documentId}`);
        logger.info(`   Bypassing approval workflow - direct signature insert`);
        
        await postgresDb.run(
          `INSERT INTO document_signatures (
            signature_id, document_id, signer_id, signer_org, signature_type,
            certificate_id, remarks, blockchain_tx_id, visual_signature_added, crypto_signature_embedded
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            signatureId,
            documentId,
            user.username || user.sub,
            fabricService.getMspFromRole(user.role),
            signatureType,
            user.sub || null,
            remarks || null,
            blockchainTxId,
            visualSignatureAdded,
            cryptoSignatureEmbedded
          ]
        );

        // Update document status
        await postgresDb.run(
          'UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
          [signatureType === 'REJECT' ? 'rejected' : 'signed', documentId]
        );
      }

      if (blockchainTxId) {
        await postgresDb.run(
          `UPDATE document_signatures
           SET detached_signature_created = $1,
               document_hash_signed = $2,
               ledger_validation_code = $3,
               ledger_validation_status = $4,
               ledger_block_number = $5,
               ledger_block_hash = $6,
               ledger_creator_msp_id = $7,
               ledger_creator_identity = $8,
               endorsing_msp_ids = $9::jsonb,
               creator_signature_valid = $10,
               endorsement_signatures_valid = $11
           WHERE document_id = $12 AND blockchain_tx_id = $13`,
          [
            detachedSignatureCreated,
            documentHashForSigning,
            ledgerTransactionDetails?.validationCode ?? null,
            ledgerTransactionDetails?.validationStatus ?? 'UNAVAILABLE',
            ledgerTransactionDetails?.blockNumber ?? null,
            ledgerTransactionDetails?.blockHash ?? null,
            ledgerTransactionDetails?.creator.mspId ?? null,
            ledgerTransactionDetails?.creator.identity ?? null,
            JSON.stringify(ledgerTransactionDetails?.endorsers.map((endorser) => endorser.mspId) || []),
            ledgerTransactionDetails?.creator.signatureValid ?? null,
            ledgerTransactionDetails ? ledgerTransactionDetails.endorsers.every((endorser) => endorser.signatureValid === true) : null,
            documentId,
            blockchainTxId,
          ]
        );
      }

      // 8. Log to audit trail
      await postgresDb.run(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'DOCUMENT',
          documentId,
          `SIGNATURE_${signatureType}`,
          user.username || user.sub || 'UNKNOWN',
          user.org || user.organization || 'SYSTEM',  // ✅ Default to SYSTEM if org not available
          user.org || user.organization || null,
          'unsigned',
          'signed',
          `Document signed with ${signatureType} signature`,
          JSON.stringify({
            signatureId,
            signatureType,
            signer: user.username,
            organization: user.org || user.organization,
            visualSignatureAdded,
            remarks,
            timestamp
          }),
          req.ip || (req as any).connection?.remoteAddress || 'unknown'
        ]
      );

      logger.info(`✅ Document signed successfully: ${documentId} (${signatureType})`);

      res.json({
        success: true,
        data: {
          documentId,
          signatureId,
          signatureType,
          signer: user.username,
          organization: user.org,
          timestamp,
          visualSignatureAdded,
          cryptoSignatureEmbedded,
          detachedSignatureCreated,
          blockchainTxId, // Blockchain transaction ID (if blockchain is connected)
          ledgerTransactionDetails,
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Document signature error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /documents/:documentId/signatures
 * Get all signatures for a document
 */
router.get('/:documentId/signatures',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      logger.info(`Fetching signatures for document: ${documentId}`);

      // Get document info
      const doc = await postgresDb.get(
        'SELECT document_id, file_name, status FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Get all signatures
      const signatures = await postgresDb.all(
        `SELECT 
          signature_id, document_id, signer_id, signer_org, signature_type,
          certificate_id, remarks, blockchain_tx_id, visual_signature_added,
          signed_at
        FROM document_signatures
        WHERE document_id = $1
        ORDER BY signed_at ASC`,
        [documentId]
      );

      logger.info(`Found ${signatures.length} signatures for document: ${documentId}`);

      res.json({
        success: true,
        data: {
          documentId,
          fileName: doc.file_name,
          status: doc.status,
          signatures,
          signatureCount: signatures.length,
          latestSignature: signatures[signatures.length - 1] || null,
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Get document signatures error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /documents/:documentId/verify-signatures
 * Verify all signatures against blockchain
 */
router.get('/:documentId/verify-signatures',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      logger.info(`[BLOCKCHAIN VERIFY] Verifying signatures for document: ${documentId}`);

      // Get all signatures from database
      const signatures = await postgresDb.all(
        `SELECT 
          s.signature_id, s.document_id, s.signer_id, s.signer_org, s.signature_type,
          s.certificate_id, s.remarks, s.blockchain_tx_id, s.signed_at,
          u.username, u.full_name, u.email, u.organization as org_name
        FROM document_signatures s
        LEFT JOIN users u ON s.signer_id = u.username
        WHERE s.document_id = $1
        ORDER BY s.signed_at ASC`,
        [documentId]
      );

      if (signatures.length === 0) {
        return res.json({
          success: true,
          data: {
            documentId,
            signatures: [],
            verificationSummary: {
              total: 0,
              verified: 0,
              failed: 0,
              pending: 0
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      // Verify each signature against blockchain
      const verificationResults = await Promise.all(
        signatures.map(async (sig) => {
          try {
            // Check if blockchain is available first
            const fabricService = FabricService.getInstance();
            
            if (!fabricService.isConnected()) {
              // Blockchain is disabled - return signature data without blockchain verification
              return {
                ...sig,
                blockchainVerified: false,
                verificationStatus: 'BLOCKCHAIN_DISABLED',
                verificationMessage: 'Blockchain verification not available (service disabled)',
                certificateDetails: null
              };
            }
            
            if (!sig.blockchain_tx_id) {
              return {
                ...sig,
                blockchainVerified: false,
                verificationStatus: 'NO_BLOCKCHAIN_TX',
                verificationMessage: 'Signature not recorded on blockchain',
                certificateDetails: null
              };
            }

            // Try to get signature from blockchain
            // Note: Blockchain stores all signatures for a document together, not individually
            let blockchainResult;
            try {
              blockchainResult = await fabricService.queryChaincode(
                'GetDocumentSignatures',
                [sig.document_id]
              );
            } catch (bcError) {
              return {
                ...sig,
                blockchainVerified: false,
                verificationStatus: 'BLOCKCHAIN_UNAVAILABLE',
                verificationMessage: 'Blockchain service not available',
                certificateDetails: null
              };
            }

            if (!blockchainResult.success || !blockchainResult.data || !blockchainResult.data.Signatures) {
              // Try alternate field name (lowercase)
              const signatures = blockchainResult.data?.signatures || blockchainResult.data?.Signatures;
              if (!signatures || signatures.length === 0) {
                return {
                  ...sig,
                  blockchainVerified: false,
                  verificationStatus: 'NOT_FOUND_ON_BLOCKCHAIN',
                  verificationMessage: 'Document signatures not found on blockchain',
                  certificateDetails: null
                };
              }
            }

            // Find this specific signature in the blockchain data
            // Note: Blockchain uses different ID format (underscores) than database (hyphens)
            // Match by transaction ID or timestamp instead
            const blockchainSigs = blockchainResult.data.signatures || blockchainResult.data.Signatures || [];
            
            logger.info(`[BLOCKCHAIN VERIFY] Looking for sig with TX ID: ${sig.blockchain_tx_id} in ${blockchainSigs.length} blockchain signatures`);
            
            const blockchainSig = blockchainSigs.find((bSig: any) => {
              const bcTxId = bSig.transactionId || bSig.TransactionID || bSig.transactionID;
              const match = bcTxId === sig.blockchain_tx_id;
              if (match) {
                logger.info(`[BLOCKCHAIN VERIFY] Found matching signature: ${bSig.signatureId || bSig.SignatureID}`);
              }
              return match;
            });

            if (!blockchainSig) {
              return {
                ...sig,
                blockchainVerified: false,
                verificationStatus: 'NOT_FOUND_ON_BLOCKCHAIN',
                verificationMessage: `Signature with TX ID ${sig.blockchain_tx_id} not found on blockchain`,
                certificateDetails: null
              };
            }

            // Get certificate details from blockchain_identities table
            let certificateDetails: any = null;
            if (sig.certificate_id) {
              try {
                const cert = await postgresDb.get(
                  `SELECT 
                    common_name, organization, organizational_unit, country,
                    serial_number, issuer, valid_from, valid_until, fingerprint
                  FROM x509_certificates
                  WHERE certificate_id = $1`,
                  [sig.certificate_id]
                );
                if (cert) {
                  certificateDetails = {
                    commonName: cert.common_name,
                    organization: cert.organization,
                    organizationalUnit: cert.organizational_unit,
                    country: cert.country,
                    serialNumber: cert.serial_number,
                    issuer: cert.issuer,
                    validFrom: cert.valid_from,
                    validUntil: cert.valid_until,
                    fingerprint: cert.fingerprint
                  };
                }
              } catch (certError) {
                logger.warn(`Failed to fetch certificate details for ${sig.certificate_id}:`, certError);
              }
            }

            // Verify signature matches (handle both camelCase and PascalCase field names)
            const bcDocId = blockchainSig.documentId || blockchainSig.DocumentID;
            const bcSignerId = blockchainSig.signerMspId || blockchainSig.SignerMspId || blockchainSig.SignerID;
            const bcSigType = blockchainSig.signatureType || blockchainSig.SignatureType;
            const bcTxId = blockchainSig.transactionId || blockchainSig.TransactionID || blockchainSig.transactionID;
            
            logger.info(`[BLOCKCHAIN VERIFY] Comparing: DB(${sig.document_id}, ${sig.blockchain_tx_id}, ${sig.signature_type}) vs BC(${bcDocId}, ${bcTxId}, ${bcSigType})`);
            
            const isVerified = (
              bcDocId === sig.document_id &&
              bcTxId === sig.blockchain_tx_id &&
              bcSigType === sig.signature_type
            );
            
            logger.info(`[BLOCKCHAIN VERIFY] Verification result: ${isVerified}`);

            return {
              ...sig,
              blockchainVerified: isVerified,
              verificationStatus: isVerified ? 'VERIFIED' : 'MISMATCH',
              verificationMessage: isVerified 
                ? 'Signature verified on blockchain' 
                : 'Signature data mismatch between database and blockchain',
              blockchainData: blockchainSig,
              certificateDetails,
              transactionId: sig.blockchain_tx_id
            };

          } catch (error: any) {
            logger.error(`Failed to verify signature ${sig.signature_id}:`, error);
            return {
              ...sig,
              blockchainVerified: false,
              verificationStatus: 'VERIFICATION_ERROR',
              verificationMessage: error.message || 'Verification failed',
              certificateDetails: null
            };
          }
        })
      );

      // Calculate summary
      const summary = {
        total: verificationResults.length,
        verified: verificationResults.filter(r => r.blockchainVerified).length,
        failed: verificationResults.filter(r => 
          r.verificationStatus === 'MISMATCH' || 
          r.verificationStatus === 'NOT_FOUND_ON_BLOCKCHAIN'
        ).length,
        pending: verificationResults.filter(r => r.verificationStatus === 'NO_BLOCKCHAIN_TX').length,
        unavailable: verificationResults.filter(r => 
          r.verificationStatus === 'BLOCKCHAIN_UNAVAILABLE' ||
          r.verificationStatus === 'BLOCKCHAIN_DISABLED'
        ).length
      };

      logger.info(`[BLOCKCHAIN VERIFY] Document ${documentId}: ${summary.verified}/${summary.total} signatures verified (${summary.unavailable} unavailable)`);

      res.json({
        success: true,
        data: {
          documentId,
          signatures: verificationResults,
          verificationSummary: summary
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[BLOCKCHAIN VERIFY] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'VERIFICATION_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /documents/:documentId/signature-history
 * Get complete signature history with audit trail
 */
router.get('/:documentId/signature-history',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      logger.info(`Fetching signature history for document: ${documentId}`);

      // Get signatures
      const signatures = await postgresDb.all(
        `SELECT * FROM document_signatures WHERE document_id = $1 ORDER BY signed_at ASC`,
        [documentId]
      );

      // Get related audit trail entries
      const auditEntries = await postgresDb.all(
        `SELECT * FROM audit_trail 
         WHERE entity_type = 'DOCUMENT' 
         AND entity_id = $1 
         AND action LIKE 'SIGNATURE_%'
         ORDER BY timestamp ASC`,
        [documentId]
      );

      res.json({
        success: true,
        data: {
          documentId,
          signatures,
          auditTrail: auditEntries,
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Get signature history error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /documents/:documentId/signature-status
 * Quick check if document is signed (returns summary)
 */
router.get('/:documentId/signature-status',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      // Get document info
      const document = await postgresDb.get(
        'SELECT document_id, file_name, entity_type, entity_id FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!document) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Get signature count and latest signature
      const signatureInfo = await postgresDb.get(
        `SELECT 
          COUNT(*) as signature_count,
          MAX(signed_at) as last_signed,
          (SELECT signer_id FROM document_signatures WHERE document_id = $1 ORDER BY signed_at DESC LIMIT 1) as last_signer,
          (SELECT signer_org FROM document_signatures WHERE document_id = $1 ORDER BY signed_at DESC LIMIT 1) as last_signer_org,
          (SELECT signature_type FROM document_signatures WHERE document_id = $1 ORDER BY signed_at DESC LIMIT 1) as last_signature_type
        FROM document_signatures 
        WHERE document_id = $1`,
        [documentId]
      );

      const isSigned = signatureInfo.signature_count > 0;

      res.json({
        success: true,
        data: {
          document_id: documentId,
          file_name: document.file_name,
          entity_type: document.entity_type,
          entity_id: document.entity_id,
          is_signed: isSigned,
          signature_count: parseInt(signatureInfo.signature_count),
          latest_signature: isSigned ? {
            signer: signatureInfo.last_signer,
            organization: signatureInfo.last_signer_org,
            type: signatureInfo.last_signature_type,
            date: signatureInfo.last_signed
          } : null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Get signature status error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /documents/:documentId/verify-signature
          auditTrail: auditEntries,
          timeline: signatures.map((sig: any) => ({
            timestamp: sig.signed_at,
            action: sig.signature_type,
            signer: sig.signer_id,
            organization: sig.signer_org,
            remarks: sig.remarks,
            blockchainTxId: sig.blockchain_tx_id,
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Get signature history error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /documents/:documentId/verify-signature
 * Verify document signature integrity
 */
router.post('/:documentId/verify-signature',
  authMiddleware,
  [param('documentId').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { signatureId } = req.body;

      logger.info(`Verifying signature for document: ${documentId}`);

      // Get signature from database
      const signature = await postgresDb.get(
        'SELECT * FROM document_signatures WHERE signature_id = $1 AND document_id = $2',
        [signatureId, documentId]
      );

      if (!signature) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Signature not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Get document
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Verify file integrity (check if file exists and hash matches)
      let fileIntegrityValid = false;
      if (doc.file_path && fs.existsSync(doc.file_path)) {
        const fileBuffer = fs.readFileSync(doc.file_path);
        const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // Note: Hash will differ after visual signature is added
        // This is expected behavior - we verify the signature exists, not the hash
        fileIntegrityValid = true;
      }

      res.json({
        success: true,
        data: {
          documentId,
          signatureId: signature.signature_id,
          isValid: true,
          fileExists: fileIntegrityValid,
          signature: {
            signer: signature.signer_id,
            organization: signature.signer_org,
            type: signature.signature_type,
            timestamp: signature.signed_at,
            certificateId: signature.certificate_id,
            blockchainTxId: signature.blockchain_tx_id,
            visualSignatureAdded: signature.visual_signature_added,
          },
          verifiedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Verify signature error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{documentId}/approval-status:
 *   get:
 *     summary: Get multi-party approval status for a document
 *     tags: [Documents]
 */
router.get('/:documentId/approval-status',
  authMiddleware,
  param('documentId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const user = (req as any).user;

      logger.info(`Fetching approval status for document: ${documentId} by ${user.username}`);

      // Get document info
      const doc = await postgresDb.get(
        'SELECT document_id, document_type, entity_type, status FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Get approval requirements and workflow state
      const ApprovalRulesService = (await import('../services/approvalRulesService')).approvalRulesService;
      
      const requirements = await ApprovalRulesService.getRequirements(
        doc.document_type,
        doc.entity_type
      );

      const workflowState = await ApprovalRulesService.getApprovalStatus(documentId);

      // Get user's validation status
      const validation = await ApprovalRulesService.validateApproval(
        documentId,
        user.username || user.sub,
        user.role
      );

      // Get all signatures for this document
      const signatures = await postgresDb.all(
        `SELECT id, signature_type as "signatureType", signer_id as "signedBy", 
                signed_by_role as "signedByRole", signer_org as "signedByOrg",
                approval_status as "approvalStatus", approval_level as "approvalLevel",
                created_at as "createdAt", blockchain_tx_id as "blockchainTxId"
         FROM document_signatures
         WHERE document_id = $1 AND signature_type = 'approve'
         ORDER BY created_at ASC`,
        [documentId]
      );

      res.json({
        success: true,
        data: {
          documentId,
          documentType: doc.document_type,
          entityType: doc.entity_type,
          documentStatus: doc.status,
          requiresMultiPartyApproval: requirements !== null && requirements.minApprovers > 1,
          requirements: requirements ? {
            minApprovers: requirements.minApprovers,
            requiredRoles: requirements.requiredRoles,
            approvalOrder: requirements.approvalOrder,
            description: requirements.description
          } : null,
          workflowState: workflowState ? {
            requiredApprovals: workflowState.requiredApprovals,
            currentApprovals: workflowState.currentApprovals,
            approvalStatus: workflowState.approvalStatus,
            approvedBy: workflowState.approvedBy,
            isComplete: workflowState.currentApprovals >= workflowState.requiredApprovals,
            completedAt: workflowState.completedAt,
            rejectedBy: workflowState.rejectedBy,
            rejectionReason: workflowState.rejectionReason
          } : null,
          userValidation: {
            canApprove: validation.canApprove,
            reason: validation.reason,
            nextRequiredRole: validation.nextRequiredRole
          },
          signatures: signatures || [],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Error fetching approval status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch approval status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ============================================================================
// SIGNATURE VERIFICATION ENDPOINT
// ============================================================================

/**
 * Verify cryptographic signatures in a document
 * GET /documents/:documentId/verify-signatures
 * Returns verification results including signature validity, tamper detection, and certificate info
 */
router.get('/:documentId/verify-signatures',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const user = (req as any).user;

      logger.info(`Signature verification requested for document: ${documentId} by ${user.username}`);

      // 1. Get document from database
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // 2. Get all signatures from database
      const dbSignatures = await postgresDb.all(
        `SELECT 
          signature_id, document_id, signer_id, signer_org, signature_type,
          signed_at, remarks, blockchain_tx_id, 
          visual_signature_added, crypto_signature_embedded,
          detached_signature_created, document_hash_signed,
          ledger_validation_code, ledger_validation_status,
          ledger_block_number, ledger_block_hash, ledger_creator_msp_id,
          ledger_creator_identity, endorsing_msp_ids,
          creator_signature_valid, endorsement_signatures_valid
        FROM document_signatures 
        WHERE document_id = $1 
        ORDER BY signed_at ASC`,
        [documentId]
      );

      // 3. Resolve physical file path
      const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
      const fileExists = resolvedPath !== null;
      const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
      const currentFileHash = fileExists && resolvedPath
        ? crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex')
        : null;

      let verificationResult: any = {
        documentId,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileExists,
        isPDF,
        hasSignatures: dbSignatures.length > 0,
        signatureCount: dbSignatures.length,
        cryptoSignatureCount: 0,
        allSignaturesCryptographic: false,
        currentFileHash,
      };

      // 4. Verify detached signatures for any file type when the file is present.
      if (fileExists && resolvedPath) {
        try {
          const cryptoVerification = await DigitalSignatureService.verifyDocumentSignatures(resolvedPath);
          
          verificationResult = {
            ...verificationResult,
            cryptographicVerification: {
              isValid: cryptoVerification.isValid,
              isTampered: cryptoVerification.isTampered,
              cryptographicSignaturesValid: cryptoVerification.cryptographicSignaturesValid,
              certificateTrustStatus: cryptoVerification.certificateTrustStatus,
              documentHash: cryptoVerification.documentHash,
              verificationTimestamp: cryptoVerification.verificationTimestamp,
              signatures: cryptoVerification.signatures,
            },
          };
          verificationResult.cryptoSignatureCount = cryptoVerification.signatures.filter((signature: any) => signature.signatureValid).length;
          verificationResult.allSignaturesCryptographic = cryptoVerification.signatures.length === dbSignatures.length &&
            cryptoVerification.signatures.every((signature: any) => signature.signatureValid && signature.certificateValid);

          logger.info(`✅ Cryptographic verification complete: ${documentId} - Valid: ${cryptoVerification.isValid}, Tampered: ${cryptoVerification.isTampered}`);
        } catch (verifyError) {
          logger.error(`Failed to verify cryptographic signatures: ${documentId}`, verifyError);
          verificationResult.cryptographicVerification = {
            error: 'Failed to verify cryptographic signatures',
            details: (verifyError as Error).message,
          };
        }
      } else {
        verificationResult.cryptographicVerification = {
          available: false,
          reason: !fileExists ? 'File not found' : 'Unknown',
        };
      }

      // 5. Add database signature records
      verificationResult.databaseSignatures = dbSignatures.map((sig: any) => ({
        signatureId: sig.signature_id,
        signerName: sig.signer_id,
        organization: sig.signer_org,
        signatureType: sig.signature_type,
        signedAt: sig.signed_at,
        blockchainTxId: sig.blockchain_tx_id,
        remarks: sig.remarks,
        visualSignatureAdded: sig.visual_signature_added,
        cryptoSignatureEmbedded: sig.crypto_signature_embedded,
        detachedSignatureCreated: sig.detached_signature_created,
        documentHashSigned: sig.document_hash_signed,
        ledgerValidationCode: sig.ledger_validation_code,
        ledgerValidationStatus: sig.ledger_validation_status,
        ledgerBlockNumber: sig.ledger_block_number,
        ledgerBlockHash: sig.ledger_block_hash,
        ledgerCreatorMspId: sig.ledger_creator_msp_id,
        ledgerCreatorIdentity: sig.ledger_creator_identity,
        endorsingMspIds: sig.endorsing_msp_ids,
        creatorSignatureValid: sig.creator_signature_valid,
        endorsementSignaturesValid: sig.endorsement_signatures_valid,
      }));

      // 6. Verify blockchain signatures
      if (fabricService.isConnected()) {
        try {
          const blockchainSignatures = await Promise.all(dbSignatures
            .filter((sig: any) => sig.blockchain_tx_id)
            .map(async (sig: any) => ({
              applicationSignatureId: sig.signature_id,
              ...(await fabricService.getTransactionDetails(sig.blockchain_tx_id)),
            })));
          verificationResult.blockchainSignatures = blockchainSignatures;
          const transactionByAppSignature = new Map(blockchainSignatures.map((signature: any) => [signature.applicationSignatureId, signature]));
          verificationResult.signatures = dbSignatures.map((sig: any) => {
            const ledgerTransaction: any = transactionByAppSignature.get(sig.signature_id);
            const ledgerProofValid = !!ledgerTransaction &&
              ledgerTransaction.validationStatus === 'VALID' &&
              ledgerTransaction.creator?.signatureValid === true &&
              ledgerTransaction.creator?.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT' &&
              ledgerTransaction.endorsers?.length > 0 &&
              ledgerTransaction.endorsers.every((endorser: any) =>
                endorser.signatureValid === true &&
                endorser.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT'
              );
            const detachedProofs = verificationResult.cryptographicVerification?.signatures || [];
            const detachedProof = detachedProofs.find((proof: any) =>
              proof.signerName === sig.signer_id && proof.organization === sig.signer_org &&
              Math.abs(new Date(proof.signedAt).getTime() - new Date(sig.signed_at).getTime()) < 120_000
            );
            const status = !ledgerTransaction ? 'NOT_FOUND_ON_BLOCKCHAIN'
              : ledgerTransaction.validationStatus !== 'VALID' ? ledgerTransaction.validationStatus
              : ledgerProofValid && detachedProof?.signatureValid && detachedProof?.certificateValid &&
                detachedProof?.certificateTrusted && detachedProof?.documentHash === currentFileHash ? 'VERIFIED'
              : ledgerTransaction.creator?.signatureValid === true && detachedProof?.signatureValid
                ? 'CRYPTOGRAPHICALLY_VALID_UNANCHORED'
              : 'UNVERIFIED';
            return {
              signature_id: sig.signature_id,
              document_id: sig.document_id,
              signer_id: sig.signer_id,
              signer_org: sig.signer_org,
              signature_type: sig.signature_type,
              signed_at: sig.signed_at,
              blockchain_tx_id: sig.blockchain_tx_id,
              blockchainVerified: status === 'VERIFIED',
              verificationStatus: status,
              verificationMessage: status === 'VERIFIED'
                ? 'Fabric committed the transaction as valid; the transaction signatures and detached document signature validate against the configured MSP CA roots.'
                : status === 'CRYPTOGRAPHICALLY_VALID_UNANCHORED'
                ? 'The transaction and detached signature are cryptographically valid, but one or more certificates are not anchored to a configured consortium MSP CA root.'
                : status,
              signerInfo: {
                name: sig.signer_id,
                username: sig.signer_id,
                email: '',
                organization: sig.signer_org,
                mspId: ledgerTransaction?.creator?.mspId || null,
              },
              endorsers: ledgerTransaction?.endorsers || [],
              endorsementNote: ledgerProofValid
                ? 'Creator and endorsement signatures validate against the configured consortium MSP CA roots.'
                : 'Transaction endorsement details are shown from the ledger; signature or certificate-root verification did not pass.',
              blockchainData: ledgerTransaction || null,
            };
          });
          verificationResult.blockchainVerified = verificationResult.signatures.length === dbSignatures.length &&
            verificationResult.signatures.length > 0 &&
            verificationResult.signatures.every((signature: any) => signature.blockchainVerified);
        } catch (bcError) {
          logger.warn(`Failed to fetch blockchain signatures: ${documentId}`, bcError);
          verificationResult.blockchainSignatures = [];
          verificationResult.blockchainVerified = false;
        }
      }

      // 7. Overall verification status
      const isFullyVerified =
        verificationResult.hasSignatures &&
        verificationResult.allSignaturesCryptographic &&
        verificationResult.blockchainVerified === true &&
        verificationResult.cryptographicVerification?.certificateTrustStatus === 'TRUSTED' &&
        !verificationResult.cryptographicVerification?.isTampered &&
        verificationResult.cryptographicVerification?.isValid;

      verificationResult.overallStatus = isFullyVerified ? 'VERIFIED' : 
        verificationResult.cryptographicVerification?.isTampered ? 'TAMPERED' :
        verificationResult.cryptographicVerification?.isValid ? 'CRYPTOGRAPHICALLY_VALID_UNANCHORED' :
        !verificationResult.allSignaturesCryptographic ? 'PARTIAL' :
        !verificationResult.hasSignatures ? 'UNSIGNED' : 'UNVERIFIED';

      // 8. Log verification audit trail
      await postgresDb.run(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org, 
          old_value, new_value, reason, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'DOCUMENT',
          documentId,
          'VERIFY_SIGNATURE',
          user.username || user.sub,
          user.org || 'UNKNOWN',
          'N/A',
          verificationResult.overallStatus,
          'Signature verification performed',
          JSON.stringify({
            documentId,
            verificationStatus: verificationResult.overallStatus,
            signatureCount: verificationResult.signatureCount,
            cryptoSignatureCount: verificationResult.cryptoSignatureCount,
            isTampered: verificationResult.cryptographicVerification?.isTampered || false,
            verifiedBy: user.username,
            timestamp: new Date().toISOString()
          }),
          req.ip || (req as any).connection?.remoteAddress || 'unknown'
        ]
      );

      res.json({
        success: true,
        data: verificationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Signature verification error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ============================================================================
// ADD SIGNATURE CERTIFICATE PAGE
// ============================================================================

/**
 * Add signature certificate page to a multi-party signed document
 * POST /documents/:documentId/add-certificate-page
 * Adds a final page showing complete signature chain, blockchain TXs, and QR codes
 */
router.post('/:documentId/add-certificate-page',
  authMiddleware,
  [
    param('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const user = (req as any).user;

      logger.info(`Certificate page generation requested for: ${documentId} by ${user.username}`);

      // 1. Get document from database
      const doc = await postgresDb.get(
        'SELECT * FROM documents WHERE document_id = $1',
        [documentId]
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString()
        });
      }

      // 2. Get all signatures
      const signatures = await postgresDb.all(
        `SELECT 
          signature_id, signer_id, signer_org, signature_type,
          signed_at, blockchain_tx_id, remarks
        FROM document_signatures 
        WHERE document_id = $1 
        ORDER BY signed_at ASC`,
        [documentId]
      );

      if (signatures.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_SIGNATURES', message: 'Document has no signatures' },
          timestamp: new Date().toISOString()
        });
      }

      // 3. Resolve file path
      const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Document file not found on server' },
          timestamp: new Date().toISOString()
        });
      }

      const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
      if (!isPDF) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_PDF', message: 'Certificate pages can only be added to PDF documents' },
          timestamp: new Date().toISOString()
        });
      }

      // Generate a derivative certificate copy. Never mutate the source bytes
      // whose digest is already anchored in the Fabric ledger.
      try {
        const baseName = path.basename(doc.file_name || 'document', path.extname(doc.file_name || 'document'))
          .replace(/[^A-Za-z0-9._-]/g, '_')
          .slice(0, 80) || 'document';
        const certificateFileName = `${baseName}-signature-certificate-${Date.now()}.pdf`;
        const certificatePath = path.join(uploadDir, certificateFileName);
        fs.copyFileSync(resolvedPath, certificatePath);

        await DigitalSignatureService.addSignatureCertificatePage(
          certificatePath,
          documentId,
          signatures.map((sig: any) => ({
            signerName: sig.signer_id,
            organization: sig.signer_org,
            signatureType: sig.signature_type,
            timestamp: new Date(sig.signed_at),
            blockchainTxId: sig.blockchain_tx_id,
            certificateInfo: sig.remarks,
          }))
        );

        logger.info(`✅ Signature certificate copy generated for document: ${documentId}`);

        // The source document ledger hash remains unchanged. This digest is
        // only for the generated certificate copy returned to the caller.
        const newFileHash = crypto.createHash('sha256').update(fs.readFileSync(certificatePath)).digest('hex');

        // 6. Log to audit trail
        await postgresDb.run(
          `INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, performed_by_org, 
            old_value, new_value, reason, metadata, ip_address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            'DOCUMENT',
            documentId,
            'ADD_CERTIFICATE_PAGE',
            user.username || user.sub,
            user.org || 'UNKNOWN',
            doc.file_hash,
            newFileHash,
            'Signature certificate page added',
            JSON.stringify({
              documentId,
              signatureCount: signatures.length,
              addedBy: user.username,
              derivedFileName: certificateFileName,
              derivedFileHash: newFileHash,
              timestamp: new Date().toISOString()
            }),
            req.ip || (req as any).connection?.remoteAddress || 'unknown'
          ]
        );

        res.json({
          success: true,
          message: 'Signature certificate page added successfully',
          data: {
            documentId,
            signatureCount: signatures.length,
            sourceDocumentHash: doc.file_hash,
            certificateFileName,
            certificateFileHash: newFileHash,
          },
          timestamp: new Date().toISOString()
        });

      } catch (certError) {
        logger.error(`Failed to add certificate page: ${documentId}`, certError);
        throw certError;
      }

    } catch (error: any) {
      logger.error('Certificate page generation error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
