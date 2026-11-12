// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// SWIFT Message Management API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import notificationService from '../services/notificationService';
import { validateRequest } from '../middleware/validation';
import { authMiddleware, requireRole } from '../middleware/auth';
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
        // In-app notification (persisted feed + live WS broadcast).
        // The linked LC / payment ids resolve the exporter audience
        // (notificationService.resolveExporterIdForEntity, 'swift'):
        // without them the row is BANKS/NBE-only and the exporter
        // never sees their own SWIFT message.
        await notificationService.emitWorkflowEvent({
          type: 'swift_message_created',
          title: `SWIFT ${messageType} message ${messageID} created`,
          message: `SWIFT message ${messageID} (${messageType}, ref ${swiftReference}) was created.`,
          entityType: 'swift', entityId: messageID, severity: 'info',
          roles: ['BANKS', 'NBE'], lcId: linkedLcId, paymentId: linkedPaymentId,
          actionUrl: '/portals/banks?tab=swift-messages',
          actionUrls: { BANKS: '/portals/banks?tab=swift-messages', NBE: '/portals/nbe?tab=contracts', EXPORTER: '/portals/exporter?tab=5' },
        });
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
        // In-app notification (persisted feed + live WS broadcast).
        // This route previously emitted nothing, so an MT700 created
        // here notified nobody; lcId resolves the exporter audience.
        await notificationService.emitWorkflowEvent({
          type: 'swift_message_created',
          title: `SWIFT MT700 message ${messageID} created`,
          message: `SWIFT message ${messageID} (MT700, ref ${swiftReference}) was created for LC ${lcID}.`,
          entityType: 'swift', entityId: messageID, severity: 'info',
          roles: ['BANKS', 'NBE'], lcId: lcID,
          actionUrl: '/portals/banks?tab=swift-messages',
          actionUrls: { BANKS: '/portals/banks?tab=swift-messages', NBE: '/portals/nbe?tab=contracts', EXPORTER: '/portals/exporter?tab=5' },
        });
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
 * POST /api/v1/swift/messages/:messageID/nbe-approve
 * NBE (National Bank of Ethiopia) approval for SWIFT messages
 * Additional regulatory approval layer for high-value transactions
 */
