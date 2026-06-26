// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banking API Routes - Letter of Credit, Forex & Export Permits

import express, { Request, Response } from 'express';
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
  async (req: Request, res: Response) => {
    try {
      const { lcID } = req.params;
      const { terms } = req.body;
      const user = (req as any).user; // Get authenticated user info

      // Log which organization (bank) is issuing the LC
      logger.info(`[${user?.org || 'BANKS'}] Issuing LC: ${lcID}`, {
        userId: user?.sub,
        organization: user?.org,
        role: user?.role,
      });

      const result = await fabricService.issueLC(lcID, terms);

      if (result.success) {
        logger.info(`[${user?.org}] ✅ LC issued successfully: ${lcID}`);
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

// ==================== PAYMENT METHOD-SPECIFIC ROUTES ====================
// Added June 26, 2026 for payment method differentiation

/**
 * POST /api/v1/banking/payment/initiate
 * Initiate payment with specific payment method
 * Supports: LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
 */
router.post('/payment/initiate',
  authMiddleware,
  [
    body('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('amount').notEmpty().withMessage('Amount is required'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('receivingBank').notEmpty().withMessage('Receiving bank is required'),
    body('receivingBankBIC').notEmpty().withMessage('Receiving bank BIC is required'),
    body('beneficiaryName').notEmpty().withMessage('Beneficiary name is required'),
    body('beneficiaryAccount').notEmpty().withMessage('Beneficiary account is required'),
    body('paymentMethod').isIn(['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE'])
      .withMessage('Invalid payment method. Must be LC, CAD, TT_ADVANCE, TT_POST, or ADVANCE'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        paymentID,
        contractID,
        exporterID,
        lcID,
        amount,
        currency,
        receivingBank,
        receivingBankBIC,
        beneficiaryName,
        beneficiaryAccount,
        paymentMethod,
      } = req.body;

      const result = await fabricService.initiatePayment(
        paymentID,
        contractID,
        exporterID,
        lcID || '',
        amount.toString(),
        currency,
        receivingBank,
        receivingBankBIC,
        beneficiaryName,
        beneficiaryAccount,
        paymentMethod
      );

      if (result.success) {
        logger.info(`Payment initiated: ${paymentID} (method: ${paymentMethod})`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          metadata: {
            paymentMethod,
            riskProfile: getRiskProfile(paymentMethod),
            bankGuarantee: paymentMethod === 'LC',
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_INITIATION_FAILED',
            message: result.error || 'Failed to initiate payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error initiating payment:', error);
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
 * POST /api/v1/banking/payment/:paymentID/release-documents
 * Release documents to buyer (CAD/LC only, after payment confirmed)
 */
router.post('/payment/:paymentID/release-documents',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;

      const result = await fabricService.releaseDocumentsToBuyer(paymentID);

      if (result.success) {
        logger.info(`Documents released to buyer for payment: ${paymentID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Documents released to buyer successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'DOCUMENT_RELEASE_FAILED',
            message: result.error || 'Failed to release documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error releasing documents:', error);
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
 * POST /api/v1/banking/payment/:paymentID/receive-advance
 * Receive advance payment (TT_ADVANCE/ADVANCE methods only)
 */
router.post('/payment/:paymentID/receive-advance',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('advancePercentage').isFloat({ min: 0, max: 100 })
      .withMessage('Advance percentage must be between 0 and 100'),
    body('amountReceived').isFloat({ min: 0 })
      .withMessage('Amount received must be a positive number'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const { advancePercentage, amountReceived } = req.body;

      const result = await fabricService.receiveAdvancePayment(
        paymentID,
        advancePercentage.toString(),
        amountReceived.toString()
      );

      if (result.success) {
        logger.info(`Advance payment received: ${paymentID} (${advancePercentage}%)`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: `Advance payment of ${advancePercentage}% received successfully`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ADVANCE_PAYMENT_FAILED',
            message: result.error || 'Failed to record advance payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error receiving advance payment:', error);
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
 * POST /api/v1/banking/payment/:paymentID/receive-balance
 * Receive balance payment after advance
 */
router.post('/payment/:paymentID/receive-balance',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('amountReceived').isFloat({ min: 0 })
      .withMessage('Amount received must be a positive number'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const { amountReceived } = req.body;

      const result = await fabricService.receiveBalancePayment(
        paymentID,
        amountReceived.toString()
      );

      if (result.success) {
        logger.info(`Balance payment received: ${paymentID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Balance payment received successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'BALANCE_PAYMENT_FAILED',
            message: result.error || 'Failed to record balance payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error receiving balance payment:', error);
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
 * PUT /api/v1/banking/payment/:paymentID/status
 * Update payment status (validates transition per payment method)
 */
router.put('/payment/:paymentID/status',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('status').notEmpty().withMessage('New status is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const { status } = req.body;

      const result = await fabricService.updatePaymentStatus(paymentID, status);

      if (result.success) {
        logger.info(`Payment status updated: ${paymentID} → ${status}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: `Payment status updated to ${status}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'STATUS_UPDATE_FAILED',
            message: result.error || 'Failed to update payment status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating payment status:', error);
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
 * GET /api/v1/banking/payment/by-method/:method
 * Query payments by payment method
 */
router.get('/payment/by-method/:method',
  authMiddleware,
  [
    param('method').isIn(['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE'])
      .withMessage('Invalid payment method'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { method } = req.params;

      const result = await fabricService.getPaymentsByMethod(method);

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          metadata: {
            paymentMethod: method,
            count: (result.data || []).length,
            riskProfile: getRiskProfile(method),
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: result.error || 'Failed to retrieve payments',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving payments by method:', error);
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
 * POST /api/v1/banking/payment/:paymentID/settle
 * Settle payment with retention and exchange rate
 */
router.post('/payment/:paymentID/settle',
  authMiddleware,
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('exchangeRate').isFloat({ min: 0 }).withMessage('Exchange rate must be positive'),
    body('retentionRate').isFloat({ min: 0, max: 100 })
      .withMessage('Retention rate must be between 0 and 100'),
    body('payingBank').notEmpty().withMessage('Paying bank is required'),
    body('payingBankBIC').notEmpty().withMessage('Paying bank BIC is required'),
    body('swiftReference').notEmpty().withMessage('SWIFT reference is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentID } = req.params;
      const {
        exchangeRate,
        retentionRate,
        payingBank,
        payingBankBIC,
        swiftReference,
        nbeApprovalRef,
      } = req.body;

      const result = await fabricService.settlePayment(
        paymentID,
        exchangeRate.toString(),
        retentionRate.toString(),
        payingBank,
        payingBankBIC,
        swiftReference,
        nbeApprovalRef || ''
      );

      if (result.success) {
        logger.info(`Payment settled: ${paymentID} (SWIFT: ${swiftReference})`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Payment settled successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'SETTLEMENT_FAILED',
            message: result.error || 'Failed to settle payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error settling payment:', error);
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

// ==================== HELPER FUNCTIONS ====================

/**
 * Get risk profile for payment method
 */
function getRiskProfile(method: string): string {
  const riskProfiles: { [key: string]: string } = {
    LC: 'LOW',
    CAD: 'MEDIUM',
    TT_ADVANCE: 'LOW',
    TT_POST: 'HIGH',
    ADVANCE: 'LOW',
  };
  return riskProfiles[method] || 'UNKNOWN';
}
