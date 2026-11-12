// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Payment Settlement & Verification API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { PaymentService } from '../services/paymentService';
import { logger } from '../utils/logger';
import notificationService from '../services/notificationService';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';
import { statusManager } from '../utils/statusManager';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();
const paymentService = PaymentService.getInstance();

/**
 * Best-effort PG mirror of a payment's settlement-machine status.
 * Ledger-first: only called after the chaincode call succeeded, and a
 * PG failure never fails the response (same pattern as the initiate
 * mirror at POST /initiate and the settle mirror below). A no-op when
 * the payment has no PG row yet — e.g. LC-release-path payments are
 * chaincode-only (banking.ts ReleaseLCPayment writes no PG row), so
 * their mirrors affect 0 rows until a PG row exists.
 */
async function mirrorPaymentStatus(
  paymentID: string,
  status: string,
  swiftReference?: string,
): Promise<void> {
  try {
    if (swiftReference !== undefined) {
      await postgresDb.run(
        `UPDATE payments SET status = $1, swift_reference = $2 WHERE payment_id = $3`,
        [status, swiftReference, paymentID],
      );
    } else {
      await postgresDb.run(
        `UPDATE payments SET status = $1 WHERE payment_id = $2`,
        [status, paymentID],
      );
    }
  } catch (mirrorErr) {
    logger.warn(`[PAYMENT] Could not mirror ${status} of ${paymentID} to Postgres:`, mirrorErr);
  }
}

type SwiftSettleGuard =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * C1 guard for the settle handler: never settle against a REJECTED SWIFT
 * message. Chaincode SettlePayment (payment.go) never looks at any SWIFT
 * message — it only stores the supplied swiftReference — so the API must
 * check. swiftReference is a *field* on a SWIFT message (swift.go
 * QuerySWIFTMessagesByReference selects on `swiftReference`), not a
 * message ID, so resolve it two ways: by reference, and by the messages
 * linked to this payment (catches a caller supplying a fresh reference
 * to dodge a rejected one).
 *
 * Exact rule:
 * - Any collected message with status REJECTED → 400 SWIFT_MESSAGE_REJECTED.
 * - SWIFT_RECEIVED payments must be corroborated: the reference has to
 *   resolve to a SWIFT message (by reference or by payment link) OR match
 *   the reference the SWIFT flow itself recorded on the payment
 *   (payment.swiftDetails.swiftReference — InitiateSWIFTTransfer writes
 *   it there and creates no SWIFT message doc, so "no doc" alone must
 *   NOT block that flow; the missing-steps suite settles SWIFT_RECEIVED
 *   payments this way with SWIFT-$TS). Otherwise → 400
 *   SWIFT_MESSAGE_NOT_FOUND: the payment claims SWIFT was received yet
 *   the reference matches nothing the ledger knows.
 * - VERIFIED payments need no SWIFT message at all: SettlePayment
 *   accepts VERIFIED directly, and the crud suite settles VERIFIED
 *   payments with invented references (SWIFT-SETTLE-<ts>) that resolve
 *   to no message. Only a REJECTED message (above) blocks them.
 * - A failed SWIFT lookup itself (ledger error, not "no message") →
 *   503 SWIFT_LOOKUP_FAILED: fail closed, do not settle blind.
 */