router.post('/messages/:messageID/nbe-approve',
  authMiddleware,
  [
    param('messageID').notEmpty(),
    body('approvedBy').notEmpty().withMessage('NBE approver required'),
    body('amlCheck').notEmpty().isIn(['PASS', 'FAIL']).withMessage('AML check result required'),
    body('sanctionScreening').notEmpty().isIn(['PASS', 'FAIL']).withMessage('Sanction screening result required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { messageID } = req.params;
      const { approvedBy, amlCheck, sanctionScreening, comments } = req.body;
      const user = (req as any).user;

      logger.info(`[SWIFT] NBE approving message: ${messageID}`);

      // Verify user has NBE role
      if (user?.org !== 'NBE' && user?.organization !== 'NBE') {
        return res.status(403).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Only NBE users can approve SWIFT messages' },
        });
      }

      // Check compliance requirements
      if (amlCheck === 'FAIL' || sanctionScreening === 'FAIL') {
        logger.warn(`[SWIFT] ⚠️ Compliance check failed for message: ${messageID}`);
        return res.status(400).json({
          success: false,
          error: { 
            code: 'COMPLIANCE_FAILURE', 
            message: 'Message failed AML or sanctions screening',
            details: { amlCheck, sanctionScreening }
          },
        });
      }

      // Submit NBE approval to blockchain, pinned to NBEMSP: the chaincode
      // enforces "only NBE can approve SWIFT messages" (swift.go) and the
      // shared gateway otherwise signs as whatever org the previous
      // concurrent request connected as (cb12f0b4 precedent).
      const result = await fabricService.invokeChaincode('NBEApproveSWIFTMessage', [
        messageID,
        approvedBy,
        amlCheck,
        sanctionScreening,
        comments || 'NBE approved after compliance review',
        new Date().toISOString(),
      ], 'NBEMSP');

      if (result.success) {
        logger.info(`✅ NBE approved SWIFT message: ${messageID}`);
        res.json({
          success: true,
          data: { 
            messageID, 
            status: 'NBE_APPROVED',
            approvedBy,
            approvalDate: new Date().toISOString(),
            compliance: { amlCheck, sanctionScreening }
          },
          txId: result.txId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'NBE_APPROVE_FAILED', message: result.error },
        });
      }
    } catch (error: any) {
      logger.error('[SWIFT] Error in NBE approval:', error);
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
        // In-app notification (persisted feed + live WS broadcast).
        // SWIFT rows are not mirrored in Postgres, so resolve the
        // exporter audience from the ledger message itself (its
        // linkedLcId / linkedPaymentId, swift.go). Best-effort: a
        // failed ledger read falls back to the role-only rows and
        // never fails the receive.
        let swiftLcId: string | undefined;
        let swiftPaymentId: string | undefined;
        try {
          const msgResult = await fabricService.queryChaincode('ReadSWIFTMessage', [messageID]);
          const raw = (msgResult as any)?.data;
          const doc = typeof raw === 'string'
            ? JSON.parse(raw)
            : (raw?.data ?? raw);
          swiftLcId = doc?.linkedLcId || doc?.linkedLCID || undefined;
          swiftPaymentId = doc?.linkedPaymentId || doc?.linkedPaymentID || undefined;
        } catch (lookupError) {
          logger.warn(`[SWIFT] Could not read message ${messageID} for notification audience (role-only notification):`, lookupError);
        }
        await notificationService.emitWorkflowEvent({
          type: 'swift_received',
          title: `SWIFT message ${messageID} received`,
          message: `SWIFT message ${messageID} was received.`,
          entityType: 'swift', entityId: messageID, severity: 'info',
          roles: ['BANKS', 'NBE'], lcId: swiftLcId, paymentId: swiftPaymentId,
          actionUrl: '/portals/banks?tab=swift-messages',
          actionUrls: { BANKS: '/portals/banks?tab=swift-messages', NBE: '/portals/nbe?tab=contracts', EXPORTER: '/portals/exporter?tab=5' },
        });
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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
  requireRole('BANKS', 'BANK_ADMIN'),
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

/** Read the real Fabric history and QSCC proof for a SWIFT message key. */
router.get('/messages/:messageID/ledger-proof',
  authMiddleware,
  [param('messageID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const historyResult = await fabricService.queryChaincode('GetHistory', [req.params.messageID]);
      if (!historyResult.success) {
        return res.status(503).json({
          success: false,
          error: { code: 'LEDGER_HISTORY_UNAVAILABLE', message: historyResult.error || 'Could not read Fabric history' },
        });
      }

      const entries = Array.isArray(historyResult.data) ? historyResult.data : [];
      const events = await Promise.all(entries.map(async (entry: any) => {
        const txId = entry.TxId || entry.txId;
        const transaction = txId ? await fabricService.getTransactionDetails(txId).catch(() => null) : null;
        const cryptographicallyVerified = !!transaction &&
          transaction.validationStatus === 'VALID' &&
          transaction.creator?.signatureValid === true &&
          transaction.creator?.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT' &&
          transaction.endorsers?.length > 0 &&
          transaction.endorsers.every((endorser: any) =>
            endorser.signatureValid === true &&
            endorser.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT'
          );

        return {
          txId: txId || null,
          timestamp: entry.Timestamp || entry.timestamp || transaction?.timestamp || null,
          isDelete: Boolean(entry.IsDelete ?? entry.isDelete),
          state: entry.Value ?? entry.value ?? null,
          transaction,
          cryptographicallyVerified,
        };
      }));

      return res.json({
        success: true,
        data: {
          channelId: process.env.FABRIC_CHANNEL_NAME || 'coffeechannel',
          messageId: req.params.messageID,
          events,
          verified: events.length > 0 && events.every((event: any) => event.cryptographicallyVerified),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[SWIFT] Error retrieving Fabric ledger proof:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'LEDGER_PROOF_ERROR', message: error.message || 'Failed to retrieve ledger proof' },
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
        // Use CouchDB direct query (instant, no Fabric SDK timeout)
        const { CouchDBDirectService } = require('../services/couchDBDirectService');
        const couchDBService = new CouchDBDirectService();
        try {
          const messages = await couchDBService.queryAllSWIFTMessages();
          result = { success: true, data: messages };
          logger.info(`[SWIFT] ✅ Fetched ${messages.length} SWIFT messages from CouchDB (direct query)`);
        } catch (couchErr) {
          logger.warn('[SWIFT] CouchDB direct query failed, trying Fabric SDK...', couchErr);
          result = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
        }
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
  requireRole('BANKS', 'BANK_ADMIN'),
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

/**
 * GET /api/v1/swift
 * Base SWIFT route - Get overview/dashboard
 */
router.get('/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Get SWIFT statistics and recent messages
      const statsResult = await fabricService.queryChaincode('GetSWIFTMessageStatistics', []);
      
      // Get recent messages (limit to 10)
      const { CouchDBDirectService } = require('../services/couchDBDirectService');
      const couchDBService = new CouchDBDirectService();
      let recentMessages = [];
      try {
        const allMessages = await couchDBService.queryAllSWIFTMessages();
        recentMessages = allMessages.slice(0, 10);
      } catch (couchErr) {
        logger.warn('[SWIFT] CouchDB query failed for recent messages, using Fabric...', couchErr);
        const messagesResult = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
        if (messagesResult.success) {
          recentMessages = (messagesResult.data || []).slice(0, 10);
        }
      }

      res.json({
        success: true,
        data: {
          statistics: statsResult.success ? statsResult.data : {},
          recentMessages,
          overview: {
            totalMessages: statsResult.data?.total || 0,
            pendingApproval: statsResult.data?.pendingApproval || 0,
            sent: statsResult.data?.sent || 0,
            received: statsResult.data?.received || 0,
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[SWIFT] Error fetching overview:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * GET /api/v1/swift/analytics
 * Get SWIFT analytics data
 */
router.get('/analytics',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, messageType, bic } = req.query;
      
      // Get all messages for analytics
      const { CouchDBDirectService } = require('../services/couchDBDirectService');
      const couchDBService = new CouchDBDirectService();
      let messages = [];
      
      try {
        messages = await couchDBService.queryAllSWIFTMessages();
      } catch (couchErr) {
        logger.warn('[SWIFT] CouchDB query failed for analytics, using Fabric...', couchErr);
        const result = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
        if (result.success) {
          messages = result.data || [];
        }
      }

      // Filter by date range if provided
      if (dateFrom || dateTo) {
        messages = messages.filter((msg: any) => {
          const msgDate = new Date(msg.createdAt || msg.timestamp);
          if (dateFrom && msgDate < new Date(dateFrom as string)) return false;
          if (dateTo && msgDate > new Date(dateTo as string)) return false;
          return true;
        });
      }

      // Filter by message type if provided
      if (messageType) {
        messages = messages.filter((msg: any) => msg.messageType === messageType);
      }

      // Filter by BIC if provided
      if (bic) {
        messages = messages.filter((msg: any) => 
          msg.senderBIC === bic || msg.receiverBIC === bic
        );
      }

      // Calculate analytics
      const byType = messages.reduce((acc: any, msg: any) => {
        const type = msg.messageType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const byStatus = messages.reduce((acc: any, msg: any) => {
        const status = msg.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const byCurrency = messages.reduce((acc: any, msg: any) => {
        const currency = msg.currency || 'USD';
        const amount = parseFloat(msg.amount || '0');
        if (!acc[currency]) acc[currency] = { count: 0, total: 0 };
        acc[currency].count++;
        acc[currency].total += amount;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          total: messages.length,
          byType,
          byStatus,
          byCurrency,
          filters: { dateFrom, dateTo, messageType, bic }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[SWIFT] Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

/**
 * GET /api/v1/swift/compliance
 * Get SWIFT compliance dashboard data
 */
router.get('/compliance',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, dateFrom, dateTo } = req.query;
      
      // Get all messages for compliance review
      const { CouchDBDirectService } = require('../services/couchDBDirectService');
      const couchDBService = new CouchDBDirectService();
      let messages = [];
      
      try {
        messages = await couchDBService.queryAllSWIFTMessages();
      } catch (couchErr) {
        logger.warn('[SWIFT] CouchDB query failed for compliance, using Fabric...', couchErr);
        const result = await fabricService.queryChaincode('QueryAllSWIFTMessages', []);
        if (result.success) {
          messages = result.data || [];
        }
      }

      // Filter by status if provided
      if (status) {
        messages = messages.filter((msg: any) => msg.status === status);
      }

      // Filter by date range if provided
      if (dateFrom || dateTo) {
        messages = messages.filter((msg: any) => {
          const msgDate = new Date(msg.createdAt || msg.timestamp);
          if (dateFrom && msgDate < new Date(dateFrom as string)) return false;
          if (dateTo && msgDate > new Date(dateTo as string)) return false;
          return true;
        });
      }

      // Calculate compliance metrics
      const pendingApproval = messages.filter((msg: any) => msg.status === 'PENDING_NBE_APPROVAL').length;
      const nbeApproved = messages.filter((msg: any) => msg.status === 'NBE_APPROVED').length;
      const rejected = messages.filter((msg: any) => msg.status === 'REJECTED').length;
      const flagged = messages.filter((msg: any) => 
        msg.amlCheck === 'FLAGGED' || msg.sanctionScreening === 'FLAGGED'
      ).length;

      // High-value transactions (>$100k)
      const highValue = messages.filter((msg: any) => parseFloat(msg.amount || '0') > 100000).length;

      res.json({
        success: true,
        data: {
          total: messages.length,
          pendingApproval,
          nbeApproved,
          rejected,
          flagged,
          highValue,
          complianceRate: messages.length > 0 
            ? ((nbeApproved / messages.length) * 100).toFixed(2) + '%' 
            : '0%',
          messages: messages.slice(0, 50), // Return first 50 for display
          filters: { status, dateFrom, dateTo }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[SWIFT] Error fetching compliance data:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
);

export default router;
