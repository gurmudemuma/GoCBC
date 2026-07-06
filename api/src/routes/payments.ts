// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Payment Settlement & Verification API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate payment process
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentID
 *               - contractID
 *               - exporterID
 *               - lcID
 *               - amount
 *               - currency
 *               - receivingBank
 *               - receivingBankBIC
 *               - beneficiaryName
 *               - beneficiaryAccount
 *               - paymentMethod
 *             properties:
 *               paymentID:
 *                 type: string
 *               contractID:
 *                 type: string
 *               exporterID:
 *                 type: string
 *               lcID:
 *                 type: string
 *               amount:
 *                 type: string
 *               currency:
 *                 type: string
 *               receivingBank:
 *                 type: string
 *               receivingBankBIC:
 *                 type: string
 *               beneficiaryName:
 *                 type: string
 *               beneficiaryAccount:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/initiate',
  [
    body('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('lcID').notEmpty().withMessage('LC ID is required'),
    body('amount').notEmpty().withMessage('Amount is required'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('receivingBank').notEmpty().withMessage('Receiving bank is required'),
    body('receivingBankBIC').notEmpty().withMessage('Receiving bank BIC is required'),
    body('beneficiaryName').notEmpty().withMessage('Beneficiary name is required'),
    body('beneficiaryAccount').notEmpty().withMessage('Beneficiary account is required'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
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

      logger.info(`[PAYMENT] Initiating payment: ${paymentID} with method: ${paymentMethod}`);

      // Connect as BanksMSP to initiate payment
      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('InitiatePayment', [
        paymentID,
        contractID,
        exporterID,
        lcID,
        amount.toString(),
        currency,
        receivingBank,
        receivingBankBIC,
        beneficiaryName,
        beneficiaryAccount,
        paymentMethod,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Payment initiated successfully: ${paymentID}`);
        res.status(201).json({
          success: true,
          message: 'Payment initiated successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to initiate payment: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'INITIATION_FAILED',
            message: result.error || 'Failed to initiate payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error initiating payment:', error);
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
 * /api/v1/payments/record:
 *   post:
 *     summary: Record payment receipt
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentID
 *               - shipmentID
 *               - lcNumber
 *               - amount
 *               - currency
 *               - paymentMethod
 *             properties:
 *               paymentID:
 *                 type: string
 *               shipmentID:
 *                 type: string
 *               lcNumber:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               bankReference:
 *                 type: string
 *               swiftMessage:
 *                 type: string
 *               paymentProof:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/record',
  [
    body('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('lcNumber').notEmpty().withMessage('LC Number is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        paymentID,
        shipmentID,
        lcNumber,
        amount,
        currency,
        paymentMethod,
        bankReference,
        swiftMessage,
        paymentProof,
      } = req.body;

      logger.info(`[PAYMENT] Recording payment: ${paymentID} for shipment: ${shipmentID}`);

      // Connect as BanksMSP to record payment
      await fabricService.connectAsOrg('BanksMSP');

      // Record payment on blockchain
      const result = await fabricService.invokeChaincode('RecordPayment', [
        paymentID,
        shipmentID,
        lcNumber,
        amount.toString(),
        currency,
        paymentMethod,
        bankReference || '',
        swiftMessage || '',
        paymentProof || '',
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Payment recorded successfully: ${paymentID}`);
        res.status(201).json({
          success: true,
          message: 'Payment recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to record payment: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'RECORDING_FAILED',
            message: result.error || 'Failed to record payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error recording payment:', error);
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
 * /api/v1/payments/{paymentID}/documents:
 *   post:
 *     summary: Submit payment documents
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Documents submitted successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/documents',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('documents').isArray().withMessage('Documents must be an array'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { documents } = req.body;

      logger.info(`[PAYMENT] Submitting documents for payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('SubmitPaymentDocuments', [
        paymentID,
        JSON.stringify(documents),
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Documents submitted for: ${paymentID}`);
        res.json({
          success: true,
          message: 'Payment documents submitted successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to submit documents: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: result.error || 'Failed to submit documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error submitting documents:', error);
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
 * /api/v1/payments/{paymentID}/verify:
 *   post:
 *     summary: Verify payment documents
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verifiedBy
 *               - comments
 *             properties:
 *               verifiedBy:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Documents verified successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/verify',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('verifiedBy').notEmpty().withMessage('Verified by is required'),
    body('comments').notEmpty().withMessage('Comments are required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { verifiedBy, comments } = req.body;

      logger.info(`[PAYMENT] Verifying documents for payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('VerifyPaymentDocuments', [
        paymentID,
        verifiedBy,
        comments,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Documents verified for: ${paymentID}`);
        res.json({
          success: true,
          message: 'Payment documents verified successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to verify documents: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: result.error || 'Failed to verify documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error verifying documents:', error);
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
 * /api/v1/payments/{paymentID}/swift/initiate:
 *   post:
 *     summary: Initiate SWIFT transfer
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - swiftReference
 *               - senderBIC
 *               - messageType
 *               - valueDate
 *               - charges
 *               - remittanceInfo
 *             properties:
 *               swiftReference:
 *                 type: string
 *               senderBIC:
 *                 type: string
 *               messageType:
 *                 type: string
 *               valueDate:
 *                 type: string
 *               intermediary1:
 *                 type: string
 *               intermediary2:
 *                 type: string
 *               charges:
 *                 type: string
 *               remittanceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: SWIFT transfer initiated successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/swift/initiate',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('swiftReference').notEmpty().withMessage('SWIFT reference is required'),
    body('senderBIC').notEmpty().withMessage('Sender BIC is required'),
    body('messageType').notEmpty().withMessage('Message type is required'),
    body('valueDate').notEmpty().withMessage('Value date is required'),
    body('charges').notEmpty().withMessage('Charges are required'),
    body('remittanceInfo').notEmpty().withMessage('Remittance info is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { swiftReference, senderBIC, messageType, valueDate, intermediary1, intermediary2, charges, remittanceInfo } = req.body;

      logger.info(`[PAYMENT] Initiating SWIFT transfer for payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('InitiateSWIFTTransfer', [
        paymentID,
        swiftReference,
        senderBIC,
        messageType,
        valueDate,
        intermediary1 || '',
        intermediary2 || '',
        charges,
        remittanceInfo,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] SWIFT transfer initiated: ${paymentID}`);
        res.json({
          success: true,
          message: 'SWIFT transfer initiated successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to initiate SWIFT: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'SWIFT_INITIATION_FAILED',
            message: result.error || 'Failed to initiate SWIFT transfer',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error initiating SWIFT:', error);
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
 * /api/v1/payments/{paymentID}/swift/confirm:
 *   post:
 *     summary: Confirm SWIFT receipt
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receivedBy
 *             properties:
 *               receivedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: SWIFT receipt confirmed successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/swift/confirm',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('receivedBy').notEmpty().withMessage('Received by is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { receivedBy } = req.body;

      logger.info(`[PAYMENT] Confirming SWIFT receipt for payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('ConfirmSWIFTReceipt', [
        paymentID,
        receivedBy,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] SWIFT receipt confirmed: ${paymentID}`);
        res.json({
          success: true,
          message: 'SWIFT receipt confirmed successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to confirm SWIFT receipt: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'SWIFT_CONFIRMATION_FAILED',
            message: result.error || 'Failed to confirm SWIFT receipt',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error confirming SWIFT receipt:', error);
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
 * /api/v1/payments/{paymentID}/settle:
 *   post:
 *     summary: Settle payment with NBE retention
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exchangeRate
 *               - retentionRate
 *               - payingBank
 *               - payingBankBIC
 *               - swiftReference
 *               - nbeApprovalRef
 *             properties:
 *               exchangeRate:
 *                 type: string
 *               retentionRate:
 *                 type: string
 *               payingBank:
 *                 type: string
 *               payingBankBIC:
 *                 type: string
 *               swiftReference:
 *                 type: string
 *               nbeApprovalRef:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment settled successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/settle',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('exchangeRate').notEmpty().withMessage('Exchange rate is required'),
    body('retentionRate').notEmpty().withMessage('Retention rate is required'),
    body('payingBank').notEmpty().withMessage('Paying bank is required'),
    body('payingBankBIC').notEmpty().withMessage('Paying bank BIC is required'),
    body('swiftReference').notEmpty().withMessage('SWIFT reference is required'),
    body('nbeApprovalRef').notEmpty().withMessage('NBE approval reference is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { exchangeRate, retentionRate, payingBank, payingBankBIC, swiftReference, nbeApprovalRef } = req.body;

      logger.info(`[PAYMENT] Settling payment: ${paymentID}`);

      await fabricService.connectAsOrg('NBEMSP');

      const result = await fabricService.invokeChaincode('SettlePayment', [
        paymentID,
        exchangeRate.toString(),
        retentionRate.toString(),
        payingBank,
        payingBankBIC,
        swiftReference,
        nbeApprovalRef,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Payment settled: ${paymentID}`);
        res.json({
          success: true,
          message: 'Payment settled successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to settle payment: ${result.error}`);
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
      logger.error('[PAYMENT] Error settling payment:', error);
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
 * /api/v1/payments/{paymentID}/confirm:
 *   put:
 *     summary: Confirm payment settlement
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmedBy
 *               - confirmationType
 *             properties:
 *               confirmedBy:
 *                 type: string
 *               confirmationType:
 *                 type: string
 *                 enum: [BANK_VERIFICATION, NBE_APPROVAL, FOREX_REPATRIATION]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:paymentID/confirm',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('confirmedBy').notEmpty().withMessage('Confirmed by is required'),
    body('confirmationType').notEmpty().withMessage('Confirmation type is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { confirmedBy, confirmationType, remarks } = req.body;

      logger.info(`[PAYMENT] Confirming payment: ${paymentID} by ${confirmedBy}`);

      // Connect as appropriate MSP based on confirmation type
      if (confirmationType === 'NBE_APPROVAL') {
        await fabricService.connectAsOrg('NBEMSP');
      } else {
        await fabricService.connectAsOrg('BanksMSP');
      }

      const result = await fabricService.invokeChaincode('ConfirmSettlement', [
        paymentID,
        confirmedBy,
        confirmationType,
        remarks || '',
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Payment confirmed successfully: ${paymentID}`);
        res.json({
          success: true,
          message: 'Payment settlement confirmed',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to confirm payment: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'CONFIRMATION_FAILED',
            message: result.error || 'Failed to confirm payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error confirming payment:', error);
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
 * /api/v1/payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: shipmentID
 *         schema:
 *           type: string
 *         description: Filter by shipment ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: List of payments retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { shipmentID, status, dateFrom, dateTo } = req.query;

    logger.info('[PAYMENT] Fetching payments with filters:', { shipmentID, status, dateFrom, dateTo });

    let result;
    if (shipmentID) {
      result = await fabricService.queryChaincode('GetPaymentsByShipment', [shipmentID as string]);
    } else {
      result = await fabricService.queryChaincode('QueryAllPayments', []);
    }

    if (result.success) {
      let payments = result.data || [];

      // Apply additional filters
      if (status) {
        payments = payments.filter((payment: any) => payment.status === status);
      }
      if (dateFrom || dateTo) {
        payments = payments.filter((payment: any) => {
          const paymentDate = new Date(payment.paymentDate || payment.timestamp);
          if (dateFrom && paymentDate < new Date(dateFrom as string)) return false;
          if (dateTo && paymentDate > new Date(dateTo as string)) return false;
          return true;
        });
      }

      res.json({
        success: true,
        data: payments,
        count: payments.length,
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
    logger.error('[PAYMENT] Error retrieving payments:', error);
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
 * /api/v1/payments/{paymentID}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:paymentID',
  [param('paymentID').notEmpty().withMessage('Payment ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;

      logger.info(`[PAYMENT] Fetching payment details: ${paymentID}`);

      const result = await fabricService.queryChaincode('ReadPayment', [paymentID]);

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
            message: result.error || 'Payment not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error retrieving payment:', error);
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
 * /api/v1/payments/{paymentID}/forex-repatriation:
 *   post:
 *     summary: Record forex repatriation for a payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repatriationAmount
 *               - repatriationCurrency
 *               - exchangeRate
 *             properties:
 *               repatriationAmount:
 *                 type: number
 *               repatriationCurrency:
 *                 type: string
 *               exchangeRate:
 *                 type: number
 *               swiftReference:
 *                 type: string
 *               nbeApprovalRef:
 *                 type: string
 *     responses:
 *       200:
 *         description: Forex repatriation recorded successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/forex-repatriation',
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('repatriationAmount').isNumeric().withMessage('Repatriation amount must be a number'),
    body('repatriationCurrency').notEmpty().withMessage('Currency is required'),
    body('exchangeRate').isNumeric().withMessage('Exchange rate must be a number'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const {
        repatriationAmount,
        repatriationCurrency,
        exchangeRate,
        swiftReference,
        nbeApprovalRef,
      } = req.body;

      logger.info(`[PAYMENT] Recording forex repatriation for payment: ${paymentID}`);

      // Connect as NBEMSP for forex operations
      await fabricService.connectAsOrg('NBEMSP');

      const result = await fabricService.invokeChaincode('RecordForexRepatriation', [
        paymentID,
        repatriationAmount.toString(),
        repatriationCurrency,
        exchangeRate.toString(),
        swiftReference || '',
        nbeApprovalRef || '',
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Forex repatriation recorded: ${paymentID}`);
        res.json({
          success: true,
          message: 'Forex repatriation recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to record forex repatriation: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'REPATRIATION_FAILED',
            message: result.error || 'Failed to record forex repatriation',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error recording forex repatriation:', error);
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
