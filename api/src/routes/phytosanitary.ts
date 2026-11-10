// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Phytosanitary Certificate API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware, requireRole } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

/**
 * @swagger
 * /api/v1/phytosanitary/request:
 *   post:
 *     summary: Request phytosanitary certificate
 *     tags: [Phytosanitary]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - certificateID
 *               - shipmentID
 *               - exporterID
 *             properties:
 *               certificateID:
 *                 type: string
 *               shipmentID:
 *                 type: string
 *               exporterID:
 *                 type: string
 *     responses:
 *       201:
 *         description: Phytosanitary certificate request submitted
 */
router.post('/request',
  authMiddleware,
  requireRole('EXPORTER', 'ECTA', 'ECTA_ADMIN'),
  [
    body('certificateID').notEmpty().withMessage('Certificate ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('plantDescription').optional().isString(),
    body('quantity').optional().isNumeric(),
    body('treatmentApplied').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        certificateID,
        shipmentID,
        exporterID,
        plantDescription,
        quantity,
        treatmentApplied,
      } = req.body;

      logger.info(`[PHYTO] Requesting phytosanitary certificate: ${certificateID}`);

      // Try blockchain first, fall back to PostgreSQL if chaincode function not found
      const result = await fabricService.invokeChaincode('RequestPhytosanitaryCertificate', [
        certificateID,
        shipmentID,
        exporterID,
        plantDescription || 'Coffee beans (Coffea arabica)',
        quantity?.toString() || '0',
        treatmentApplied || 'Fumigation',
      ]);

      if (result.success) {
        // Blockchain success - mirror to PostgreSQL
        try {
          await postgresDb.run(`
            INSERT INTO phytosanitary_certificates (
              certificate_id, status, issue_date, treatment_type, 
              inspection_result, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (certificate_id) DO NOTHING
          `, [
            certificateID,
            'PENDING',
            new Date().toISOString(),
            treatmentApplied || 'FUMIGATION',
            'PENDING',
            new Date().toISOString()
          ]);
        } catch (pgErr) {
          logger.warn(`[PHYTO] Could not mirror ${certificateID} to PostgreSQL:`, pgErr);
        }
        logger.info(`✅ Phytosanitary certificate requested: ${certificateID}`);
        res.status(201).json({
          success: true,
          message: 'Phytosanitary certificate requested successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else if (result.error && result.error.includes('not found in contract')) {
        // Chaincode function not found - use PostgreSQL fallback
        logger.warn(`[PHYTO] Chaincode function not found, using PostgreSQL fallback for ${certificateID}`);
        try {
          await postgresDb.run(`
            INSERT INTO phytosanitary_certificates (
              certificate_id, status, issue_date, treatment_type,
              inspection_result, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (certificate_id) DO NOTHING
          `, [
            certificateID,
            'PENDING',
            new Date().toISOString(),
            treatmentApplied || 'FUMIGATION',
            'PENDING',
            new Date().toISOString()
          ]);
          logger.info(`✅ Phytosanitary certificate requested (PostgreSQL only): ${certificateID}`);
          res.status(201).json({
            success: true,
            message: 'Phytosanitary certificate requested successfully (PostgreSQL)',
            data: { certificateID, certificateId: certificateID, status: 'PENDING' },
            timestamp: new Date().toISOString(),
          });
        } catch (pgErr: any) {
          logger.error(`[PHYTO] PostgreSQL fallback failed:`, pgErr);
          res.status(500).json({
            success: false,
            error: {
              code: 'REQUEST_FAILED',
              message: pgErr.message,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REQUEST_FAILED',
            message: result.error || 'Failed to request phytosanitary certificate',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[PHYTO] Error requesting certificate:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/phytosanitary/{certificateID}/inspect:
 *   post:
 *     summary: Conduct phytosanitary inspection
 *     tags: [Phytosanitary]
 */
router.post('/:certificateID/inspect',
  authMiddleware,
  [
    param('certificateID').notEmpty(),
    body('inspectorName').notEmpty().withMessage('Inspector name is required'),
    body('inspectionDate').notEmpty().withMessage('Inspection date is required'),
    body('pestsDetected').isBoolean().withMessage('Pests detected must be boolean'),
    body('diseaseDetected').isBoolean().withMessage('Disease detected must be boolean'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { certificateID } = req.params;
      const {
        inspectorName,
        inspectionDate,
        pestsDetected,
        diseaseDetected,
        inspectionNotes,
      } = req.body;

      const user = (req as any).user;
      if (user?.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only ECTA can conduct inspections' },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[PHYTO] Inspecting certificate: ${certificateID}`);

      const result = await fabricService.invokeChaincode('InspectPhytosanitaryCertificate', [
        certificateID,
        inspectorName,
        inspectionDate,
        pestsDetected.toString(),
        diseaseDetected.toString(),
        inspectionNotes || 'No issues found',
      ]);

      if (result.success) {
        // Blockchain success - mirror to PostgreSQL
        try {
          await postgresDb.run(`
            UPDATE phytosanitary_certificates 
            SET status = 'INSPECTED', 
                inspection_result = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE certificate_id = $2
          `, [
            (pestsDetected || diseaseDetected) ? 'FAILED' : 'PASSED',
            certificateID
          ]);
        } catch (pgErr) {
          logger.warn(`[PHYTO] Could not mirror inspection ${certificateID} to PostgreSQL:`, pgErr);
        }
        logger.info(`✅ Phytosanitary inspection completed: ${certificateID}`);
        res.json({
          success: true,
          message: 'Inspection completed successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else if (result.error && result.error.includes('not found in contract')) {
        // Chaincode function not found - use PostgreSQL fallback
        logger.warn(`[PHYTO] Chaincode function not found, using PostgreSQL fallback for inspection ${certificateID}`);
        try {
          const inspectionResult = (pestsDetected || diseaseDetected) ? 'FAILED' : 'PASSED';
          await postgresDb.run(`
            UPDATE phytosanitary_certificates 
            SET status = 'INSPECTED',
                inspection_result = $1,
                certifying_officer = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE certificate_id = $3
          `, [inspectionResult, inspectorName, certificateID]);
          
          logger.info(`✅ Phytosanitary inspection completed (PostgreSQL only): ${certificateID}`);
          res.json({
            success: true,
            message: 'Inspection completed successfully (PostgreSQL)',
            data: { 
              certificateID, 
              certificateId: certificateID, 
              status: 'INSPECTED',
              inspectionResult 
            },
            timestamp: new Date().toISOString(),
          });
        } catch (pgErr: any) {
          logger.error(`[PHYTO] PostgreSQL fallback failed:`, pgErr);
          res.status(500).json({
            success: false,
            error: { code: 'INSPECTION_FAILED', message: pgErr.message },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'INSPECTION_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[PHYTO] Error conducting inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/phytosanitary/{certificateID}/issue:
 *   post:
 *     summary: Issue phytosanitary certificate
 *     tags: [Phytosanitary]
 */
router.post('/:certificateID/issue',
  authMiddleware,
  [
    param('certificateID').notEmpty(),
    body('certificateNumber').notEmpty().withMessage('Certificate number is required'),
    body('issuingAuthority').notEmpty().withMessage('Issuing authority is required'),
    body('validUntil').notEmpty().withMessage('Validity date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { certificateID } = req.params;
      const { certificateNumber, issuingAuthority, validUntil, additionalDeclarations } = req.body;

      const user = (req as any).user;
      if (user?.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only ECTA can issue certificates' },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[PHYTO] Issuing certificate: ${certificateID}`);

      // Try to read from blockchain first
      const certResult = await fabricService.queryChaincode('ReadPhytosanitaryCertificate', [certificateID]);
      
      let cert: any = null;
      let useBlockchain = false;
      
      if (certResult.success && certResult.data) {
        // Certificate exists on blockchain
        cert = certResult.data;
        useBlockchain = true;
      } else {
        // Try PostgreSQL fallback
        logger.warn(`[PHYTO] Certificate not found on blockchain, checking PostgreSQL for ${certificateID}`);
        try {
          const pgCert = await postgresDb.get(
            `SELECT * FROM phytosanitary_certificates WHERE certificate_id = $1`,
            [certificateID]
          );
          
          if (pgCert && pgCert.status === 'INSPECTED') {
            cert = {
              certificateID: pgCert.certificate_id,
              shipmentId: '',
              exporterId: '',
              status: pgCert.status,
              inspectionResult: pgCert.inspection_result
            };
          } else if (!pgCert) {
            return res.status(400).json({
              success: false,
              error: { 
                code: 'ISSUANCE_FAILED', 
                message: `Certificate ${certificateID} must be requested and inspected before it can be issued: phytosanitary certificate ${certificateID} does not exist`
              },
              timestamp: new Date().toISOString()
            });
          } else {
            return res.status(400).json({
              success: false,
              error: { 
                code: 'ISSUANCE_FAILED', 
                message: `Certificate ${certificateID} must be inspected before issuance, current status: ${pgCert.status}`
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (pgErr: any) {
          return res.status(500).json({
            success: false,
            error: { code: 'ISSUANCE_FAILED', message: pgErr.message },
            timestamp: new Date().toISOString()
          });
        }
      }

      if (!cert) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'ISSUANCE_FAILED', 
            message: `Certificate ${certificateID} must be requested and inspected on-chain before it can be issued: phytosanitary certificate ${certificateID} does not exist`
          },
          timestamp: new Date().toISOString()
        });
      }

      if (useBlockchain) {
        // Try blockchain issuance
        const result = await fabricService.invokeChaincode('IssuePhytosanitaryCertificate', [
          certificateID,
          String(cert.shipmentId || cert.shipmentID || ''),
          String(cert.exporterId || cert.exporterID || ''),
          String(cert.inspectorName || ''),
          String(cert.botanicalName || cert.plantDescription || ''),
          String(cert.treatmentApplied || ''),
          String(cert.placeOfOrigin || ''),
          String(cert.pointOfEntry || ''),
          String(cert.quantity ?? ''),
          String(cert.packagingType || ''),
          String(cert.numberOfPackages ?? ''),
          String(cert.distinguishMarks || ''),
          String(cert.meansOfConveyance || ''),
          issuingAuthority,
        ]);

        if (result.success) {
          logger.info(`✅ Phytosanitary certificate issued: ${certificateNumber}`);
          const issuedResult = await fabricService.queryChaincode('ReadPhytosanitaryCertificate', [certificateID]);
          const issued: any = issuedResult.success ? issuedResult.data : null;
          res.json({
            success: true,
            message: 'Phytosanitary certificate issued successfully',
            data: {
              certificateId: certificateID,
              certificateNumber: issued?.certificateNumber || certificateNumber,
              validUntil: issued?.validUntil || validUntil,
              status: issued?.status || 'ISSUED',
              issuingAuthority,
              additionalDeclarations: additionalDeclarations || null,
            },
            txId: result.txId,
            timestamp: new Date().toISOString(),
          });
        } else if (result.error && result.error.includes('not found in contract')) {
          // Chaincode function not found - use PostgreSQL
          useBlockchain = false;
        } else {
          res.status(400).json({
            success: false,
            error: { code: 'ISSUANCE_FAILED', message: result.error },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      
      if (!useBlockchain) {
        // PostgreSQL-only issuance
        logger.warn(`[PHYTO] Using PostgreSQL fallback for issuance ${certificateID}`);
        try {
          await postgresDb.run(`
            UPDATE phytosanitary_certificates 
            SET status = 'ISSUED',
                issue_date = $1,
                certifying_officer = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE certificate_id = $3
          `, [new Date().toISOString(), issuingAuthority, certificateID]);
          
          logger.info(`✅ Phytosanitary certificate issued (PostgreSQL only): ${certificateID}`);
          res.json({
            success: true,
            message: 'Phytosanitary certificate issued successfully (PostgreSQL)',
            data: {
              certificateId: certificateID,
              certificateNumber: certificateNumber,
              validUntil: validUntil,
              status: 'ISSUED',
              issuingAuthority,
              additionalDeclarations: additionalDeclarations || null,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (pgErr: any) {
          logger.error(`[PHYTO] PostgreSQL issuance failed:`, pgErr);
          res.status(500).json({
            success: false,
            error: { code: 'ISSUANCE_FAILED', message: pgErr.message },
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error: any) {
      logger.error('[PHYTO] Error issuing certificate:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/phytosanitary/{certificateID}:
 *   get:
 *     summary: Get phytosanitary certificate details
 *     tags: [Phytosanitary]
 */
router.get('/:certificateID',
  authMiddleware,
  [param('certificateID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { certificateID } = req.params;

      const result = await fabricService.queryChaincode('ReadPhytosanitaryCertificate', [certificateID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Certificate not found' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[PHYTO] Error fetching certificate:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/phytosanitary
 * Get all phytosanitary certificates
 * @access Authenticated
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, exporterId, shipmentId } = req.query;
    
    logger.info('[PHYTO] 📋 Fetching all phytosanitary certificates...');
    
    const result = await fabricService.evaluateTransaction('QueryAllPhytosanitaryCertificates');

    // Chaincode first; fall back to the PostgreSQL mirror when the ledger
    // is unreachable (dev mode / no Fabric host) — same best-effort
    // pattern as GET /payments: honest source labelling, no fabricated data.
    let certificates: any[] = [];
    let source = 'blockchain';
    if (!result.success) {
      logger.warn(`[PHYTO] Blockchain query failed, falling back to PostgreSQL: ${result.error}`);
      try {
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        const dbCerts = await db.all(`SELECT * FROM phytosanitary_certificates ORDER BY created_at DESC`);
        source = 'database';
        certificates = dbCerts.map((c: any) => ({
          certificateID: c.certificate_id,
          certificateNumber: c.certificate_id,
          contractId: c.contract_id,
          status: c.status,
          inspectionDate: c.issue_date,
          issueDate: c.issue_date,
          expiryDate: c.expiry_date,
          treatment: c.treatment_type,
          inspectionResult: c.inspection_result,
          issuedBy: c.certifying_officer,
          certifyingOfficer: c.certifying_officer,
          shipmentID: '',
          exporterID: '',
          // The table reads these directly (quantity.toLocaleString() and
          // new Date(inspectionDate)); they must be present, never undefined.
          quantity: 0,
          placeOfOrigin: '',
          pointOfEntry: '',
          packagingType: '',
          numberOfPackages: 0,
          distinguishingMarks: '',
          meansOfConveyance: '',
          validityPeriod: '',
          botanicalName: 'Coffea arabica',
        }));
        logger.info(`[PHYTO] Loaded ${certificates.length} certificates from PostgreSQL (fallback)`);
      } catch (pgError: any) {
        logger.error(`[PHYTO] PostgreSQL fallback failed: ${pgError.message}`);
        return res.status(500).json({
          success: false,
          error: { code: 'QUERY_FAILED', message: result.error },
          timestamp: new Date().toISOString()
        });
      }
    } else {
      certificates = result.data || [];
    }
    
    // Apply filters if provided
    if (status) {
      certificates = certificates.filter((cert: any) => cert.status === status);
    }
    if (exporterId) {
      certificates = certificates.filter((cert: any) => cert.exporterID === exporterId);
    }
    if (shipmentId) {
      certificates = certificates.filter((cert: any) => cert.shipmentID === shipmentId);
    }
    
    logger.info(`[PHYTO] ✅ Found ${certificates.length} certificates`);
    
    res.json({
      success: true,
      data: certificates,
      count: certificates.length,
      source,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[PHYTO] ❌ Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/phytosanitary/shipment/:shipmentId
 * Get phytosanitary certificates for a specific shipment
 * @access Authenticated
 */
router.get('/shipment/:shipmentId', authMiddleware, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    logger.info(`[PHYTO] 🔍 Fetching certificates for shipment: ${shipmentId}`);
    
    const result = await fabricService.evaluateTransaction('QueryPhytosanitaryCertificatesByShipment', shipmentId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: result.error },
        timestamp: new Date().toISOString()
      });
    }
    
    const certificates = result.data || [];
    
    logger.info(`[PHYTO] ✅ Found ${certificates.length} certificates for shipment: ${shipmentId}`);
    
    res.json({
      success: true,
      data: certificates,
      count: certificates.length,
      shipmentId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[PHYTO] ❌ Error fetching certificates for shipment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/phytosanitary/:certificateId/revoke
 * Revoke a phytosanitary certificate
 * @access Authenticated
 */
router.post('/:certificateId/revoke',
  authMiddleware,
  // Previously auth-only: any authenticated user could revoke a
  // phytosanitary certificate. Only ECTA may do that.
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('certificateId').notEmpty(),
    body('reason').notEmpty().withMessage('Revocation reason is required'),
    body('revokedBy').notEmpty().withMessage('Revoking authority required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      const { reason, revokedBy } = req.body;
      const user = (req as any).user;
      
      logger.info(`[PHYTO] ⚠️ Revoking certificate: ${certificateId}`);
      
      // Verify user has authority to revoke (ECTA role)
      if (user?.org !== 'ECTA' && user?.organization !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Only ECTA can revoke phytosanitary certificates' },
          timestamp: new Date().toISOString()
        });
      }
      
      // RevokePhytosanitaryCertificate (phytosanitary.go:448) takes
      // (certificateID, revokedBy, reason) — 3 args, reason last, no
      // timestamp. The old call passed 4 args in the wrong order
      // (certificateId, reason, revokedBy, date). Use the wrapper, which
      // already passes the correct 3 args in the right order.
      const result = await fabricService.revokePhytosanitaryCertificate(
        certificateId,
        revokedBy,
        reason
      );
      
      if (result.success) {
        // Mirror into Postgres: the old handler was chaincode-only, so the
        // phytosanitary_certificates row kept status ISSUED after revocation.
        try {
          await postgresDb.run(
            `UPDATE phytosanitary_certificates SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP WHERE certificate_id = $1`,
            [certificateId]
          );
        } catch (mirrorErr) {
          logger.warn(`[PHYTO] Could not mirror revocation of ${certificateId} to Postgres:`, mirrorErr);
        }
        logger.info(`[PHYTO] ✅ Certificate revoked: ${certificateId}`);
        res.json({
          success: true,
          message: 'Phytosanitary certificate revoked successfully',
          data: { certificateId, status: 'REVOKED', reason, revokedBy },
          txId: result.txId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'REVOKE_FAILED', message: result.error },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('[PHYTO] ❌ Error revoking certificate:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
