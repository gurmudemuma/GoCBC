// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// SWIFT Message Management API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param, query } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/swift/messages:
 *   post:
 *     summary: Create a SWIFT message
 *     tags: [SWIFT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageID
 *               - messageType
 *               - swiftReference
 *               - senderBIC
 *               - receiverBIC
 *               - amount
 *               - currency
 *             properties:
 *               messageID:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [MT103, MT700, MT707, MT750, MT752]
 *               swiftReference:
 *                 type: string
 *               senderBIC:
 *                 type: string
 *               receiverBIC:
 *                 type: string
 *               amount:
 *                 type: string
 *               currency:
 *                 type: string
 *               valueDate:
 *                 type: string
 *               beneficiary:
 *                 type: string
 *               remittanceInfo:
 *                 type: string
 */

router.post('/messages',
  authMiddleware,
  [
    body('messageID').notEmpty().withMessage('Message ID is required'),
    body('messageType').notEmpty().isIn(['MT103', 'MT700', 'MT707', 'MT750', 'MT752', 'MT710', 'MT730', 'MT910'])
      .withMessage('Valid message type is required'),
    body('swiftReference').notEmpty().withMessage('SWIFT reference is required'),
    body('senderBIC').notEmpty().withMessage('Sender BIC is required'),
    body('receiverBIC').notEmpty().withMessage('Receiver BIC is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID,
        messageType,
        swiftReference,
        senderBIC,
        receiverBIC,
        amount,
        currency,
        valueDate,
        beneficiary,
        remittanceInfo,
        // Additional fields
        linkedLcId,
        linkedPaymentId,
        orderingCustomer,
        beneficiaryAccount,
        chargeCode,
        // LC fields
        lcNumber,
        applicant,
        lcExpiryDate,
        loadingPort,
        dischargePort,
        latestShipDate,
        documents,
        // Discrepancy fields
        discrepancyDetails,
        discrepancyList,
      } = req.body;

      logger.info('[SWIFT] Creating message:', { messageID, messageType, senderBIC, receiverBIC });

      // Route to specialized chaincode function based on message type
      let result;
      
      switch (messageType) {
        case 'MT700':
          result = await fabricService.invokeChaincode('CreateMT700_IssueLC', [
            messageID,
            linkedLcId || '',
            swiftReference,
            senderBIC,
            receiverBIC,
            applicant || '',
            beneficiary || '',
            amount?.toString() || '0',
            currency || 'USD',
            lcExpiryDate || '',
            loadingPort || '',
            dischargePort || '',
            latestShipDate || '',
          ]);
          
          // Add documents and linkedLcId if provided
          if (result.success && (documents || linkedLcId)) {
            if (documents && Array.isArray(documents)) {
              await fabricService.invokeChaincode('AddSWIFTDocuments', [
                messageID,
                JSON.stringify(documents),
              ]);
            }
            if (linkedLcId) {
              await fabricService.invokeChaincode('LinkSWIFTMessageToLC', [
                messageID,
                linkedLcId,
              ]);
            }
          }
          break;
          
        case 'MT103':
          result = await fabricService.invokeChaincode('CreateMT103_Payment', [
            messageID,
            swiftReference,
            senderBIC,
            receiverBIC,
            linkedPaymentId || '',
            orderingCustomer || '',
            beneficiary || '',
            beneficiaryAccount || '',
            amount?.toString() || '0',
            currency || 'USD',
            valueDate || '',
            remittanceInfo || '',
            chargeCode || 'SHA',
          ]);
          
          // Link to LC if provided
          if (result.success && linkedLcId) {
            await fabricService.invokeChaincode('LinkSWIFTMessageToLC', [
              messageID,
              linkedLcId,
            ]);
          }
          break;
          
        case 'MT750':
          result = await fabricService.invokeChaincode('CreateMT750_Discrepancy', [
            messageID,
            linkedLcId || lcNumber || '',
            swiftReference,
            senderBIC,
            receiverBIC,
            discrepancyDetails || '',
            JSON.stringify(discrepancyList || []),
          ]);
          break;
          
        default:
          // Use generic CreateSWIFTMessage for other types
          result = await fabricService.invokeChaincode('CreateSWIFTMessage', [
            messageID,
            messageType,
            swiftReference,
            senderBIC,
            receiverBIC,
            currency || 'USD',
            amount?.toString() || '0',
            valueDate || '',
            beneficiary || '',
            remittanceInfo || '',
          ]);
          
          // Add additional fields if provided
          if (result.success) {
            if (linkedLcId) {
              await fabricService.invokeChaincode('LinkSWIFTMessageToLC', [
                messageID,
                linkedLcId,
              ]);
            }
            if (linkedPaymentId) {
              await fabricService.invokeChaincode('LinkSWIFTMessageToPayment', [
                messageID,
                linkedPaymentId,
              ]);
            }
            if (orderingCustomer) {
              await fabricService.invokeChaincode('UpdateSWIFTMessageField', [
                messageID,
                'orderingCustomer',
                orderingCustomer,
              ]);
            }
            if (beneficiaryAccount) {
              await fabricService.invokeChaincode('UpdateSWIFTMessageField', [
                messageID,
                'beneficiaryAccount',
                beneficiaryAccount,
              ]);
            }
          }
      }

      if (result.success) {
        logger.info(`✅ SWIFT message created: ${messageID} (${messageType})`);
        res.status(201).json({
          success: true,
          data: { messageID, messageType, swiftReference },
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'SWIFT_MESSAGE_CREATE_FAILED',
            message: result.error || 'Failed to create SWIFT message',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating message:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/mt700
 * Create MT700 (LC Issuance) message
 */
router.post('/messages/mt700',
  authMiddleware,
  [
    body('messageID').notEmpty(),
    body('lcID').notEmpty(),
    body('swiftReference').notEmpty(),
    body('senderBIC').notEmpty(),
    body('receiverBIC').notEmpty(),
    body('applicant').notEmpty(),
    body('beneficiary').notEmpty(),
    body('amount').notEmpty(),
    body('currency').notEmpty(),
    body('expiryDate').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        applicant, beneficiary, amount, currency, expiryDate,
        loadingPort, dischargePort, latestShipDate,
      } = req.body;

      logger.info('[SWIFT] Creating MT700 for LC:', lcID);

      const result = await fabricService.invokeChaincode('CreateMT700_IssueLC', [
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        applicant, beneficiary, amount.toString(), currency, expiryDate,
        loadingPort || '', dischargePort || '', latestShipDate || '',
      ]);

      if (result.success) {
        logger.info(`✅ MT700 created for LC: ${lcID}`);
        res.status(201).json({
          success: true,
          data: { messageID, lcID, messageType: 'MT700' },
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'MT700_CREATE_FAILED',
            message: result.error || 'Failed to create MT700',
          },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating MT700:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/mt707
 * Create MT707 (LC Amendment) message
 */
router.post('/messages/mt707',
  authMiddleware,
  [
    body('messageID').notEmpty(),
    body('lcID').notEmpty(),
    body('swiftReference').notEmpty(),
    body('amendmentReason').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        amendmentReason, newAmount, newExpiryDate, amendmentNumber,
      } = req.body;

      logger.info('[SWIFT] Creating MT707 for LC:', lcID);

      const result = await fabricService.invokeChaincode('CreateMT707_AmendLC', [
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        amendmentReason, newAmount?.toString() || '', newExpiryDate || '',
        amendmentNumber || 1,
      ]);

      if (result.success) {
        logger.info(`✅ MT707 created for LC: ${lcID}`);
        res.status(201).json({
          success: true,
          data: { messageID, lcID, messageType: 'MT707' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'MT707_CREATE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating MT707:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/mt103
 * Create MT103 (Customer Payment) message
 */
router.post('/messages/mt103',
  authMiddleware,
  [
    body('messageID').notEmpty(),
    body('swiftReference').notEmpty(),
    body('amount').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID, swiftReference, senderBIC, receiverBIC, paymentID,
        orderingCustomer, beneficiary, beneficiaryAccount,
        amount, currency, valueDate, remittanceInfo, chargeCode,
      } = req.body;

      logger.info('[SWIFT] Creating MT103 for payment:', paymentID);

      const result = await fabricService.invokeChaincode('CreateMT103_Payment', [
        messageID, swiftReference, senderBIC, receiverBIC, paymentID || '',
        orderingCustomer || '', beneficiary || '', beneficiaryAccount || '',
        amount.toString(), currency || 'USD', valueDate || '',
        remittanceInfo || '', chargeCode || 'SHA',
      ]);

      if (result.success) {
        logger.info(`✅ MT103 created for payment: ${paymentID}`);
        res.status(201).json({
          success: true,
          data: { messageID, paymentID, messageType: 'MT103' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'MT103_CREATE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating MT103:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/mt750
 * Create MT750 (Discrepancy Report) message
 */
router.post('/messages/mt750',
  authMiddleware,
  [
    body('messageID').notEmpty(),
    body('lcID').notEmpty(),
    body('swiftReference').notEmpty(),
    body('discrepancyDetails').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        discrepancyDetails, discrepancyList,
      } = req.body;

      logger.info('[SWIFT] Creating MT750 for LC:', lcID);

      const result = await fabricService.invokeChaincode('CreateMT750_Discrepancy', [
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        discrepancyDetails, JSON.stringify(discrepancyList || []),
      ]);

      if (result.success) {
        logger.info(`✅ MT750 created for LC: ${lcID}`);
        res.status(201).json({
          success: true,
          data: { messageID, lcID, messageType: 'MT750' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'MT750_CREATE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating MT750:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/mt752
 * Create MT752 (Authorization to Pay) message
 */
router.post('/messages/mt752',
  authMiddleware,
  [
    body('messageID').notEmpty(),
    body('lcID').notEmpty(),
    body('amount').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        amount, currency,
      } = req.body;

      logger.info('[SWIFT] Creating MT752 for LC:', lcID);

      const result = await fabricService.invokeChaincode('CreateMT752_AuthPayment', [
        messageID, lcID, swiftReference, senderBIC, receiverBIC,
        amount.toString(), currency || 'USD',
      ]);

      if (result.success) {
        logger.info(`✅ MT752 created for LC: ${lcID}`);
        res.status(201).json({
          success: true,
          data: { messageID, lcID, messageType: 'MT752' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'MT752_CREATE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error creating MT752:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/approve
 * Approve a SWIFT message for sending
 */
router.post('/messages/:messageID/approve',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const user = (req as any).user;
      const approvedBy = user?.sub || user?.userId || 'SYSTEM';

      logger.info('[SWIFT] Approving message:', messageID);

      const result = await fabricService.invokeChaincode('ApproveSWIFTMessage', [
        messageID,
        approvedBy,
      ]);

      if (result.success) {
        logger.info(`✅ SWIFT message approved: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'APPROVED' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'APPROVE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error approving message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/send
 * Send an approved SWIFT message
 */
router.post('/messages/:messageID/send',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const user = (req as any).user;
      const sentBy = user?.sub || user?.userId || 'SYSTEM';

      logger.info('[SWIFT] Sending message:', messageID);

      const result = await fabricService.invokeChaincode('SendSWIFTMessage', [
        messageID,
        sentBy,
      ]);

      if (result.success) {
        logger.info(`✅ SWIFT message sent: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'SENT' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'SEND_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error sending message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/receive
 * Mark a message as received
 */
router.post('/messages/:messageID/receive',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const user = (req as any).user;
      const receivedBy = user?.sub || user?.userId || 'SYSTEM';

      logger.info('[SWIFT] Receiving message:', messageID);

      const result = await fabricService.invokeChaincode('ReceiveSWIFTMessage', [
        messageID,
        receivedBy,
      ]);

      if (result.success) {
        logger.info(`✅ SWIFT message received: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'RECEIVED' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'RECEIVE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error receiving message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/process
 * Process a received message
 */
router.post('/messages/:messageID/process',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const user = (req as any).user;
      const processedBy = user?.sub || user?.userId || 'SYSTEM';

      const result = await fabricService.invokeChaincode('ProcessSWIFTMessage', [
        messageID,
        processedBy,
      ]);

      if (result.success) {
        logger.info(`✅ SWIFT message processed: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'PROCESSING' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'PROCESS_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error processing message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/settle
 * Mark a message as settled
 */
router.post('/messages/:messageID/settle',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;

      const result = await fabricService.invokeChaincode('SettleSWIFTMessage', [messageID]);

      if (result.success) {
        logger.info(`✅ SWIFT message settled: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'SETTLED' },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'SETTLE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error settling message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/reject
 * Reject a message with reason
 */
router.post('/messages/:messageID/reject',
  authMiddleware,
  [
    param('messageID').notEmpty(),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const { reason, errorCode } = req.body;

      const result = await fabricService.invokeChaincode('RejectSWIFTMessage', [
        messageID,
        reason,
        errorCode || 'G99',
      ]);

      if (result.success) {
        logger.info(`✅ SWIFT message rejected: ${messageID}`);
        res.json({
          success: true,
          data: { messageID, status: 'REJECTED', reason },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'REJECT_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error rejecting message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * GET /api/v1/swift/messages/:messageID
 * Get SWIFT message details
 */
router.get('/messages/:messageID',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;

      const result = await fabricService.queryChaincode('ReadSWIFTMessage', [messageID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'MESSAGE_NOT_FOUND', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error reading message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * GET /api/v1/swift/messages
 * Get all SWIFT messages or filter by query parameters
 */
router.get('/messages',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { type, status, lcId, paymentId, reference, bic, direction } = req.query;

      let result;

      if (type) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByType', [type as string]);
      } else if (status) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByStatus', [status as string]);
      } else if (lcId) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByLC', [lcId as string]);
      } else if (paymentId) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByPayment', [paymentId as string]);
      } else if (reference) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByReference', [reference as string]);
      } else if (bic) {
        result = await fabricService.queryChaincode('QuerySWIFTMessagesByBIC', [
          bic as string,
          (direction as string) || 'ALL',
        ]);
      } else {
        result = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
      }

      if (result.success) {
        res.json({
          success: true,
          data: result.data || [],
          count: Array.isArray(result.data) ? result.data.length : 0,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: { code: 'QUERY_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error querying messages:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * GET /api/v1/swift/statistics
 * Get SWIFT message statistics
 */
router.get('/statistics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await fabricService.queryChaincode('GetSWIFTMessageStatistics', []);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: { code: 'STATISTICS_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * POST /api/v1/swift/messages/:messageID/validate
 * Validate message before sending
 */
router.post('/messages/:messageID/validate',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;

      const result = await fabricService.queryChaincode('ValidateSWIFTMessageComplete', [messageID]);

      if (result.success) {
        const isValid = result.data?.[0] || false;
        const errors = result.data?.[1] || [];

        res.json({
          success: true,
          data: {
            messageID,
            isValid,
            errors,
            validated: new Date().toISOString(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error validating message:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

export default router;
