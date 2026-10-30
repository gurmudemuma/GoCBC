// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// EUDR (EU Deforestation Regulation) Compliance API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/eudr/due-diligence:
 *   post:
 *     summary: Submit EUDR due diligence statement
 *     tags: [EUDR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dueDiligenceID
 *               - shipmentID
 *               - exporterID
 */
router.post('/due-diligence',
  authMiddleware,
  [
    body('dueDiligenceID').notEmpty().withMessage('Due diligence ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('geoCoordinates').isArray().withMessage('Geo coordinates must be an array'),
    body('plotSize').isNumeric().withMessage('Plot size must be numeric'),
    body('farmName').notEmpty().withMessage('Farm name is required'),
    body('deforestationFree').isBoolean(),
    body('legalHarvest').isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        dueDiligenceID,
        shipmentID,
        exporterID,
        geoCoordinates,
        plotSize,
        farmName,
        farmLocation,
        deforestationFree,
        legalHarvest,
        harvestDate,
        landRights,
        documents,
      } = req.body;

      logger.info(`[EUDR] Submitting due diligence: ${dueDiligenceID}`);

      // Validate geo-coordinates format (lat, lon pairs)
      if (!Array.isArray(geoCoordinates) || geoCoordinates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_GEO', message: 'At least one geo-coordinate pair required' },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fabricService.invokeChaincode('SubmitEUDRDueDiligence', [
        dueDiligenceID,
        shipmentID,
        exporterID,
        JSON.stringify(geoCoordinates),
        plotSize.toString(),
        farmName,
        farmLocation || '',
        deforestationFree.toString(),
        legalHarvest.toString(),
        harvestDate || new Date().toISOString().split('T')[0],
        landRights || 'DOCUMENTED',
        JSON.stringify(documents || []),
      ]);

      if (result.success) {
        logger.info(`✅ EUDR due diligence submitted: ${dueDiligenceID}`);
        res.status(201).json({
          success: true,
          message: 'EUDR due diligence submitted successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: result.error || 'Failed to submit due diligence',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[EUDR] Error submitting due diligence:', error);
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
 * /api/v1/eudr/{dueDiligenceID}/verify:
 *   post:
 *     summary: Verify EUDR due diligence (ECTA)
 *     tags: [EUDR]
 */
router.post('/:dueDiligenceID/verify',
  authMiddleware,
  [
    param('dueDiligenceID').notEmpty(),
    body('verifiedBy').notEmpty().withMessage('Verifier name is required'),
    body('verified').isBoolean().withMessage('Verification result must be boolean'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { dueDiligenceID } = req.params;
      const { verifiedBy, verified, verificationNotes } = req.body;

      const user = (req as any).user;
      if (user?.role !== 'ECTA') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only ECTA can verify EUDR compliance' },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[EUDR] Verifying due diligence: ${dueDiligenceID}`);

      const result = await fabricService.invokeChaincode('VerifyEUDRCompliance', [
        dueDiligenceID,
        verifiedBy,
        verified.toString(),
        verificationNotes || 'Verification completed',
      ]);

      if (result.success) {
        logger.info(`✅ EUDR compliance verified: ${dueDiligenceID} - ${verified ? 'PASSED' : 'FAILED'}`);
        res.json({
          success: true,
          message: `EUDR compliance ${verified ? 'verified' : 'rejected'}`,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[EUDR] Error verifying compliance:', error);
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
 * /api/v1/eudr:
 *   get:
 *     summary: Get all EUDR due diligence records
 *     tags: [EUDR]
 */
router.get('/',
  authMiddleware,
  async (req, res) => {
    try {
      logger.info('[EUDR] Fetching all due diligence records...');

      const result = await fabricService.queryChaincode('QueryAllEUDRRecords', []);

      // Always return success with empty array if no data
      res.json({
        success: true,
        data: result.success ? (result.data || []) : [],
        count: result.success ? (Array.isArray(result.data) ? result.data.length : 0) : 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[EUDR] Error fetching due diligence records:', error);
      // Still return success with empty array on error
      res.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/eudr/statements:
 *   get:
 *     summary: Get all EUDR statements (alias for /)
 *     tags: [EUDR]
 */
router.get('/statements',
  authMiddleware,
  async (req, res) => {
    try {
      logger.info('[EUDR] Fetching EUDR statements...');

      const result = await fabricService.queryChaincode('QueryAllEUDRRecords', []);

      res.json({
        success: true,
        data: result.success ? (result.data || []) : [],
        count: result.success ? (Array.isArray(result.data) ? result.data.length : 0) : 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[EUDR] Error fetching statements:', error);
      res.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/eudr/geolocation:
 *   get:
 *     summary: Get all geolocation data from EUDR records
 *     tags: [EUDR]
 */
router.get('/geolocation',
  authMiddleware,
  async (req, res) => {
    try {
      logger.info('[EUDR] Fetching geolocation data...');

      const result = await fabricService.queryChaincode('QueryAllEUDRRecords', []);

      // Extract geolocation data from records
      let geoData: any[] = [];
      if (result.success && Array.isArray(result.data)) {
        geoData = result.data.map((record: any) => ({
          dueDiligenceId: record.dueDiligenceID || record.id,
          shipmentId: record.shipmentID,
          exporterId: record.exporterID,
          farmName: record.farmName,
          farmLocation: record.farmLocation,
          geoCoordinates: record.geoCoordinates || [],
          plotSize: record.plotSize,
          deforestationFree: record.deforestationFree,
          verified: record.verified || false,
          timestamp: record.timestamp
        }));
      }

      res.json({
        success: true,
        data: geoData,
        count: geoData.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[EUDR] Error fetching geolocation data:', error);
      res.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/eudr/{dueDiligenceID}:
 *   get:
 *     summary: Get EUDR due diligence details
 *     tags: [EUDR]
 */
router.get('/:dueDiligenceID',
  authMiddleware,
  [param('dueDiligenceID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { dueDiligenceID } = req.params;

      const result = await fabricService.queryChaincode('ReadEUDRDueDiligence', [dueDiligenceID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Due diligence record not found' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[EUDR] Error fetching due diligence:', error);
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
 * /api/v1/eudr/shipment/{shipmentID}:
 *   get:
 *     summary: Get EUDR compliance status for a shipment
 *     tags: [EUDR]
 */
router.get('/shipment/:shipmentID',
  authMiddleware,
  [param('shipmentID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;

      const result = await fabricService.queryChaincode('QueryEUDRByShipment', [shipmentID]);

      // Always return success with empty array if no data
      res.json({
        success: true,
        data: result.success ? (result.data || []) : [],
        count: result.success ? (Array.isArray(result.data) ? result.data.length : 0) : 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[EUDR] Error querying shipment compliance:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
