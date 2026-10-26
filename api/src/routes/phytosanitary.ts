// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Phytosanitary Certificate API Routes

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

export default router;