async function checkSwiftForSettle(
  paymentID: string,
  swiftReference: string,
  paymentStatus: string,
  payment: any,
): Promise<SwiftSettleGuard> {
  const byReference = await fabricService.queryChaincode('QuerySWIFTMessagesByReference', [swiftReference]);
  if (!byReference.success) {
    return {
      ok: false,
      status: 503,
      code: 'SWIFT_LOOKUP_FAILED',
      message: `Could not verify SWIFT message for reference ${swiftReference} on the ledger: ${byReference.error || 'query failed'}`,
    };
  }
  const byPayment = await fabricService.queryChaincode('QuerySWIFTMessagesByPayment', [paymentID]);
  if (!byPayment.success) {
    return {
      ok: false,
      status: 503,
      code: 'SWIFT_LOOKUP_FAILED',
      message: `Could not verify SWIFT messages for payment ${paymentID} on the ledger: ${byPayment.error || 'query failed'}`,
    };
  }
  const messages: any[] = [
    ...(Array.isArray(byReference.data) ? byReference.data : []),
    ...(Array.isArray(byPayment.data) ? byPayment.data : []),
  ];
  const rejected = messages.find((m: any) => (m?.status || m?.Status) === 'REJECTED');
  if (rejected) {
    const rejectedId = rejected.messageId || rejected.MessageID || rejected.messageID || swiftReference;
    const reason = rejected.rejectionReason || rejected.RejectionReason;
    return {
      ok: false,
      status: 400,
      code: 'SWIFT_MESSAGE_REJECTED',
      message: `Cannot settle payment: SWIFT message ${rejectedId} (reference ${swiftReference}) is REJECTED${reason ? `: ${reason}` : ''}`,
    };
  }
  if (paymentStatus === 'SWIFT_RECEIVED') {
    const swiftDetails = payment?.swiftDetails || payment?.SWIFTDetails;
    const storedRef = swiftDetails?.swiftReference || swiftDetails?.SWIFTReference;
    if (messages.length === 0 && storedRef !== swiftReference) {
      return {
        ok: false,
        status: 400,
        code: 'SWIFT_MESSAGE_NOT_FOUND',
        message: `Cannot settle payment: no SWIFT message found for reference ${swiftReference} and it does not match the reference recorded on the payment`,
      };
    }
  }
  return { ok: true };
}

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
  requireRole(['EXPORTER', 'BANKS', 'BANK_ADMIN']),
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

      // AUTO-MAPPING: Fetch LC, Contract, and Forex data to auto-populate payment fields
      let autoMappedData: any = {};
      try {
        // Get LC details
        const lcResult = await fabricService.queryChaincode('ReadLC', [lcID]);
        if (lcResult.success && lcResult.data) {
          const lc = lcResult.data;
          autoMappedData.amount = lc.Amount || lc.amount || '0';
          autoMappedData.currency = lc.Currency || lc.currency || 'USD';
          autoMappedData.contractID = lc.ContractID || lc.contractID || contractID;
          autoMappedData.issuingBank = lc.IssuingBank || lc.issuingBank || '';
          logger.info(`[PAYMENT] Auto-mapped from LC: amount=${autoMappedData.amount}, currency=${autoMappedData.currency}`);
        }
        
        // Get Contract details for exporter info
        const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID || autoMappedData.contractID]);
        if (contractResult.success && contractResult.data) {
          const contract = contractResult.data;
          autoMappedData.exporterID = contract.ExporterID || contract.exporterID || exporterID;
          autoMappedData.exporterBank = contract.ExporterBank || contract.exporterBank || '';
          logger.info(`[PAYMENT] Auto-mapped from contract: exporterID=${autoMappedData.exporterID}, exporterBank=${autoMappedData.exporterBank}`);
        }
      } catch (error) {
        logger.warn('[PAYMENT] Could not fetch LC/Contract for auto-mapping:', error);
      }

      // Use provided values or auto-mapped values with smart defaults
      const finalContractID = contractID || autoMappedData.contractID || '';
      const finalExporterID = exporterID || autoMappedData.exporterID || '';
      const finalAmount = amount || autoMappedData.amount || '0';
      const finalCurrency = currency || autoMappedData.currency || 'USD';
      const finalReceivingBank = receivingBank || autoMappedData.exporterBank || 'Commercial Bank of Ethiopia';
      const finalReceivingBankBIC = receivingBankBIC || 'CBETETAA';
      const finalBeneficiaryName = beneficiaryName || finalExporterID;
      const finalBeneficiaryAccount = beneficiaryAccount || `${finalExporterID}-001`;
      const finalPaymentMethod = paymentMethod || 'LC';

      // LEG3 M-8a: do not trust the client-computed amount. Recompute it
      // server-side as shipment quantity x contract pricePerKg — the exact
      // formula the Exporter portal uses — and reject a provable mismatch.
      // Best-effort reads: if the shipment or contract cannot be read, the
      // check is skipped (logged) rather than blocking initiation; a
      // mismatch that CAN be proven is a 400.
      const shipmentIDForAmount = (req.body as any).shipmentID;
      if (shipmentIDForAmount) {
        try {
          const [shipRes, contractRes] = await Promise.all([
            fabricService.queryChaincode('ReadShipment', [shipmentIDForAmount]),
            fabricService.queryChaincode('ReadSalesContract', [finalContractID]),
          ]);
          const qty = Number(shipRes?.data?.Quantity ?? shipRes?.data?.quantity);
          const price = Number(contractRes?.data?.PricePerKg ?? contractRes?.data?.pricePerKg);
          if (Number.isFinite(qty) && Number.isFinite(price) && qty > 0 && price > 0) {
            const expectedAmount = Math.round(qty * price * 100) / 100;
            const suppliedAmount = Number(finalAmount);
            if (Number.isFinite(suppliedAmount) && Math.abs(suppliedAmount - expectedAmount) > 0.01) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'AMOUNT_MISMATCH',
                  message: `Payment amount ${suppliedAmount} does not match the shipment value ${expectedAmount} (${qty} kg x $${price}/kg)`,
                  expectedAmount,
                  suppliedAmount,
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (amountCheckErr) {
          logger.warn(`[PAYMENT] Could not verify initiate amount for ${paymentID}:`, amountCheckErr);
        }
      }

      // LEG3 M-8b: re-initiate is idempotent. paymentID is PAY-<shipmentId>,
      // so a re-click on the same shipment used to fail on-chain with a
      // duplicate-ID error. If the payment already exists, return it
      // (200, alreadyExists) instead of submitting a duplicate.
      try {
        const existingPayment = await fabricService.queryChaincode('ReadPayment', [paymentID]);
        if (existingPayment.success && existingPayment.data) {
          return res.status(200).json({
            success: true,
            alreadyExists: true,
            message: 'Payment already initiated for this shipment',
            data: existingPayment.data,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (existingErr) {
        logger.warn(`[PAYMENT] Could not check for existing payment ${paymentID}, proceeding:`, existingErr);
      }

      const result = await fabricService.invokeChaincode('InitiatePayment', [
        paymentID,
        finalContractID,
        finalExporterID,
        lcID,
        finalAmount.toString(),
        finalCurrency,
        finalReceivingBank,
        finalReceivingBankBIC,
        finalBeneficiaryName,
        finalBeneficiaryAccount,
        finalPaymentMethod,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Payment initiated successfully: ${paymentID} with auto-mapped data`);
        // Mirror into Postgres: without a row here, every downstream
        // mirror is a no-op — settle's UPDATE (below) affects 0 rows and
        // the payment is chaincode-only. Best-effort, ledger-first: the
        // initiation already committed on-chain; a PG failure must not
        // fail the response. Columns mirror POST /payments (same table).
        try {
          // LEG3 M-5: fill the retention-split columns, not just amount.
          // The old mirror left amount_usd / retention_amount /
          // release_amount NULL, so a release of an initiate-path payment
          // reported releaseAmount: null / totalAmount: null (the
          // notification said "released: null USD"). The NBE split is
          // 40% retention / 60% release — the same split recordPayment
          // (paymentService.ts) applies.
          const initiatedTotal = Number(finalAmount) || 0;
          const initiatedRetention = Math.round(initiatedTotal * 0.4 * 100) / 100;
          const initiatedRelease = Math.round((initiatedTotal - initiatedRetention) * 100) / 100;
          await postgresDb.run(
            `INSERT INTO payments (
              payment_id, lc_number, contract_id, shipment_id, exporter_id, amount, currency, payment_method, payment_date, blockchain_tx_id,
              amount_usd, retention_amount, release_amount, retention_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (payment_id) DO UPDATE SET
              amount_usd = EXCLUDED.amount_usd,
              retention_amount = EXCLUDED.retention_amount,
              release_amount = EXCLUDED.release_amount`,
            [paymentID, lcID || null, finalContractID, (req.body as any).shipmentID || null, finalExporterID, finalAmount, finalCurrency, finalPaymentMethod, new Date().toISOString(), result.txId || null,
             initiatedTotal, initiatedRetention, initiatedRelease, 'RECEIVED']
          );
        } catch (mirrorErr) {
          logger.warn(`[PAYMENT] Could not mirror initiation of ${paymentID} to Postgres:`, mirrorErr);
        }
        res.status(201).json({
          success: true,
          message: 'Payment initiated successfully',
          data: result.data,
          autoMapped: {
            contractID: finalContractID,
            exporterID: finalExporterID,
            amount: finalAmount,
            currency: finalCurrency,
            receivingBank: finalReceivingBank,
            receivingBankBIC: finalReceivingBankBIC,
            beneficiaryName: finalBeneficiaryName,
            beneficiaryAccount: finalBeneficiaryAccount,
            paymentMethod: finalPaymentMethod,
          },
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
  authMiddleware,
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    body('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('amountUSD').isNumeric().withMessage('Amount must be a number'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('paymentDate').notEmpty().withMessage('Payment date is required'),
    body('payerName').notEmpty().withMessage('Payer name is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const paymentData = {
        paymentID: req.body.paymentID,
        contractID: req.body.contractID,
        shipmentID: req.body.shipmentID,
        exporterID: req.body.exporterID,
        lcID: req.body.lcID,
        forexID: req.body.forexID,
        amountUSD: parseFloat(req.body.amountUSD),
        currency: req.body.currency,
        swiftReference: req.body.swiftReference,
        paymentDate: req.body.paymentDate,
        payerName: req.body.payerName,
        payerBank: req.body.payerBank,
        userId: user.username,
        userOrg: user.org
      };

      logger.info(`[PAYMENT] Recording payment: ${paymentData.paymentID} with 40% NBE retention`);

      // Use PaymentService with automatic 40% retention
      const result = await paymentService.recordPayment(paymentData);

      logger.info(`✅ [PAYMENT] Payment recorded: ${result.paymentID}, Total: $${result.totalAmount}, Retention: $${result.retentionAmount} (40%), Release: $${result.releaseAmount} (60%)`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'payment_received',
        title: `Payment ${paymentData.paymentID} recorded`,
        message: `Payment ${paymentData.paymentID} was recorded for shipment ${paymentData.shipmentID} (USD ${Number(paymentData.amountUSD || 0).toLocaleString()}; 40% NBE retention applied).`,
        entityType: 'payment', entityId: paymentData.paymentID, severity: 'success',
        roles: ['BANKS', 'NBE'], exporterId: paymentData.exporterID,
        actionUrl: '/portals/exporter?tab=payments',
        actionUrls: { BANKS: '/portals/banks?tab=contracts', NBE: '/portals/nbe?tab=contracts' },
      });
      
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully with 40% NBE retention',
        data: {
          paymentID: result.paymentID,
          status: result.status,
          retentionStatus: result.retentionStatus,
          totalAmount: result.totalAmount,
          retentionAmount: result.retentionAmount,
          releaseAmount: result.releaseAmount,
          retentionRate: result.retentionRate,
          blockchainTxId: result.blockchainTxId
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[PAYMENT] Error recording payment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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

      // Chaincode expects documents as a JSON-stringified array of strings
      // Each document should be a JSON string within the array
      const documentStrings = documents.map((doc: any) => JSON.stringify(doc));
      
      const result = await fabricService.invokeChaincode('SubmitPaymentDocuments', [
        paymentID,
        JSON.stringify(documentStrings), // Pass array as single JSON string parameter
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Documents submitted for: ${paymentID}`);
        // M4: mirror the intermediate state to PG (ledger-first,
        // best-effort — the chain call above already succeeded).
        await mirrorPaymentStatus(paymentID, 'DOCUMENTS_SUBMITTED');
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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
        // M4: mirror the intermediate state to PG (ledger-first,
        // best-effort — the chain call above already succeeded).
        await mirrorPaymentStatus(paymentID, 'VERIFIED');
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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
        // M4: mirror the intermediate state to PG (ledger-first,
        // best-effort). The reference is mirrored too: this is the first
        // point an initiate-path payment carries one (the initiate
        // mirror stores no swift_reference).
        await mirrorPaymentStatus(paymentID, 'SWIFT_INITIATED', swiftReference);
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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
        // M4: mirror the intermediate state to PG (ledger-first,
        // best-effort — the chain call above already succeeded).
        await mirrorPaymentStatus(paymentID, 'SWIFT_RECEIVED');
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
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('exchangeRate').isFloat({ gt: 0 }).withMessage('Exchange rate must be greater than 0'),
    body('retentionRate').isFloat({ gt: 0, max: 100 }).withMessage('Retention rate must be between 0 and 100'),
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

      // Get current payment status for validation
      const paymentData = await fabricService.queryChaincode('ReadPayment', [paymentID]);
      if (!paymentData.success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' },
          timestamp: new Date().toISOString(),
        });
      }
      
      const currentStatus = paymentData.data?.status || paymentData.data?.Status || 'PENDING';
      
      // Validate status transition
      const isValid = statusManager.validateTransition('PAYMENT', currentStatus, 'SETTLED');
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot settle payment: Invalid status transition from ${currentStatus} to SETTLED`,
            allowedStatuses: statusManager.getNextStatuses('PAYMENT', currentStatus),
          },
          timestamp: new Date().toISOString(),
        });
      }

      await fabricService.connectAsOrg('BanksMSP'); // Banks settle payments

      // C1: refuse to settle against a REJECTED SWIFT message (see
      // checkSwiftForSettle above for the exact rule). This runs before
      // any chain write: SettlePayment itself never checks the message.
      const swiftGuard = await checkSwiftForSettle(paymentID, swiftReference, currentStatus, paymentData.data);
      if (!swiftGuard.ok) {
        return res.status(swiftGuard.status).json({
          success: false,
          error: {
            code: swiftGuard.code,
            message: swiftGuard.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Settle on-chain via the canonical helper (TEST-STATUS-MATRIX
      // §17 #14) — the same SettlePayment call releasePayment makes.
      const result = await paymentService.settleOnChain({
        paymentID,
        exchangeRate: exchangeRate.toString(),
        retentionRate: retentionRate.toString(),
        payingBank,
        payingBankBIC,
        swiftReference,
        nbeApprovalRef,
      });

      if (result.success) {
        // Update status with cascading effects (LC, Forex, Contract statuses)
        await statusManager.updateEntityStatus('PAYMENT', paymentID, currentStatus, 'SETTLED');

        // Mirror into Postgres: the old handler only updated the chain, so
        // the payments row kept its pre-settlement status. Best-effort —
        // the settlement already committed on-chain.
        try {
          await postgresDb.run(
            `UPDATE payments SET status = 'SETTLED' WHERE payment_id = $1`,
            [paymentID]
          );
        } catch (mirrorErr) {
          logger.warn(`[PAYMENT] Could not mirror settlement of ${paymentID} to Postgres:`, mirrorErr);
        }
        
        logger.info(`✅ [PAYMENT] Payment settled: ${paymentID} (${currentStatus} → SETTLED)`);
        // In-app notification (persisted feed + live WS broadcast).
        await notificationService.emitWorkflowEvent({
          type: 'payment_settled',
          title: `Payment ${paymentID} settled`,
          message: `Payment ${paymentID} has been settled (${currentStatus} → SETTLED).`,
          entityType: 'payment', entityId: paymentID, severity: 'success',
          roles: ['BANKS', 'NBE'],
          actionUrl: '/portals/exporter?tab=payments',
          actionUrls: { BANKS: '/portals/banks?tab=contracts', NBE: '/portals/nbe?tab=contracts' },
        });
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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
 * POST /api/v1/payments/:paymentID/convert-retention
 * LEG3 M-5: convert the retained (NBE 40%) portion of a payment from USD
 * to Birr. PaymentService.convertRetention existed with NO route and NO
 * UI caller, so RETENTION_CONVERTED was unreachable — and its PG update
 * referenced columns that did not exist (migration 073) while the
 * chaincode function it called did not exist either (payment.go
 * ConvertRetention, seq 8). All three layers now exist.
 */
router.post('/:paymentID/convert-retention',
  authMiddleware,
  requireRole(['NBE', 'NBE_ADMIN', 'ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('exchangeRate').isFloat({ gt: 0 }).withMessage('Exchange rate must be greater than 0'),
    body('amountBirr').isFloat({ gt: 0 }).withMessage('Converted amount (Birr) must be greater than 0'),
    body('convertedBy').notEmpty().withMessage('Converted by is required'),
    body('conversionRef').notEmpty().withMessage('Conversion reference is required'),
    body('conversionDate').notEmpty().withMessage('Conversion date is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { exchangeRate, amountBirr, convertedBy, conversionRef, conversionDate } = req.body;
      const user = (req as any).user;

      logger.info(`[PAYMENT] Converting retention for payment: ${paymentID}`);

      const result = await paymentService.convertRetention({
        paymentID,
        exchangeRate: Number(exchangeRate),
        amountBirr: Number(amountBirr),
        convertedBy,
        conversionRef,
        conversionDate,
        userId: String(user?.userId || user?.sub || convertedBy),
        userOrg: user?.organization || user?.org || 'NBE',
      });

      res.json({
        success: true,
        message: 'Retention converted successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[PAYMENT] Error converting retention:', error);
      const message = error?.message || 'Internal server error';
      // F-8: client-state failures (not found, already converted, wrong
      // on-chain status) are 4xx, not 500.
      if (/not found/i.test(message)) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message },
          timestamp: new Date().toISOString(),
        });
      }
      if (/already converted/i.test(message) || /cannot have its retention converted/i.test(message)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATE', message },
          timestamp: new Date().toISOString(),
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
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
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { shipmentID, status, dateFrom, dateTo, exporterID } = req.query;

    logger.info('[PAYMENT] 🔗 Fetching payments DIRECTLY from Hyperledger Fabric blockchain');
    logger.info('[PAYMENT] Filters:', { shipmentID, status, dateFrom, dateTo, exporterID });

    // Query blockchain first; fall back to the PostgreSQL mirror when the
    // ledger is unreachable (dev mode / no Fabric host). The mirror is the
    // same best-effort pattern used by GET /shipments and the customs
    // clear handler: honest source labelling, no fabricated tx ids.
    let result;
    if (shipmentID) {
      result = await fabricService.queryChaincode('GetPaymentsByShipment', [shipmentID as string]);
    } else {
      result = await fabricService.queryChaincode('QueryAllPayments', []);
    }

    let payments: any[] = [];
    let source = 'blockchain';
    if (!result.success) {
      logger.warn(`[PAYMENT] Blockchain query failed, falling back to PostgreSQL: ${result.error}`);
      try {
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        const dbPayments = await db.all(`SELECT * FROM payments ORDER BY created_at DESC`);
        source = 'database';
        payments = dbPayments.map((p: any) => ({
          paymentId: p.payment_id,
          paymentID: p.payment_id,
          contractId: p.contract_id,
          exporterId: p.exporter_id,
          shipmentId: p.shipment_id,
          lcId: p.lc_id,
          lcNumber: p.lc_number,
          amount: p.amount != null ? parseFloat(p.amount) : 0,
          currency: p.currency,
          status: p.status,
          paymentTrackingStatus: p.payment_tracking_status,
          swiftReference: p.swift_reference,
          retentionRate: p.retention_rate != null ? parseFloat(p.retention_rate) : null,
          retainedAmount: p.retention_amount != null ? parseFloat(p.retention_amount) : null,
          releaseAmount: p.release_amount != null ? parseFloat(p.release_amount) : null,
          paymentMethod: p.payment_method,
          paymentDate: p.payment_date,
          blockchainTxId: p.blockchain_tx_id,
          notes: p.notes,
          createdAt: p.created_at,
        }));
        logger.info(`[PAYMENT] Loaded ${payments.length} payments from PostgreSQL (fallback)`);
      } catch (pgError: any) {
        logger.error(`[PAYMENT] PostgreSQL fallback failed: ${pgError.message}`);
        return res.status(500).json({
          success: false,
          error: {
            code: 'BLOCKCHAIN_QUERY_FAILED',
            message: result.error || 'Failed to query blockchain'
          },
          source: 'blockchain',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      payments = result.data || [];
      logger.info(`[PAYMENT] ✅ Found ${payments.length} payments on blockchain (PURE BLOCKCHAIN, NO CACHE)`);
    }

    // ✅ ENRICH with buyer data from PostgreSQL
    try {
      const { default: dataEnrichmentService } = await import('../services/dataEnrichmentService');
      // Payments link to shipments which link to contracts, so enrich via shipments
      const enrichedPayments: any[] = [];
      for (const payment of payments) {
        const shipmentId = payment.shipmentId || payment.ShipmentID || payment.shipment_id;
        if (shipmentId) {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          const buyerData = await db.get(`
            SELECT c.buyer_id AS buyer_name, c.buyer_country
            FROM shipments s
            LEFT JOIN contracts c ON s.contract_id = c.contract_id
            WHERE s.shipment_id = $1
          `, [shipmentId]);
          
          if (buyerData) {
            enrichedPayments.push({
              ...payment,
              buyerName: buyerData.buyer_name,
              buyerCountry: buyerData.buyer_country,
            });
          } else {
            enrichedPayments.push(payment);
          }
        } else {
          enrichedPayments.push(payment);
        }
      }
      payments = enrichedPayments;
      logger.info(`[PAYMENT] ✅ Enriched ${payments.length} payments with buyer data`);
    } catch (enrichError) {
      logger.warn('[PAYMENT] ⚠️  Could not enrich payments with buyer data:', enrichError);
    }

    // ✅ NORMALIZE and CALCULATE fields
    const exchangeRateService = require('../services/exchangeRateService').exchangeRateService;
    const getPositiveRate = (value: any): number | null => {
      const rate = Number(value);
      return Number.isFinite(rate) && rate > 0 ? rate : null;
    };
    const needsLedgerRate = payments.some((payment: any) =>
      getPositiveRate(payment.exchangeRate ?? payment.ExchangeRate) === null &&
      payment.amountBirr == null && payment.AmountBirr == null
    );
    let ledgerUsdRate: number | null = null;
    if (needsLedgerRate) {
      try {
        ledgerUsdRate = await exchangeRateService.getCurrentRate('USD');
      } catch (rateError: any) {
        logger.warn('[PAYMENT] No active ledger USD rate; leaving unconverted amounts unset:', rateError.message);
      }
    }
    payments = payments.map((payment: any) => {
      const amount = payment.amount || 0;
      const exchangeRate = getPositiveRate(payment.exchangeRate ?? payment.ExchangeRate) ?? ledgerUsdRate;
      const retentionRate = payment.retentionRate || 0.10; // 10% default retention
      
      // Calculate derived fields if not already set
      const storedAmountBirr = payment.amountBirr ?? payment.AmountBirr;
      const amountBirr = storedAmountBirr ?? (exchangeRate === null ? null : amount * exchangeRate);
      const retainedAmount = payment.retainedAmount || (amount * retentionRate);
      const convertedAmount = payment.convertedAmount ?? payment.ConvertedAmount ?? amountBirr;
      const advancePercentage = payment.advancePercentage || 0;
      const advanceAmount = payment.advanceAmount || (amount * (advancePercentage / 100));
      const balanceAmount = payment.balanceAmount || (amount - advanceAmount);
      
      return {
        ...payment,
        exchangeRate,
        amountBirr,
        retainedAmount,
        convertedAmount,
        advanceAmount,
        balanceAmount,
        // Ensure shipmentId is populated
        shipmentId: payment.shipmentId || payment.ShipmentID || payment.shipment_id || '',
        // Ensure verifiedById is populated
        verifiedById: payment.verifiedById || payment.verifiedBy || '',
      };
    });

    // Apply blockchain-side filters (status, exporter, dates)
    if (status) {
      payments = payments.filter((p: any) => 
        (p.status || p.Status) === status
      );
    }

    if (exporterID) {
      payments = payments.filter((p: any) => 
        (p.exporterId || p.ExporterID || p.exporter_id) === exporterID
      );
    }

    if (dateFrom || dateTo) {
      payments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.paymentDate || payment.payment_date || payment.timestamp);
        if (dateFrom && paymentDate < new Date(dateFrom as string)) return false;
        if (dateTo && paymentDate > new Date(dateTo as string)) return false;
        return true;
      });
    }

    res.json({
      success: true,
      data: payments,
      count: payments.length,
      source, // 'blockchain' when the ledger answered, 'database' on PG fallback
      blockchainPowered: source === 'blockchain',
      enriched: true, // ✅ Flag showing data is enriched with PostgreSQL
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[PAYMENT] Error retrieving payments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ✅ NEW: Convenience endpoint for pending payment releases
router.get('/pending-release', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { exporterID, limit = '50' } = req.query;

    logger.info('[PAYMENT] Fetching pending release payments from blockchain');

    // Query all payments from blockchain
    const result = await fabricService.queryChaincode('QueryAllPayments', []);

    if (!result.success) {
      logger.error(`[PAYMENT] Blockchain query failed: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'BLOCKCHAIN_QUERY_FAILED',
          message: result.error || 'Failed to query blockchain'
        },
        timestamp: new Date().toISOString()
      });
    }

    let payments = result.data || [];
    
    // Filter for pending release status: VERIFIED is the only state in
    // the implemented chaincode payment machine that is awaiting release.
    // PENDING_RELEASE / AWAITING_RELEASE exist in no state machine.
    payments = payments.filter((p: any) =>
      (p.status || p.Status) === 'VERIFIED'
    );

    // Apply exporter filter if provided
    if (exporterID) {
      payments = payments.filter((p: any) => 
        (p.exporterId || p.ExporterID || p.exporter_id) === exporterID
      );
    }

    // Apply limit
    const limitNum = parseInt(limit as string) || 50;
    payments = payments.slice(0, limitNum);

    logger.info(`[PAYMENT] Found ${payments.length} pending release payments`);

    res.json({
      success: true,
      data: payments,
      count: payments.length,
      filter: 'pending-release',
      source: 'blockchain',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[PAYMENT] Error retrieving pending release payments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
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
  authMiddleware,
  [param('paymentID').notEmpty().withMessage('Payment ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;

      logger.info(`[PAYMENT] Fetching payment details: ${paymentID}`);

      // Try database first (PostgreSQL)
      try {
        const payment = await postgresDb.get(
          'SELECT * FROM payments WHERE payment_id = $1',
          [paymentID]
        );

        if (payment) {
          return res.json({
            success: true,
            data: payment,
            source: 'database',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        logger.warn(`[PAYMENT] Database query failed, trying blockchain: ${dbError}`);
      }

      // Fallback to blockchain
      const result = await fabricService.queryChaincode('ReadPayment', [paymentID]);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: 'blockchain',
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
  requireRole(['BANKS', 'BANK_ADMIN']),
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

// ==================== ADVANCE PAYMENT METHODS ====================

/**
 * @swagger
 * /api/v1/payments/{paymentID}/advance:
 *   post:
 *     summary: Receive advance payment
 *     tags: [Payments]
 */
router.post('/:paymentID/advance',
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('advancePercentage').notEmpty().withMessage('Advance percentage is required'),
    body('amountReceived').notEmpty().withMessage('Amount received is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { advancePercentage, amountReceived } = req.body;

      logger.info(`[PAYMENT] Receiving advance payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('ReceiveAdvancePayment', [
        paymentID,
        advancePercentage.toString(),
        amountReceived.toString(),
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Advance payment received: ${paymentID}`);
        res.json({
          success: true,
          message: 'Advance payment received successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to receive advance: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'ADVANCE_FAILED',
            message: result.error || 'Failed to receive advance payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error receiving advance:', error);
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
 * /api/v1/payments/{paymentID}/balance:
 *   post:
 *     summary: Receive balance payment
 *     tags: [Payments]
 */
router.post('/:paymentID/balance',
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('amountReceived').notEmpty().withMessage('Amount received is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { amountReceived } = req.body;

      logger.info(`[PAYMENT] Receiving balance payment: ${paymentID}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('ReceiveBalancePayment', [
        paymentID,
        amountReceived.toString(),
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Balance payment received: ${paymentID}`);
        res.json({
          success: true,
          message: 'Balance payment received successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to receive balance: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'BALANCE_FAILED',
            message: result.error || 'Failed to receive balance payment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[PAYMENT] Error receiving balance:', error);
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
 * /api/v1/payments/{paymentID}/status:
 *   post:
 *     summary: Update payment status
 *     tags: [Payments]
 */
router.post('/:paymentID/status',
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('status').notEmpty().withMessage('Status is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { status } = req.body;

      logger.info(`[PAYMENT] Updating payment status: ${paymentID} to ${status}`);

      await fabricService.connectAsOrg('BanksMSP');

      const result = await fabricService.invokeChaincode('UpdatePaymentStatus', [
        paymentID,
        status,
      ]);

      if (result.success) {
        logger.info(`✅ [PAYMENT] Status updated: ${paymentID}`);
        res.json({
          success: true,
          message: 'Payment status updated successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [PAYMENT] Failed to update status: ${result.error}`);
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
      logger.error('[PAYMENT] Error updating status:', error);
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

// POST /payments - Record payment
router.post('/',
  authMiddleware,
  requireRole(['EXPORTER', 'BANKS', 'BANK_ADMIN']),
  [
    body('paymentID').notEmpty(),
    body('amount').isNumeric(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID, lcNumber, contractID, exporterID, amount, currency, paymentMethod, paymentDate } = req.body;
      const user = (req as any).user;

      // Fetch bank details from LC or use defaults
      let receivingBank = 'Commercial Bank of Ethiopia';
      let receivingBankBIC = 'CBETETAA';  // Commercial Bank of Ethiopia BIC code (8 chars)
      let beneficiaryName = exporterID;  // Will be mapped from exporter record
      let beneficiaryAccount = 'TO_BE_MAPPED';  // Will be auto-mapped from LC/exporter

      // Try to fetch LC details for auto-mapping
      if (lcNumber) {
        try {
          const lcResult = await fabricService.queryChaincode('ReadLC', [lcNumber]);
          if (lcResult.success && lcResult.data) {
            const lc = lcResult.data;
            receivingBank = lc.advisingBank || lc.issuingBank || receivingBank;
            beneficiaryName = lc.beneficiaryName || lc.exporterID || beneficiaryName;
            beneficiaryAccount = lc.beneficiaryAccount || beneficiaryAccount;
            // Keep default BIC if not provided
          }
        } catch (err) {
          logger.warn('[PAYMENT] Could not fetch LC for auto-mapping, using defaults');
        }
      }

      // ✅ BLOCKCHAIN-FIRST: Call InitiatePayment chaincode BEFORE DB write
      const blockchainResult = await fabricService.invokeChaincode(
        'InitiatePayment',
        [
          paymentID,
          contractID || '',
          exporterID,
          lcNumber || '',
          String(amount),
          currency || 'USD',
          receivingBank,
          receivingBankBIC,  // Now uses valid 8-character BIC code
          beneficiaryName,
          beneficiaryAccount,
          paymentMethod || 'LC'
        ]
      );
      
      const blockchain_tx_id = blockchainResult?.txId || null;
      logger.info(`✅ Payment initiated on blockchain: ${paymentID}, TX: ${blockchain_tx_id}`);

      // Now persist to database with blockchain TX ID
      await postgresDb.run(
        `INSERT INTO payments (
          payment_id, lc_number, contract_id, shipment_id, exporter_id, amount, currency, payment_method, payment_date, blockchain_tx_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [paymentID, lcNumber || null, contractID, req.body.shipmentID || null, exporterID, amount, currency, paymentMethod, paymentDate, blockchain_tx_id]
      );

      res.json({
        success: true,
        data: { paymentID, amount, currency, blockchain_tx_id },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Payment creation error:', error);
      // F-8: re-creating an existing payment violates the
      // payments.payment_id UNIQUE constraint — a client error (409),
      // not a server error.
      if (/duplicate key/i.test(error?.message || '')) {
        return res.status(409).json({
          success: false,
          error: { code: 'PAYMENT_ALREADY_EXISTS', message: error.message },
          timestamp: new Date().toISOString()
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Duplicate route removed - consolidated into single GET / above that queries BOTH databases

/**
 * @swagger
 * /api/v1/payments/{paymentID}/release:
 *   post:
 *     summary: Release payment to exporter (NBE approval)
 *     description: NBE releases payment to exporter after all compliance checks
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exporterID
 *               - amount
 *             properties:
 *               exporterID:
 *                 type: string
 *               amount:
 *                 type: number
 *               releaseDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment released successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.post('/:paymentID/release',
  authMiddleware,
  requireRole(['NBE', 'NBE_ADMIN', 'ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('amount').isNumeric().withMessage('Amount must be numeric'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { exporterID, amount, releaseDate } = req.body;
      const userId = (req as any).user?.userId || 'system';
      const userOrg = (req as any).user?.organization || 'NBE';

      logger.info(`[PAYMENTS] NBE releasing payment ${paymentID} to exporter ${exporterID}`);

      // Get payment details to validate
      const payment = await postgresDb.get(
        'SELECT * FROM payments WHERE payment_id = $1',
        [paymentID]
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Payment not found: ${paymentID}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if payment is in correct status — the release guard reads
      // the RETENTION machine (retention_status), not the settlement
      // status: a settled payment whose retention was never released is
      // releasable, and a released one stays released even after the
      // settle mirror writes SETTLED (TEST-STATUS-MATRIX §17 #8).
      if (payment.retention_status === 'RELEASED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_RELEASED',
            message: `Payment ${paymentID} has already been released`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Use PaymentService to handle the 60% release properly
      const result = await paymentService.releasePayment({
        paymentID,
        exporterAccount: `${exporterID}-001`, // Default account format
        releasedBy: (req as any).user?.username || 'NBE',
        releaseRef: `REL-${paymentID}-${Date.now()}`,
        releaseDate: releaseDate || new Date().toISOString(),
        userId: String(userId),
        userOrg
      });

      logger.info(`✅ Payment ${paymentID} released: ${result.releaseAmount} USD to exporter ${exporterID}`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'payment_released',
        title: `Payment ${paymentID} released`,
        message: `Payment ${paymentID} was released: ${result.releaseAmount} USD to exporter ${exporterID} (60% NBE release).`,
        entityType: 'payment', entityId: paymentID, severity: 'success',
        roles: ['NBE'], exporterId: exporterID,
        actionUrl: '/portals/exporter?tab=payments',
        actionUrls: { NBE: '/portals/nbe?tab=contracts' },
      });

      res.json({
        success: true,
        message: 'Payment released successfully (60% of total)',
        data: {
          paymentID: result.paymentID,
          exporterID,
          status: result.status,
          retentionStatus: result.retentionStatus,
          totalAmount: result.totalAmount,
          releaseAmount: result.releaseAmount,
          retentionAmount: result.retentionAmount,
          releaseDate: releaseDate || new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[PAYMENTS] Error releasing payment:', error);
      const message = error?.message || 'Internal server error';
      // F-8: releasePayment throws client-state failures (payment not
      // found, already released, on-chain status not releasable) and a
      // missing-ledger-rate failure — those are 4xx/503, not 500. Only
      // genuine server failures stay 500.
      if (/not found/i.test(message)) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message },
          timestamp: new Date().toISOString(),
        });
      }
      if (/already released/i.test(message)) {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_RELEASED', message },
          timestamp: new Date().toISOString(),
        });
      }
      if (/cannot be released/i.test(message)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message },
          timestamp: new Date().toISOString(),
        });
      }
      if (/no active .* exchange rate/i.test(message)) {
        return res.status(503).json({
          success: false,
          error: { code: 'NO_ACTIVE_EXCHANGE_RATE', message },
          timestamp: new Date().toISOString(),
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;


/**
 * @swagger
 * /api/v1/payments/{paymentID}/tracking-status:
 *   put:
 *     summary: Update payment document tracking status
 *     description: Update the document tracking status (PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_RECEIVED → SETTLED)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingStatus
 *             properties:
 *               trackingStatus:
 *                 type: string
 *                 enum: [PENDING, DOCUMENTS_SUBMITTED, VERIFIED, SWIFT_INITIATED, SWIFT_RECEIVED, SETTLED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tracking status updated successfully
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:paymentID/tracking-status',
  authMiddleware,
  requireRole(['BANKS', 'BANK_ADMIN']),
  [
    param('paymentID').notEmpty().withMessage('Payment ID is required'),
    body('trackingStatus')
      .notEmpty()
      .withMessage('Tracking status is required')
      .isIn(['PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED'])
      .withMessage('Invalid tracking status value'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { paymentID } = req.params;
      const { trackingStatus, notes } = req.body;
      const userId = (req as any).user?.userId || 'system';
      const userOrg = (req as any).user?.organization || 'SYSTEM';

      logger.info(`[PAYMENTS] Updating tracking status for ${paymentID} to ${trackingStatus}`);

      const { DatabaseService } = await import('../services/databaseService');
      const { AuditService } = await import('../services/auditService');
      
      const db = DatabaseService.getInstance();
      const auditService = AuditService.getInstance();

      // Get current payment
      const payment = await db.get(
        'SELECT * FROM payments WHERE payment_id = $1',
        [paymentID]
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Payment not found: ${paymentID}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Update tracking status
      await db.run(
        `UPDATE payments 
         SET payment_tracking_status = $1 
         WHERE payment_id = $2`,
        [trackingStatus, paymentID]
      );

      // Log audit trail
      await auditService.log({
        entityType: 'PAYMENT',
        entityId: paymentID,
        action: 'UPDATE_TRACKING_STATUS',
        performedBy: userId,
        organization: userOrg,
        performedByOrg: userOrg,
        oldValue: payment.payment_tracking_status || 'PENDING',
        newValue: trackingStatus,
        reason: `Payment tracking status updated to ${trackingStatus}`,
        metadata: { notes },
      });

      logger.info(`✅ [PAYMENTS] Tracking status updated: ${paymentID} -> ${trackingStatus}`);

      res.json({
        success: true,
        data: {
          paymentID,
          trackingStatus,
        },
        message: `Payment tracking status updated to ${trackingStatus}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(`[PAYMENTS] Error updating tracking status:`, error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update tracking status',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

