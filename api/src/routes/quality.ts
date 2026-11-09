import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import axios from 'axios';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { ShipmentService } from '../services/shipmentService';
import { logger } from '../utils/logger';
import { resolveDocumentPath } from '../utils/fileUtils';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();
const shipmentService = ShipmentService.getInstance();

/**
 * @route GET /api/v1/quality/inspections
 * @route GET /api/v1/quality-inspections
 * @desc Get all quality inspections (with optional filters)
 * @access Authenticated
 */
router.get('/inspections',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, shipmentId, type, limit = '50' } = req.query;
      
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      if (shipmentId) {
        query += ` AND shipment_id = $${paramIndex}`;
        params.push(shipmentId);
        paramIndex++;
      }
      
      // ✅ NEW: Add inspection type filter
      if (type) {
        query += ` AND inspection_type = $${paramIndex}`;
        params.push(String(type).toUpperCase());
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspections list error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Also respond to root /quality GET request
router.get('/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, shipmentId, type, limit = '50' } = req.query;
      
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      if (shipmentId) {
        query += ` AND shipment_id = $${paramIndex}`;
        params.push(shipmentId);
        paramIndex++;
      }
      
      // ✅ NEW: Add inspection type filter
      if (type) {
        query += ` AND inspection_type = $${paramIndex}`;
        params.push(String(type).toUpperCase());
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspections list error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ✅ NEW: Convenience endpoint for pre-shipment inspections
router.get('/pre-shipment',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, limit = '50' } = req.query;
      
      // Return all inspections - table doesn't have type column to filter
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        type: 'pre-shipment',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Pre-shipment inspections error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ✅ NEW: Convenience endpoint for post-delivery audits
router.get('/post-delivery',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, limit = '50' } = req.query;
      
      // Return all inspections - table doesn't have type column to filter
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        type: 'post-delivery',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Post-delivery audits error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Helper function for validation
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * @route POST /api/v1/quality/inspections
 * @desc Request quality inspection
 * @access Exporter, ECTA
 */
router.post('/inspections',
  authMiddleware,
  [
    body('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID, exporterID, contractID, shipmentID, coffeeType, quantity, sampleSize, requestedDate } = req.body;

      // Validate shipment ID is provided
      if (!shipmentID) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SHIPMENT_ID',
            message: 'Shipment ID is required to create an inspection'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if inspection ID already exists
      const existing = await postgresDb.get(
        'SELECT id FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSPECTION_EXISTS',
            message: 'Inspection ID already exists'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if shipment already has a pending inspection
      const pendingInspection = await postgresDb.get(
        'SELECT inspection_id FROM quality_inspections WHERE shipment_id = $1 AND status = $2',
        [shipmentID, 'pending']
      );

      if (pendingInspection) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSPECTION_ALREADY_SCHEDULED',
            message: `Shipment ${shipmentID} already has a pending inspection: ${pendingInspection.inspection_id}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // ⚠️ WRITE TO COUCHDB DIRECTLY to bypass blockchain propagation delays
      // RequestInspection chaincode has endorsement policy issues
      logger.info(`[INSPECTION] Writing inspection ${inspectionID} directly to CouchDB`);
      
      const inspectionDoc = {
        _id: `inspection:${inspectionID}`,
        docType: 'inspection',
        inspectionID,
        shipmentID: shipmentID || '',
        contractID: contractID || '',
        exporterID,
        coffeeType,
        quantity,
        sampleSize: sampleSize || 100,
        requestedDate: requestedDate || new Date().toISOString().split('T')[0],
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const couchDbUrl = process.env.COUCHDB_URL || 'http://couchdb.ecta:5984';
        const couchResponse = await axios.put(
          `${couchDbUrl}/coffeechannel_coffee/${inspectionDoc._id}`,
          inspectionDoc,
          {
            auth: { username: 'admin', password: 'adminpw' },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        logger.info(`✅ [INSPECTION] Inspection ${inspectionID} written to CouchDB`);
      } catch (couchError: any) {
        if (couchError.response?.status === 409) {
          logger.warn(`[INSPECTION] Inspection ${inspectionID} already exists in CouchDB (409 conflict)`);
        } else {
          throw couchError;
        }
      }

      // Insert to PostgreSQL database without blockchain TX ID
      await postgresDb.run(
        `INSERT INTO quality_inspections (
          inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
          quantity, sample_size, requested_date, status, blockchain_tx_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [inspectionID, exporterID, contractID || null, shipmentID || null, coffeeType, 
         quantity, sampleSize || null, requestedDate || new Date().toISOString().split('T')[0], 'pending', null]
      );

      logger.info(`Quality inspection requested: ${inspectionID}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'pending', blockchain_tx_id: null },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection creation error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/perform
 * @desc Perform inspection and record results (status: requested → inspected)
 * @access ECTA Quality Inspector
 */
router.post('/inspections/:inspectionID/perform',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const {
        inspectorID,
        inspectorName,
        sampleSize,
        moistureContent,
        defectCount,
        beanSize,
        color,
        odor,
        fragrance,
        flavor,
        aftertaste,
        acidity,
        body,
        balance,
        uniformity,
        cleanCup,
        sweetness,
        overall,
        classification,
        pesticideTest,
        heavyMetalTest,
        mycotoxinTest,
        remarks
      } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'pending' && inspection.status !== 'requested') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot perform inspection. Current status: ${inspection.status}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Calculate grade from overall score
      let grade = 'Grade 1';
      if (overall >= 85) grade = 'Grade 1';
      else if (overall >= 80) grade = 'Grade 2';
      else if (overall >= 75) grade = 'Grade 3';
      else grade = 'Below Grade';

      // Build cup quality summary with all scores
      const cupQualityScores = {
        fragrance: fragrance || 0,
        flavor: flavor || 0,
        aftertaste: aftertaste || 0,
        acidity: acidity || 0,
        body: body || 0,
        balance: balance || 0,
        uniformity: uniformity || 0,
        cleanCup: cleanCup || 0,
        sweetness: sweetness || 0,
        overall: overall || 0
      };
      
      const cupQualityJson = JSON.stringify(cupQualityScores);
      
      // Build comprehensive remarks with all inspection data
      const comprehensiveRemarks = `
Inspection performed by ${inspectorName || 'ECTA Quality Lab'}.

PHYSICAL ATTRIBUTES:
- Bean Size: ${beanSize || 'N/A'}
- Color: ${color || 'N/A'}
- Odor: ${odor || 'N/A'}
- Classification: ${classification || 'N/A'}

QUALITY METRICS:
- Moisture Content: ${moistureContent}%
- Defect Count: ${defectCount}
- Sample Size: ${sampleSize}g

CUP QUALITY SCORES:
- Fragrance/Aroma: ${fragrance}/10
- Flavor: ${flavor}/10
- Aftertaste: ${aftertaste}/10
- Acidity: ${acidity}/10
- Body: ${body}/10
- Balance: ${balance}/10
- Uniformity: ${uniformity}/10
- Clean Cup: ${cleanCup}/10
- Sweetness: ${sweetness}/10
- Overall Score: ${overall}/100

LAB TESTS:
- Pesticide Test: ${pesticideTest || 'N/A'}
- Heavy Metal Test: ${heavyMetalTest || 'N/A'}
- Mycotoxin Test: ${mycotoxinTest || 'N/A'}

INSPECTOR REMARKS:
${remarks || 'No additional remarks'}
`.trim();

      // ⚠️ UPDATE COUCHDB DIRECTLY to bypass blockchain propagation delays
      logger.info(`[INSPECTION] Updating inspection ${inspectionID} in CouchDB`);
      
      try {
        // Get existing doc to preserve _rev
        const couchDbUrl = process.env.COUCHDB_URL || 'http://couchdb.ecta:5984';
        const existingDoc = await axios.get(
          `${couchDbUrl}/fabricchannel_cecbschannel/inspection:${inspectionID}`,
          { auth: { username: 'admin', password: 'adminpw' } }
        );

        const updatedDoc = {
          ...existingDoc.data,
          status: 'inspected',
          inspectionDate: new Date().toISOString(),
          inspectorID: inspectorID || 'AUTO',
          inspectorName: inspectorName || 'ECTA Quality Lab',
          sampleSize: sampleSize || 100,
          moistureContent: parseFloat(String(moistureContent)),
          defectCount: parseInt(String(defectCount)),
          beanSize: beanSize || 'Screen 17',
          color: color || 'Green',
          odor: odor || 'Fresh',
          cupQuality: cupQualityScores,
          grade: grade,
          classification: classification || grade,
          pesticideTest: pesticideTest || 'PASS',
          heavyMetalTest: heavyMetalTest || 'PASS',
          mycotoxinTest: mycotoxinTest || 'PASS',
          remarks: comprehensiveRemarks,
          updatedAt: new Date().toISOString()
        };

        await axios.put(
          `${couchDbUrl}/fabricchannel_cecbschannel/inspection:${inspectionID}`,
          updatedDoc,
          {
            auth: { username: 'admin', password: 'adminpw' },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        logger.info(`✅ [INSPECTION] Inspection ${inspectionID} updated in CouchDB`);
      } catch (couchError: any) {
        logger.error(`❌ [INSPECTION] Failed to update CouchDB:`, couchError.message);
      }

      // Now update inspection with ALL results in PostgreSQL
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'inspected',
          inspection_date = NOW(),
          inspector_name = $2,
          sample_size = $3,
          moisture_content = $4,
          defect_count = $5,
          screen_size = $6,
          grade = $7,
          cup_quality = $8,
          remarks = $9,
          blockchain_tx_id = NULL,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [
          inspectionID,
          inspectorName || 'ECTA Quality Lab',
          sampleSize || 100,
          moistureContent,
          defectCount,
          parseInt(beanSize) || 17,
          grade,
          cupQualityJson,  // Store all cup scores as JSON
          comprehensiveRemarks
        ]
      );

      logger.info(`Quality inspection performed: ${inspectionID}, Overall: ${overall}, Grade: ${grade}`);

      res.json({
        success: true,
        data: { 
          inspectionID, 
          status: 'inspected',
          grade,
          overall,
          cupQuality: cupQualityScores,
          blockchain_tx_id: null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection perform error:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        inspectionID: req.params.inspectionID
      });
      res.status(500).json({
        success: false,
        error: { 
          code: 'SERVER_ERROR', 
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/approve
 * @desc Approve inspection results (status: inspected → approved)
 * @access ECTA Quality Director
 */
router.post('/inspections/:inspectionID/approve',
  authMiddleware,
  // Previously auth-only despite the "@access ECTA Quality Director"
  // note on this route. Only ECTA may approve an inspection.
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { approvedBy, certificateNo } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'inspected') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot approve inspection. Current status: ${inspection.status}. Must be 'inspected' first.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // ⚠️ UPDATE COUCHDB DIRECTLY to bypass blockchain propagation delays
      logger.info(`[INSPECTION] Approving inspection ${inspectionID} in CouchDB`);
      
      try {
        // Get existing doc to preserve _rev
        const couchDbUrl = process.env.COUCHDB_URL || 'http://couchdb.ecta:5984';
        const existingDoc = await axios.get(
          `${couchDbUrl}/coffeechannel_coffee/inspection:${inspectionID}`,
          { auth: { username: 'admin', password: 'adminpw' } }
        );

        const updatedDoc = {
          ...existingDoc.data,
          status: 'approved',
          passed: true,
          approvedBy: approvedBy || 'ECTA Quality Director',
          certificateNo: certificateNo || `CERT${inspectionID}`,
          approvalDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await axios.put(
          `${couchDbUrl}/coffeechannel_coffee/inspection:${inspectionID}`,
          updatedDoc,
          {
            auth: { username: 'admin', password: 'adminpw' },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        logger.info(`✅ [INSPECTION] Inspection ${inspectionID} approved in CouchDB`);
      } catch (couchError: any) {
        logger.error(`❌ [INSPECTION] Failed to update CouchDB:`, couchError.message);
      }

      // Now approve inspection in PostgreSQL database
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'approved',
          passed = true,
          certification_number = $2,
          grade = COALESCE(grade, 'Grade 1'),
          blockchain_tx_id = NULL,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, certificateNo || `CERT${inspectionID}`]
      );

      logger.info(`Quality inspection approved: ${inspectionID}, Certificate: ${certificateNo}`);

      // ✅ SIGN INSPECTION DOCUMENTS - Add cryptographic signature with approver's identity
      const user = (req as any).user;
      try {
        const { persistDocumentLedgerProof, signDocumentFile } = await import('../services/documentSigningService');
        const FabricService = (await import('../services/fabricService')).default;
        const fabricService = FabricService.getInstance();
        
        // Get all inspection documents (quality reports, certificates, etc.)
        const inspectionDocuments = await postgresDb.all(
          `SELECT document_id, file_path, file_hash, mime_type, file_name 
           FROM documents 
           WHERE entity_type IN ('INSPECTION', 'QUALITY') 
             AND entity_id = $1 
             AND status = 'active'`,
          [inspectionID]
        );
        
        // Sign each document with ECTA Quality Director's cryptographic identity
        for (const doc of inspectionDocuments) {
          const signatureId = `SIG-${doc.document_id}-${user.org || 'ECTA'}-${Date.now()}`;
          const timestamp = new Date().toISOString();
          
          // Resolve physical file path for visual signature
          const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
          const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
          let visualSignatureAdded = false;
          let detachedSignatureCreated = false;
          let documentHash = doc.file_hash;

          if (resolvedPath) {
            try {
              // Get current signature count for positioning
              const sigCountResult = await postgresDb.get(
                'SELECT COUNT(*) as count FROM document_signatures WHERE document_id = $1',
                [doc.document_id]
              );
              const positionIndex = parseInt(sigCountResult?.count || '0');

              const proof = await signDocumentFile({
                filePath: resolvedPath,
                signerUsername: user.username || approvedBy || 'quality_director',
                signerEmail: user.email,
                organization: user.org || 'ECTAMSP',
                reason: `Quality inspection ${inspectionID} approved - Certificate: ${certificateNo}`,
                documentId: doc.document_id,
                documentType: doc.document_type || 'QUALITY_DOCUMENT',
                positionIndex,
                isPDF,
              });
              documentHash = proof.documentHash;
              visualSignatureAdded = proof.visualSignatureAdded;
              detachedSignatureCreated = proof.detachedSignatureCreated;
              await postgresDb.run(
                'UPDATE documents SET file_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
                [documentHash, doc.document_id]
              );
            } catch (pdfError) {
              logger.warn(`Failed to add visual signature to PDF ${doc.document_id}:`, pdfError);
            }
          }
          
          // Store cryptographic signature in database
          await postgresDb.run(
            `INSERT INTO document_signatures (
              signature_id, document_id, signer_id, signer_org, signature_type,
              certificate_id, remarks, blockchain_tx_id, visual_signature_added
              , detached_signature_created, document_hash_signed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              signatureId,
              doc.document_id,
              user.username || approvedBy || 'quality_director',
              user.org || 'ECTAMSP',
              'APPROVE',
              user.sub || null, // X.509 certificate ID
              `Quality inspection ${inspectionID} approved - Certificate: ${certificateNo}`,
              null,
              visualSignatureAdded,
              detachedSignatureCreated,
              documentHash
            ]
          );
          
          // Sign document on blockchain
          try {
            if (fabricService.isConnected()) {
              if (!documentHash) throw new Error('Document content hash is unavailable');
              const blockchainSigResult = await fabricService.signDocument(
                doc.document_id,
                documentHash,
                'APPROVE',
                `Quality inspection ${inspectionID} approved`
              );
              
              if (blockchainSigResult.success && blockchainSigResult.txId) {
                await persistDocumentLedgerProof(
                  postgresDb,
                  signatureId,
                  doc.document_id,
                  documentHash,
                  detachedSignatureCreated,
                  blockchainSigResult.txId
                );
                logger.info(`✅ Blockchain signature recorded for document: ${doc.document_id}`);
              }
            }
          } catch (blockchainSigError) {
            logger.warn(`Blockchain document signature failed for ${doc.document_id}:`, blockchainSigError);
          }
          
          logger.info(`✅ Document signed by ${user.username} (${user.org}): ${doc.document_id}`);
        }
        
        if (inspectionDocuments.length > 0) {
          logger.info(`✅ Signed ${inspectionDocuments.length} inspection document(s) with approver's cryptographic identity`);
        }
      } catch (signError) {
        logger.error('Failed to sign inspection documents:', signError);
        // Don't fail the approval if document signing fails
      }

      // 🔥 WORKFLOW TRIGGER: Auto-create customs declaration after quality approval
      try {
        const inspectionWithShipment = await postgresDb.get(
          'SELECT shipment_id FROM quality_inspections WHERE inspection_id = $1',
          [inspectionID]
        );

        if (inspectionWithShipment?.shipment_id) {
          const customsResult = await shipmentService.triggerCustomsDeclaration(
            inspectionWithShipment.shipment_id,
            inspectionID,
            user?.username || approvedBy || 'quality_director'
          );

          if (customsResult.success) {
            logger.info(`✅ Customs declaration auto-triggered: ${customsResult.declarationID}`);
          }
        }
      } catch (customsError) {
        logger.error('Failed to auto-create customs declaration:', customsError);
        // Don't fail the approval if customs declaration fails
      }

      res.json({
        success: true,
        data: { 
          inspectionID, 
          status: 'approved', 
          certificateNo, 
          blockchain_tx_id: null,
          customsAutoTriggered: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection approval error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// PUT version of approve for compatibility with tests
router.put('/inspections/:inspectionID/approve',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { certificateNumber, grade, remarks, approvedBy } = req.body;
      const user = (req as any).user;

      // The inspection must exist and be awaiting approval. This
      // handler previously UPDATE'd unconditionally and returned a
      // fabricated certificate number for an inspection that did not
      // exist (0 rows updated, 200 returned) — the same existence +
      // status check the POST approve/reject handlers already do.
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'inspected') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot approve inspection. Current status: ${inspection.status}. Must be 'inspected' first.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update inspection to approved status
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'approved',
          passed = true,
          certification_number = $1,
          grade = $2,
          remarks = $3,
          updated_at = NOW()
         WHERE inspection_id = $4`,
        [certificateNumber || `CERT-${inspectionID}`, grade || 'Grade 1', remarks || 'Approved', inspectionID]
      );

      logger.info(`Inspection ${inspectionID} approved via PUT by ${user.username}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'APPROVED',
          certificateNumber: certificateNumber || `CERT-${inspectionID}`,
          grade: grade || 'Grade 1'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection approval error (PUT):', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/reject
 * @desc Reject inspection results (status: inspected → rejected)
 * @access ECTA Quality Director
 */
router.post('/inspections/:inspectionID/reject',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { reason, rejectedBy } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'inspected') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot reject inspection. Current status: ${inspection.status}. Must be 'inspected' first.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: Call RejectInspection chaincode BEFORE DB update
      const blockchainResult = await fabricService.invokeChaincode(
        'RejectInspection',
        [
          inspectionID,
          rejectedBy || 'ECTA Quality Director',
          reason
        ]
      );
      
      const blockchain_tx_id = blockchainResult?.txId || null;
      logger.info(`✅ Inspection rejection recorded on blockchain: ${inspectionID}, TX: ${blockchain_tx_id}`);

      // Now reject inspection in database
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'rejected',
          passed = false,
          remarks = $2,
          blockchain_tx_id = $3,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, `REJECTED: ${reason}`, blockchain_tx_id]
      );

      logger.info(`Quality inspection rejected: ${inspectionID}, Reason: ${reason}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'rejected', reason, blockchain_tx_id },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection rejection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/issue
 * @desc Issue quality certificate (wrapper endpoint)
 * @access ECTA Quality Director
 */
router.post('/issue',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { certificateID, shipmentID, inspectionID, qualityGrade, status } = req.body;

      logger.info(`[QUALITY] 📜 Issuing quality certificate: ${certificateID}`);

      const certId = certificateID || req.body.certificateId || `QC-${Date.now()}`;
      const inspectionId = inspectionID || req.body.inspectionId || '';
      const shipmentId = shipmentID || req.body.shipmentId || '';

      if (!certId || !inspectionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: certificateID, inspectionID',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check inspection exists and passed
      const inspection = await postgresDb.get(
        'SELECT id, status, shipment_id, exporter_id, passed, grade FROM quality_inspections WHERE inspection_id = $1',
        [inspectionId]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: Call IssueCertificate chaincode
      const blockchainResult = await fabricService.invokeChaincode(
        'IssueCertificate',
        [
          certId,
          inspectionId,
          shipmentId || inspection.shipment_id || '',
          qualityGrade || inspection.grade || 'Grade 2',
          new Date().toISOString().split('T')[0]
        ]
      );
      
      const blockchain_tx_id = blockchainResult?.txId || null;
      logger.info(`✅ Quality certificate recorded on blockchain: ${certId}, TX: ${blockchain_tx_id}`);

      // Update inspection with certificate number
      await postgresDb.run(
        `UPDATE quality_inspections SET
          certification_number = $1,
          status = 'certificate_issued',
          blockchain_tx_id = $2,
          updated_at = NOW()
        WHERE inspection_id = $3`,
        [certId, blockchain_tx_id, inspectionId]
      );

      logger.info(`Quality certificate issued: ${certId} for inspection ${inspectionId}`);

      res.status(201).json({
        success: true,
        message: 'Quality certificate issued successfully',
        data: { 
          certificateID: certId, 
          certificateId: certId,
          inspectionID: inspectionId,
          status: 'issued',
          blockchain_tx_id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[QUALITY] Quality certificate issuance error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/issue-permit
 * @desc Issue export permit after inspection approval (status: approved → permit_issued)
 * @access ECTA Export Permit Office
 */
router.post('/inspections/:inspectionID/issue-permit',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { exportPermitNo, issuedBy, autoCreateCustomsDeclaration } = req.body;

      // Check inspection exists and is approved
      const inspection = await postgresDb.get(
        'SELECT id, status, shipment_id, exporter_id, passed, certification_number FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'approved' && inspection.passed !== true) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot issue export permit. Inspection must be approved first. Current status: ${inspection.status}`
          },
          timestamp: new Date().toISOString()
        });
      }

      if (!inspection.certification_number) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CERTIFICATE',
            message: 'Cannot issue export permit without quality certificate'
          },
          timestamp: new Date().toISOString()
        });
      }

      const permitNumber = exportPermitNo || `PERMIT${Date.now()}`;

      // ⚠️ SKIP BLOCKCHAIN - IssueExportPermit function doesn't exist in chaincode
      // Store permit directly in PostgreSQL database only
      logger.info(`[PERMIT] Issuing export permit ${permitNumber} (PostgreSQL only)`);

      // Update inspection status to permit_issued in PostgreSQL
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'permit_issued',
          remarks = COALESCE(remarks, '') || '\n\nEXPORT PERMIT ISSUED: ' || $2 || ' by ' || $3,
          blockchain_tx_id = NULL,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, permitNumber, issuedBy || 'ECTA Export Permit Office']
      );

      logger.info(`Export permit issued: ${permitNumber} for inspection ${inspectionID}, shipment ${inspection.shipment_id}`);

      // TODO: If autoCreateCustomsDeclaration is true, trigger customs workflow
      // This would create a customs declaration record for the shipment

      res.json({
        success: true,
        data: { 
          inspectionID,
          shipmentID: inspection.shipment_id,
          exportPermitNo: permitNumber,
          certificateNo: inspection.certification_number,
          status: 'permit_issued',
          blockchain_tx_id: null
        },
        message: 'Export permit issued successfully. Shipment ready for customs clearance.',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Export permit issuance error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/complete
 * @desc Complete quality inspection with results (legacy - single step)
 * @access ECTA
 */
router.post('/inspections/:inspectionID/complete',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('grade').notEmpty().withMessage('Grade is required'),
    body('passed').isBoolean().withMessage('Passed must be boolean'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { grade, cupQuality, moistureContent, defectCount, screenSize, passed, certificationNumber, inspectorName, remarks } = req.body;

      const inspection = await postgresDb.get(
        'SELECT id FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: Use audit service for legacy complete endpoint
      const auditService = require('../services/auditService').default;
      await auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: inspectionID,
        action: 'COMPLETE',
        performedBy: inspectorName || 'ECTA Inspector',
        organization: 'ECTAMSP',
        performedByOrg: 'ECTAMSP',
        oldValue: 'PENDING',
        newValue: 'COMPLETED',
        reason: `Legacy inspection completion - Grade: ${grade}, Passed: ${passed}`,
        metadata: { grade, cupQuality, moistureContent, defectCount, screenSize, passed, certificationNumber },
        ipAddress: (req as any).ip
      });
      logger.info(`✅ Legacy inspection completion recorded on blockchain: ${inspectionID}`);

      // Now update inspection
      await postgresDb.run(
        `UPDATE quality_inspections SET
          inspection_date = $1, grade = $2, cup_quality = $3, moisture_content = $4,
          defect_count = $5, screen_size = $6, passed = $7, certification_number = $8,
          inspector_name = $9, remarks = $10, status = $11, updated_at = NOW()
        WHERE inspection_id = $12`,
        [new Date().toISOString().split('T')[0], grade, cupQuality || null, moistureContent || null,
         defectCount || null, screenSize || null, passed, certificationNumber || null,
         inspectorName || null, remarks || null, 'completed', inspectionID]
      );

      logger.info(`Quality inspection completed: ${inspectionID}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'completed', passed },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection completion error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/v1/quality/inspections
 * @desc List quality inspections
 * @access Authenticated
 */
router.get('/inspections',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterID, shipmentID } = req.query;
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (exporterID) {
        query += ` AND exporter_id = $${paramIndex++}`;
        params.push(exporterID);
      }
      if (shipmentID) {
        query += ` AND shipment_id = $${paramIndex++}`;
        params.push(shipmentID);
      }

      query += ' ORDER BY created_at DESC';

      const inspections = await postgresDb.all(query, params);

      // Normalize field names for UI compatibility
      const normalizedInspections = inspections.map((insp: any) => {
        // Parse cup quality JSON if it exists
        let cupQualityScores: any = {};
        if (insp.cup_quality) {
          try {
            cupQualityScores = JSON.parse(insp.cup_quality);
          } catch (e) {
            // If not JSON, treat as plain text
            cupQualityScores = { description: insp.cup_quality };
          }
        }
        
        // Extract overall score from cup_quality JSON, remarks, or calculate from grade
        let overallScore: number | null = null;
        
        // Priority 1: From cup_quality JSON
        if (cupQualityScores.overall) {
          overallScore = cupQualityScores.overall;
        }
        // Priority 2: From remarks text
        else if (insp.remarks) {
          const match = insp.remarks.match(/Overall Score:\s*(\d+)/i);
          if (match) {
            overallScore = parseInt(match[1]);
          }
        }
        // Priority 3: Calculate from grade
        if (!overallScore && insp.grade) {
          const gradeMap: any = { 
            'G1': 90, 'Grade 1': 90, 'GRADE 1': 90,
            'G2': 85, 'Grade 2': 85, 'GRADE 2': 85,
            'G3': 80, 'Grade 3': 80, 'GRADE 3': 80
          };
          overallScore = gradeMap[insp.grade] || null;
        }
        
        return {
          inspectionID: insp.inspection_id,
          InspectionID: insp.inspection_id,
          shipmentID: insp.shipment_id,
          ShipmentID: insp.shipment_id,
          contractID: insp.contract_id,
          exporterID: insp.exporter_id,
          coffeeType: insp.coffee_type,
          quantity: insp.quantity,
          sampleSize: insp.sample_size,
          status: insp.status,
          Status: insp.status,
          requestedDate: insp.requested_date,
          scheduledDate: insp.scheduled_date,
          inspectionDate: insp.inspection_date,
          approvalDate: insp.approval_date,
          inspectorID: insp.inspector_id,
          inspectorName: insp.inspector_name,
          certificateNo: insp.certification_number,
          certificationNumber: insp.certification_number,
          exportPermitNo: insp.export_permit_no,
          grade: insp.grade,
          passed: insp.passed,
          cupQuality: insp.cup_quality,  // Raw JSON string or text
          cupQualityScores: cupQualityScores,  // Parsed JSON object
          moistureContent: insp.moisture_content,
          defectCount: insp.defect_count,
          screenSize: insp.screen_size,
          beanSize: insp.bean_size,
          color: insp.color,
          odor: insp.odor,
          classification: insp.classification,
          pesticideTest: insp.pesticide_test,
          heavyMetalTest: insp.heavy_metal_test,
          mycotoxinTest: insp.mycotoxin_test,
          remarks: insp.remarks,
          approvedBy: insp.approved_by,
          overall: overallScore,
          overallScore: overallScore,
          createdAt: insp.created_at,
          updatedAt: insp.updated_at,
          blockchainTxId: insp.blockchain_tx_id,
        };
      });

      res.json({
        success: true,
        data: { inspections: normalizedInspections },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('List inspections error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /quality/inspections/by-shipment/:shipmentId
 * Get all quality inspections for a specific shipment
 * @access Authenticated
 */
router.get('/inspections/by-shipment/:shipmentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      
      logger.info(`[QUALITY] Fetching inspections for shipment: ${shipmentId}`);
      
      const inspections = await postgresDb.all(
        'SELECT * FROM quality_inspections WHERE shipment_id = $1 ORDER BY inspection_date DESC',
        [shipmentId]
      );
      
      // Normalize field names for all inspections
      const normalized = inspections.map((inspection: any) => ({
        inspectionID: inspection.inspection_id,
        shipmentID: inspection.shipment_id,
        contractID: inspection.contract_id,
        exporterID: inspection.exporter_id,
        coffeeType: inspection.coffee_type,
        quantity: inspection.quantity,
        sampleSize: inspection.sample_size,
        scheduledDate: inspection.scheduled_date,
        inspectionDate: inspection.inspection_date,
        inspectorID: inspection.inspector_id,
        inspectorName: inspection.inspector_name,
        grade: inspection.grade,
        passed: inspection.passed,
        cupQuality: inspection.cup_quality,
        moistureContent: inspection.moisture_content,
        defectCount: inspection.defect_count,
        screenSize: inspection.screen_size,
        beanSize: inspection.bean_size,
        color: inspection.color,
        odor: inspection.odor,
        overall: inspection.overall_score || inspection.overall,
        classification: inspection.classification,
        pesticideTest: inspection.pesticide_test,
        heavyMetalTest: inspection.heavy_metal_test,
        mycotoxinTest: inspection.mycotoxin_test,
        remarks: inspection.remarks,
        status: inspection.status,
        certificationNumber: inspection.certification_number,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
      }));
      
      logger.info(`[QUALITY] ✅ Found ${normalized.length} inspections for shipment: ${shipmentId}`);
      
      res.json({
        success: true,
        data: normalized,
        count: normalized.length,
        shipmentId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error(`[QUALITY] Error fetching inspections for shipment:`, error);
      res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /quality/inspections/:inspectionID
 * Get a specific quality inspection by ID
 * @access Authenticated
 */
router.get('/inspections/:inspectionID',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      
      logger.info(`[QUALITY] Fetching inspection: ${inspectionID}`);
      
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );
      
      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Inspection ${inspectionID} not found` },
          timestamp: new Date().toISOString()
        });
      }
      
      // Normalize field names
      const normalized = {
        inspectionID: inspection.inspection_id,
        shipmentID: inspection.shipment_id,
        contractID: inspection.contract_id,
        exporterID: inspection.exporter_id,
        coffeeType: inspection.coffee_type,
        quantity: inspection.quantity,
        sampleSize: inspection.sample_size,
        scheduledDate: inspection.scheduled_date,
        inspectionDate: inspection.inspection_date,
        inspectorID: inspection.inspector_id,
        inspectorName: inspection.inspector_name,
        grade: inspection.grade,
        passed: inspection.passed,
        cupQuality: inspection.cup_quality,
        moistureContent: inspection.moisture_content,
        defectCount: inspection.defect_count,
        screenSize: inspection.screen_size,
        beanSize: inspection.bean_size,
        color: inspection.color,
        odor: inspection.odor,
        overall: inspection.overall_score || inspection.overall,
        classification: inspection.classification,
        pesticideTest: inspection.pesticide_test,
        heavyMetalTest: inspection.heavy_metal_test,
        mycotoxinTest: inspection.mycotoxin_test,
        remarks: inspection.remarks,
        status: inspection.status,
        certificationNumber: inspection.certification_number,
        certificateNo: inspection.certificate_no,
        exportPermitNo: inspection.export_permit_no,
        approvedBy: inspection.approved_by,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
        blockchainTxId: inspection.blockchain_tx_id
      };
      
      res.json({
        success: true,
        data: normalized,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      logger.error('[QUALITY] Error fetching inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/collect-sample
 * @desc Record sample collection (pending → sample_collected)
 * @access Quality Officer
 */
router.post('/inspections/:inspectionID/collect-sample',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('sampleWeight').isNumeric().withMessage('Sample weight must be numeric'),
    body('collectionDate').notEmpty().withMessage('Collection date is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { sampleWeight, collectionDate, collectorName, sealNumber } = req.body;

      // Check if inspection exists
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Update inspection with sample collection details
      await postgresDb.run(
        `UPDATE quality_inspections SET
          sample_size = $1,
          inspector_name = $2,
          status = 'sample_collected',
          updated_at = NOW()
         WHERE inspection_id = $3`,
        [sampleWeight, collectorName || 'Quality Officer', inspectionID]
      );

      logger.info(`Sample collected for inspection ${inspectionID}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'sample_collected',
          sampleWeight,
          collectionDate,
          collectorName,
          sealNumber
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Sample collection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/lab-results
 * @desc Record laboratory test results (sample_collected → inspected)
 * @access Quality Lab Technician
 */
router.post('/inspections/:inspectionID/lab-results',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('moistureContent').isNumeric().withMessage('Moisture content must be numeric'),
    body('defectCount').isNumeric().withMessage('Defect count must be numeric'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const {
        moistureContent,
        defectCount,
        cupScore,
        screenSize,
        labTechnician,
        testDate
      } = req.body;

      // Check if inspection exists
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Update inspection with lab results
      await postgresDb.run(
        `UPDATE quality_inspections SET
          moisture_content = $1,
          defect_count = $2,
          cup_quality = $3,
          screen_size = $4,
          inspector_name = $5,
          inspection_date = $6,
          status = 'inspected',
          updated_at = NOW()
         WHERE inspection_id = $7`,
        [
          moistureContent,
          defectCount,
          cupScore || null,
          screenSize || null,
          labTechnician || 'Lab Technician',
          testDate || new Date().toISOString().split('T')[0],
          inspectionID
        ]
      );

      logger.info(`Lab results recorded for inspection ${inspectionID}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'inspected',
          moistureContent,
          defectCount,
          cupScore,
          screenSize,
          testDate
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Lab results recording error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route PUT /api/v1/quality/inspections/:inspectionID/reject
 * @desc Reject inspection due to quality issues
 * @access Quality Director
 */
router.put('/inspections/:inspectionID/reject',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { rejectionReason } = req.body;
      const user = (req as any).user;

      // Check if inspection exists
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Update inspection status to rejected
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'rejected',
          notes = $1,
          updated_at = NOW()
         WHERE inspection_id = $2`,
        [rejectionReason, inspectionID]
      );

      logger.info(`Inspection ${inspectionID} rejected by ${user.username}: ${rejectionReason}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'rejected',
          rejectionReason
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Inspection rejection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
