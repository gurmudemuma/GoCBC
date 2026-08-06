// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Insurance Policy Management API Routes

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
 * /api/v1/insurance/register:
 *   post:
 *     summary: Register insurance policy for shipment
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyNumber
 *               - shipmentID
 *               - insuranceCompany
 *               - coverageAmount
 */
router.post('/register',
  authMiddleware,
  [
    body('policyNumber').notEmpty().withMessage('Policy number is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('insuranceCompany').notEmpty().withMessage('Insurance company is required'),
    body('coverageAmount').isNumeric().withMessage('Coverage amount must be numeric'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('policyType').isIn(['MARINE_CARGO', 'ALL_RISK', 'WAREHOUSE_TO_WAREHOUSE', 'FPA']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        policyNumber,
        shipmentID,
        insuranceCompany,
        coverageAmount,
        currency,
        policyType,
        effectiveDate,
        expiryDate,
        beneficiary,
        coverageDetails,
      } = req.body;

      logger.info(`[INSURANCE] Registering policy: ${policyNumber} for shipment: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('RegisterInsurancePolicy', [
        policyNumber,
        shipmentID,
        insuranceCompany,
        coverageAmount.toString(),
        currency,
        policyType || 'MARINE_CARGO',
        effectiveDate || new Date().toISOString().split('T')[0],
        expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        beneficiary || '',
        coverageDetails || 'Standard marine cargo insurance',
      ]);

      if (result.success) {
        logger.info(`✅ Insurance policy registered: ${policyNumber}`);
        res.status(201).json({
          success: true,
          message: 'Insurance policy registered successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error || 'Failed to register insurance policy',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[INSURANCE] Error registering policy:', error);
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
 * /api/v1/insurance/{policyNumber}:
 *   get:
 *     summary: Get insurance policy details
 *     tags: [Insurance]
 */
router.get('/:policyNumber',
  authMiddleware,
  [param('policyNumber').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { policyNumber } = req.params;

      const result = await fabricService.queryChaincode('ReadInsurancePolicy', [policyNumber]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Insurance policy not found' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[INSURANCE] Error fetching policy:', error);
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
 * /api/v1/insurance/{policyNumber}/claim:
 *   post:
 *     summary: File insurance claim
 *     tags: [Insurance]
 */
router.post('/:policyNumber/claim',
  authMiddleware,
  [
    param('policyNumber').notEmpty(),
    body('claimAmount').isNumeric().withMessage('Claim amount must be numeric'),
    body('claimReason').notEmpty().withMessage('Claim reason is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { policyNumber } = req.params;
      const { claimAmount, claimReason, incidentDate, supportingDocuments } = req.body;

      logger.info(`[INSURANCE] Filing claim for policy: ${policyNumber}`);

      const result = await fabricService.invokeChaincode('FileInsuranceClaim', [
        policyNumber,
        claimAmount.toString(),
        claimReason,
        incidentDate || new Date().toISOString().split('T')[0],
        JSON.stringify(supportingDocuments || []),
      ]);

      if (result.success) {
        logger.info(`✅ Insurance claim filed: ${policyNumber}`);
        res.json({
          success: true,
          message: 'Insurance claim filed successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'CLAIM_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[INSURANCE] Error filing claim:', error);
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
 * /api/v1/insurance/shipment/{shipmentID}:
 *   get:
 *     summary: Get insurance policies for a shipment
 *     tags: [Insurance]
 */
router.get('/shipment/:shipmentID',
  authMiddleware,
  [param('shipmentID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;

      const result = await fabricService.queryChaincode('QueryInsuranceByShipment', [shipmentID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No insurance policies found for shipment' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[INSURANCE] Error querying shipment insurance:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
