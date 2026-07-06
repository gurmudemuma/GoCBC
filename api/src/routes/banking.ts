// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banking API Routes - Letter of Credit, Forex & Export Permits

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

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

      // AUTO-MAPPING: Fetch contract data to auto-populate LC fields
      let autoMappedData: any = {};
      try {
        const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
        if (contractResult.success && contractResult.data) {
          const contract = contractResult.data;
          autoMappedData.exporterID = contract.ExporterID || contract.exporterID || exporterID;
          autoMappedData.currency = contract.Currency || contract.currency || 'USD';
          
          // Calculate LC amount from contract value if not provided
          const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
          const quantity = parseFloat(contract.Quantity || contract.quantity || '0');
          autoMappedData.calculatedAmount = (pricePerKg * quantity).toFixed(2);
          
          logger.info(`[LC] Auto-mapped from contract: exporterID=${autoMappedData.exporterID}, amount=${autoMappedData.calculatedAmount}, currency=${autoMappedData.currency}`);
        }
      } catch (error) {
        logger.warn('[LC] Could not fetch contract for auto-mapping:', error);
      }

      // Use provided values or auto-mapped values
      const finalExporterID = exporterID || autoMappedData.exporterID || '';
      const finalAmount = amount || autoMappedData.calculatedAmount || '0';
      const finalCurrency = currency || autoMappedData.currency || 'USD';

      const result = await fabricService.requestLC(
        lcID,
        contractID,
        finalExporterID,
        bankName,
        finalAmount,
        finalCurrency,
        expiryDate
      );

      if (result.success) {
        logger.info(`✅ LC requested successfully: ${lcID} with auto-mapped data`);
        res.status(201).json({
          success: true,
          data: result.data,
          autoMapped: {
            exporterID: finalExporterID,
            amount: finalAmount,
            currency: finalCurrency,
          },
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
 * /api/v1/banking/lc/issue:
 *   post:
 *     summary: Issue Letter of Credit (direct with body data)
 *     tags: [Banking]
 */
router.post('/lc/issue',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {
        lcId,
        lcNumber,
        contractId,
        exporterId,
        issuingBank,
        advisingBank,
        beneficiary,
        applicant,
        amount,
        currency,
        expiryDate,
        latestShipmentDate,
        portOfLoading,
        portOfDischarge,
        paymentTerms,
        partialShipment,
        transhipment
      } = req.body;

      logger.info('[BANKING] Issuing LC:', { lcId, contractId, exporterId, amount, currency });

      const result = await fabricService.submitTransaction(
        'IssueLC',
        lcId,
        lcNumber || lcId,
        contractId,
        exporterId,
        issuingBank,
        advisingBank || '',
        beneficiary,
        applicant,
        amount.toString(),
        currency,
        expiryDate,
        latestShipmentDate || expiryDate,
        portOfLoading || '',
        portOfDischarge || '',
        paymentTerms || 'Sight LC',
        partialShipment ? 'true' : 'false',
        transhipment ? 'true' : 'false'
      );

      logger.info('[BANKING] LC issued successfully:', lcId);
      
      res.status(201).json({
        success: true,
        message: 'LC issued successfully',
        data: { lcId },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[BANKING] Error issuing LC:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LC_ISSUE_FAILED',
          message: error.message || 'Failed to issue LC'
        },
        timestamp: new Date().toISOString()
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

        // Auto-create a forex allocation request after LC issuance
        // Read the LC data back to get contractID, exporterID, amount, currency
        try {
          const lcData = await fabricService.getLC(lcID);
          if (lcData.success && lcData.data) {
            const lc = lcData.data;
            const forexId = `FOREX_${lcID}_${Date.now()}`;
            const forexResult = await fabricService.invokeChaincode('RequestForex', [
              forexId,
              lc.contractId || lc.ContractID || '',
              lc.exporterId || lc.ExporterID || '',
              lcID,
              (lc.amount || lc.Amount || '0').toString(),
              lc.currency || lc.Currency || 'USD',
            ]);
            if (forexResult.success) {
              logger.info(`✅ Forex request auto-created: ${forexId} for LC ${lcID}`);
            } else {
              logger.warn(`⚠️ Forex auto-request failed for LC ${lcID}: ${forexResult.error}`);
            }
          }
        } catch (forexErr) {
          logger.warn(`⚠️ Forex auto-request error for LC ${lcID}:`, forexErr);
          // Non-fatal — LC issuance already succeeded
        }

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
 * POST /api/v1/banking/lc/:lcID/amend
 * Amend Letter of Credit (amount, expiry date, terms)
 * UCP 600 Article 10: LC Amendments
 */
router.post('/lc/:lcID/amend',
  authMiddleware,
  [
    param('lcID').notEmpty().withMessage('LC ID is required'),
    body('amendmentReason').notEmpty().withMessage('Amendment reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lcID } = req.params;
      const { amendmentReason, newAmount, newExpiryDate, newTerms } = req.body;
      const user = (req as any).user;

      logger.info(`Amending LC ${lcID}`, {
        userId: user?.sub,
        organization: user?.org,
        reason: amendmentReason,
      });

      const result = await fabricService.invokeChaincode('AmendLC', [
        lcID,
        amendmentReason,
        newAmount?.toString() || '',
        newExpiryDate || '',
        newTerms || '',
        user?.exporterId || user?.org || 'BANK',
      ]);

      if (result.success) {
        logger.info(`✅ LC amended successfully: ${lcID}`);
        res.json({
          success: true,
          data: result.data,
          message: 'Letter of Credit amended successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'LC_AMENDMENT_FAILED',
            message: result.error || 'Failed to amend LC',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error amending LC:', error);
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

      // AUTO-MAPPING: Fetch contract data to auto-populate payment fields
      let autoMappedData: any = {};
      try {
        const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
        if (contractResult.success && contractResult.data) {
          const contract = contractResult.data;
          autoMappedData.exporterID = contract.ExporterID || contract.exporterID || exporterID;
          autoMappedData.currency = contract.Currency || contract.currency || 'USD';
          autoMappedData.paymentMethod = contract.PaymentMethod || contract.paymentMethod || paymentMethod;
          
          // Calculate payment amount from contract value if not provided
          const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
          const quantity = parseFloat(contract.Quantity || contract.quantity || '0');
          autoMappedData.calculatedAmount = (pricePerKg * quantity).toFixed(2);
          
          logger.info(`[PAYMENT] Auto-mapped from contract: exporterID=${autoMappedData.exporterID}, amount=${autoMappedData.calculatedAmount}, method=${autoMappedData.paymentMethod}`);
        }
      } catch (error) {
        logger.warn('[PAYMENT] Could not fetch contract for auto-mapping:', error);
      }

      // Use provided values or auto-mapped values
      const finalExporterID = exporterID || autoMappedData.exporterID || '';
      const finalAmount = amount || autoMappedData.calculatedAmount || '0';
      const finalCurrency = currency || autoMappedData.currency || 'USD';
      const finalPaymentMethod = paymentMethod || autoMappedData.paymentMethod || 'LC';

      const result = await fabricService.initiatePayment(
        paymentID,
        contractID,
        finalExporterID,
        lcID || '',
        finalAmount.toString(),
        finalCurrency,
        receivingBank,
        receivingBankBIC,
        beneficiaryName,
        beneficiaryAccount,
        finalPaymentMethod
      );

      if (result.success) {
        logger.info(`✅ Payment initiated: ${paymentID} (method: ${finalPaymentMethod}) with auto-mapped data`);
        res.status(201).json({
          success: true,
          data: result.data,
          autoMapped: {
            exporterID: finalExporterID,
            amount: finalAmount,
            currency: finalCurrency,
            paymentMethod: finalPaymentMethod,
          },
          txId: result.txId,
          metadata: {
            paymentMethod: finalPaymentMethod,
            riskProfile: getRiskProfile(finalPaymentMethod),
            bankGuarantee: finalPaymentMethod === 'LC',
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

// ==================== DOCUMENTARY COLLECTION (CAD) ROUTES ====================
// Added July 2, 2026 - CBE Section 3.2.ii

/**
 * POST /api/v1/banking/cad/register
 * Register Documentary Collection (Cash Against Documents)
 */
router.post('/cad/register',
  authMiddleware,
  [
    body('collectionID').notEmpty().withMessage('Collection ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('drawerName').notEmpty().withMessage('Drawer name is required'),
    body('draweeName').notEmpty().withMessage('Drawee name is required'),
    body('draweeAddress').notEmpty().withMessage('Drawee address is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('paymentTerm').isIn(['SIGHT', 'ACCEPTANCE']).withMessage('Payment term must be SIGHT or ACCEPTANCE'),
    body('remittingBank').notEmpty().withMessage('Remitting bank is required'),
    body('remittingBankBIC').notEmpty().withMessage('Remitting bank BIC is required'),
    body('collectingBank').notEmpty().withMessage('Collecting bank is required'),
    body('collectingBankBIC').notEmpty().withMessage('Collecting bank BIC is required'),
    body('documents').isArray().withMessage('Documents array is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        collectionID, contractID, exporterID, drawerName, draweeName, draweeAddress,
        amount, currency, paymentTerm, acceptanceDays, remittingBank, remittingBankBIC,
        collectingBank, collectingBankBIC, instructions, documents
      } = req.body;

      const result = await fabricService.invokeChaincode('RegisterDocumentaryCollection', [
        collectionID, contractID, exporterID, drawerName, draweeName, draweeAddress,
        amount.toString(), currency, paymentTerm, (acceptanceDays || '0').toString(),
        remittingBank, remittingBankBIC, collectingBank, collectingBankBIC,
        instructions || 'Present documents directly to drawee',
        JSON.stringify(documents)
      ]);

      if (result.success) {
        logger.info(`✅ Documentary collection registered: ${collectionID} (${paymentTerm})`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Documentary collection registered successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CAD_REGISTRATION_FAILED',
            message: result.error || 'Failed to register documentary collection',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error registering documentary collection:', error);
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
 * PUT /api/v1/banking/cad/:collectionID/status
 * Update documentary collection status
 */
router.put('/cad/:collectionID/status',
  authMiddleware,
  [
    param('collectionID').notEmpty().withMessage('Collection ID is required'),
    body('status').isIn(['SENT', 'FORWARDED', 'PRESENTED', 'ACCEPTED', 'PAID', 'REJECTED'])
      .withMessage('Invalid CAD status'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { collectionID } = req.params;
      const { status, notes } = req.body;

      const result = await fabricService.invokeChaincode('UpdateCADStatus', [
        collectionID, status, notes || ''
      ]);

      if (result.success) {
        logger.info(`CAD status updated: ${collectionID} → ${status}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: `Documentary collection status updated to ${status}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CAD_STATUS_UPDATE_FAILED',
            message: result.error || 'Failed to update CAD status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating CAD status:', error);
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
 * POST /api/v1/banking/cad/:collectionID/payment
 * Record payment received for documentary collection
 */
router.post('/cad/:collectionID/payment',
  authMiddleware,
  [
    param('collectionID').notEmpty().withMessage('Collection ID is required'),
    body('amountReceived').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('paymentReference').notEmpty().withMessage('Payment reference is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { collectionID } = req.params;
      const { amountReceived, paymentReference } = req.body;

      const result = await fabricService.invokeChaincode('RecordCADPayment', [
        collectionID, paymentReference, amountReceived.toString()
      ]);

      if (result.success) {
        logger.info(`✅ CAD payment recorded: ${collectionID} (${amountReceived})`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'CAD payment recorded successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CAD_PAYMENT_FAILED',
            message: result.error || 'Failed to record CAD payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error recording CAD payment:', error);
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
 * GET /api/v1/banking/cad/exporter/:exporterID
 * Get all documentary collections for exporter
 */
router.get('/cad/exporter/:exporterID',
  authMiddleware,
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;

      // Use QueryAllCollections if exporterID is "ALL", otherwise filter by exporter
      let result;
      if (exporterID === 'ALL') {
        result = await fabricService.queryChaincode('QueryAllCollections', []);
      } else {
        result = await fabricService.queryChaincode('QueryCollectionsByExporter', [exporterID]);
      }

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          count: (result.data || []).length,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: result.error || 'Failed to retrieve documentary collections',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving documentary collections:', error);
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
 * GET /api/v1/banking/cad/:collectionID
 * Get documentary collection details
 */
router.get('/cad/:collectionID',
  authMiddleware,
  [
    param('collectionID').notEmpty().withMessage('Collection ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { collectionID } = req.params;

      const result = await fabricService.queryChaincode('ReadDocumentaryCollection', [collectionID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error || 'Documentary collection not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving documentary collection:', error);
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

// ==================== CONSIGNMENT ROUTES ====================
// Added July 2, 2026 - CBE Section 3.2.iv (LIMITED TO: Fruits, Flowers, Meat)

/**
 * POST /api/v1/banking/consignment/register
 * Issue consignment export permit (limited commodities only)
 */
router.post('/consignment/register',
  authMiddleware,
  [
    body('consignmentID').notEmpty().withMessage('Consignment ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('commodityType').isIn(['FRUITS', 'FLOWERS', 'MEAT'])
      .withMessage('Commodity type must be FRUITS, FLOWERS, or MEAT'),
    body('description').notEmpty().withMessage('Description is required'),
    body('buyerName').notEmpty().withMessage('Buyer name is required'),
    body('buyerAddress').notEmpty().withMessage('Buyer address is required'),
    body('buyerCountry').notEmpty().withMessage('Buyer country is required'),
    body('permitAmount').isFloat({ min: 0 }).withMessage('Permit amount must be positive'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        consignmentID, exporterID, commodityType, description, buyerName,
        buyerAddress, buyerCountry, permitAmount, currency, permitNumber
      } = req.body;

      const result = await fabricService.invokeChaincode('RegisterConsignment', [
        consignmentID, exporterID, commodityType, description, buyerName,
        buyerAddress, buyerCountry, permitAmount.toString(),
        currency || 'USD', permitNumber || `CNS-${Date.now()}`
      ]);

      if (result.success) {
        logger.info(`✅ Consignment permit issued: ${consignmentID} (${commodityType})`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Consignment permit issued successfully',
          warning: 'Settlement due within 90 days per CBE Section 3.2.iv',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONSIGNMENT_REGISTRATION_FAILED',
            message: result.error || 'Failed to register consignment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error registering consignment:', error);
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
 * PUT /api/v1/banking/consignment/:consignmentID/status
 * Update consignment status
 */
router.put('/consignment/:consignmentID/status',
  authMiddleware,
  [
    param('consignmentID').notEmpty().withMessage('Consignment ID is required'),
    body('status').isIn(['PERMITTED', 'SHIPPED', 'SOLD', 'SETTLED', 'OUTSTANDING'])
      .withMessage('Invalid consignment status'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { consignmentID } = req.params;
      const { status, notes } = req.body;

      const result = await fabricService.invokeChaincode('UpdateConsignmentStatus', [
        consignmentID, status, notes || ''
      ]);

      if (result.success) {
        logger.info(`Consignment status updated: ${consignmentID} → ${status}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: `Consignment status updated to ${status}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONSIGNMENT_STATUS_UPDATE_FAILED',
            message: result.error || 'Failed to update consignment status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating consignment status:', error);
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
 * POST /api/v1/banking/consignment/:consignmentID/payment
 * Record payment received from consignment sale
 */
router.post('/consignment/:consignmentID/payment',
  authMiddleware,
  [
    param('consignmentID').notEmpty().withMessage('Consignment ID is required'),
    body('amountReceived').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('paymentReference').notEmpty().withMessage('Payment reference is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { consignmentID } = req.params;
      const { amountReceived, paymentReference } = req.body;

      const result = await fabricService.invokeChaincode('RecordConsignmentPayment', [
        consignmentID, amountReceived.toString(), paymentReference
      ]);

      if (result.success) {
        logger.info(`✅ Consignment payment recorded: ${consignmentID} (${amountReceived})`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          message: 'Consignment payment recorded successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONSIGNMENT_PAYMENT_FAILED',
            message: result.error || 'Failed to record consignment payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error recording consignment payment:', error);
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
 * GET /api/v1/banking/consignment/exporter/:exporterID
 * Get all consignments for exporter
 */
router.get('/consignment/exporter/:exporterID',
  authMiddleware,
  [
    param('exporterID').notEmpty().withMessage('Exporter ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { exporterID } = req.params;

      const result = await fabricService.queryChaincode('QueryConsignmentsByExporter', [exporterID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          count: (result.data || []).length,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: result.error || 'Failed to retrieve consignments',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving consignments:', error);
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
 * GET /api/v1/banking/consignment/outstanding
 * Get all consignments with outstanding balance
 */
router.get('/consignment/outstanding',
  authMiddleware,
  async (req, res) => {
    try {
      const result = await fabricService.queryChaincode('QueryOutstandingConsignments', []);

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          count: (result.data || []).length,
          warning: 'Outstanding consignments require settlement',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: result.error || 'Failed to retrieve outstanding consignments',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving outstanding consignments:', error);
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
 * GET /api/v1/banking/consignment/:consignmentID
 * Get consignment details
 */
router.get('/consignment/:consignmentID',
  authMiddleware,
  [
    param('consignmentID').notEmpty().withMessage('Consignment ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { consignmentID } = req.params;

      const result = await fabricService.queryChaincode('ReadConsignment', [consignmentID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error || 'Consignment not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving consignment:', error);
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

// Helper function to get risk profile
function getRiskProfile(paymentMethod: string): string {
  const riskProfiles: { [key: string]: string } = {
    'LC': 'LOW',
    'CAD': 'MEDIUM',
    'TT_ADVANCE': 'LOW',
    'TT_POST': 'HIGH',
    'ADVANCE': 'LOW',
  };
  return riskProfiles[paymentMethod] || 'UNKNOWN';
}

export default router;
