// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Phytosanitary Certificate API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware, requireRole } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

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

      const result = await fabricService.invokeChaincode('RequestPhytosanitaryCertificate', [
        certificateID,
        shipmentID,
        exporterID,
        plantDescription || 'Coffee beans (Coffea arabica)',
        quantity?.toString() || '0',
        treatmentApplied || 'Fumigation',
      ]);

      if (result.success) {
        logger.info(`✅ Phytosanitary certificate requested: ${certificateID}`);
        res.status(201).json({
          success: true,
          message: 'Phytosanitary certificate requested successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
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
        logger.info(`✅ Phytosanitary inspection completed: ${certificateID}`);
        res.json({
          success: true,
          message: 'Inspection completed successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
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

      const result = await fabricService.invokeChaincode('IssuePhytosanitaryCertificate', [
        certificateID,
        certificateNumber,
        issuingAuthority,
        validUntil,
        additionalDeclarations || 'No additional declarations',
      ]);

      if (result.success) {
        logger.info(`✅ Phytosanitary certificate issued: ${certificateNumber}`);
        res.json({
          success: true,
          message: 'Phytosanitary certificate issued successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'ISSUANCE_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
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
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: result.error },
        timestamp: new Date().toISOString()
      });
    }
    
    let certificates = result.data || [];
    
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
      
      const result = await fabricService.invokeChaincode('RevokePhytosanitaryCertificate', [
        certificateId,
        reason,
        revokedBy,
        new Date().toISOString()
      ]);
      
      if (result.success) {
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
