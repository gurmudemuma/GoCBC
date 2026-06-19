// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banking API Routes - Letter of Credit, Forex & Export Permits

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = new FabricService();

/**
 * @swagger
 * /api/v1/banking/lc/request:
 *   post:
 *     summary: Request Letter of Credit
 *     tags: [Banking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lcID
 *               - contractID
 *               - exporterID
 *               - bankName
 *               - amount
 *               - currency
 *               - expiryDate
 *             properties:
 *               lcID:
 *                 type: string
 *               contractID:
 *                 type: string
 *               exporterID:
 *                 type: string
 *               bankName:
 *                 type: string
 *               amount:
 *                 type: string
 *               currency:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: LC requested successfully
 */
router.post('/lc/request',
  [
    body('lcID').notEmpty().withMessage('LC ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('bankName').notEmpty().withMessage('Bank name is required'),
    body('amount').notEmpty().withMessage('Amount is required'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('expiryDate').notEmpty().withMessage('Expiry date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        lcID,
        contractID,
        exporterID,
        bankName,
        amount,
        currency,
        expiryDate,
      } = req.body;

      const result = await fabricService.requestLC(
        lcID,
        contractID,
        exporterID,
        bankName,
        amount,
        currency,
        expiryDate
      );

      if (result.success) {
        logger.info(`LC requested successfully: ${lcID}`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'LC_REQUEST_FAILED',
            message: result.error || 'Failed to request LC',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error requesting LC:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/banking/lc/{lcID}/approve:
 *   post:
 *     summary: Approve Letter of Credit
 *     tags: [Banking]
 */
router.post('/lc/:lcID/approve',
  authMiddleware,
  [
    param('lcID').notEmpty().withMessage('LC ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lcID } = req.params;
      
      // Get the logged-in user's bank organization
      const user = (req as any).user;
      if (!user || !user.org) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User organization not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const issuingBank = user.org; // e.g., "Commercial Bank of Ethiopia"
      const advisingBank = issuingBank; // Same bank for now
      const beneficiary = req.body.beneficiary || 'Exporter'; // Get from exporter if available

      const result = await fabricService.approveLC(
        lcID,
        issuingBank,
        advisingBank,
        beneficiary
      );

      if (result.success) {
        logger.info(`LC approved successfully: ${lcID} by ${issuingBank}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'LC_APPROVAL_FAILED',
            message: result.error || 'Failed to approve LC',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error approving LC:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/banking/lc/{lcID}/issue:
 *   post:
 *     summary: Issue Letter of Credit
 *     tags: [Banking]
 */
router.post('/lc/:lcID/issue',
  [
    param('lcID').notEmpty().withMessage('LC ID is required'),
    body('terms').notEmpty().withMessage('LC terms are required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lcID } = req.params;
      const { terms } = req.body;

      const result = await fabricService.issueLC(lcID, terms);

      if (result.success) {
        logger.info(`LC issued successfully: ${lcID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'LC_ISSUE_FAILED',
            message: result.error || 'Failed to issue LC',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error issuing LC:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/banking/lc:
 *   get:
 *     summary: Get all Letters of Credit
 *     tags: [Banking]
 */
router.get('/lc', async (req, res) => {
  try {
    const result = await fabricService.queryAllLCs();

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve LCs',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving LCs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/forex:
 *   get:
 *     summary: Get all forex allocations
 *     tags: [Forex]
 */
router.get('/forex', async (req, res) => {
  try {
    const result = await fabricService.queryAllForex();

    if (result.success) {
      res.json({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve forex allocations',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving forex:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ==================== PAYMENT DOCUMENT SUBMISSION ====================

/**
 * POST /api/v1/banking/payment/:paymentID/submit-documents
 * Exporter submits shipping documents for LC compliance
 */
router.post('/payment/:paymentID/submit-documents',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('documents').isArray().withMessage('Documents array is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const { documents } = req.body;

      const result = await fabricService.submitPaymentDocuments(paymentID, documents);

      if (result.success) {
        logger.info(`Payment documents submitted: ${paymentID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'DOCUMENT_SUBMISSION_FAILED',
            message: result.error || 'Failed to submit documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error submitting payment documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/banking/payment/:paymentID/verify-documents
 * Bank verifies submitted documents against LC terms
 */
router.post('/payment/:paymentID/verify-documents',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('verifiedBy').notEmpty().withMessage('Verified by is required'),
    body('comments').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const { verifiedBy, comments } = req.body;

      const result = await fabricService.verifyPaymentDocuments(
        paymentID,
        verifiedBy,
        comments || 'Documents verified against LC terms'
      );

      if (result.success) {
        logger.info(`Payment documents verified: ${paymentID} by ${verifiedBy}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'DOCUMENT_VERIFICATION_FAILED',
            message: result.error || 'Failed to verify documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error verifying payment documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
