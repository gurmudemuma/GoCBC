// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Export Proceeds Repatriation API Routes

import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

// ==================== EXPORT PROCEEDS REPATRIATION ROUTES ====================

// GET /api/v1/repatriation — Get all repatriations
router.get('/', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER', 'EXPORTER']), async (req, res) => {
  try {
    logger.info('[REPATRIATION] 🔗 Querying all repatriations from blockchain...');
    const user = (req as any).user;
    const isExporter = String(user?.role || '').toUpperCase() === 'EXPORTER';
    const exporterId = String(user?.exporterId || user?.username || '');
    if (isExporter && !exporterId) {
      return res.status(403).json({ success: false, error: 'Exporter identity is not linked to this account' });
    }
    const result = isExporter
      ? await fabricService.evaluateTransaction('QueryRepatriationsByExporter', exporterId)
      : await fabricService.evaluateTransaction('QueryAllRepatriations');
    
    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Blockchain query failed: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        source: 'blockchain'
      });
    }

    const repatriations = result.data || [];
    logger.info(`[REPATRIATION] ✅ Retrieved ${repatriations.length} repatriations`);

    res.json({
      success: true,
      data: repatriations,
      count: repatriations.length,
      source: 'blockchain',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error fetching repatriations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/repatriation/:id — Get specific repatriation
router.get('/:id', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER', 'EXPORTER']), async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[REPATRIATION] 🔍 Fetching repatriation: ${id}`);
    
    const result = await fabricService.evaluateTransaction('ReadRepatriation', id);
    
    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to fetch: ${result.error}`);
      return res.status(404).json({ 
        success: false, 
        error: result.error 
      });
    }

    const user = (req as any).user;
    if (String(user?.role || '').toUpperCase() === 'EXPORTER' &&
        String(user?.exporterId || user?.username || '') !== String(result.data?.exporterId || result.data?.ExporterID || '')) {
      return res.status(403).json({ success: false, error: 'Exporters can only view their own repatriation records' });
    }

    res.json({
      success: true,
      data: result.data,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[REPATRIATION] ❌ Error fetching repatriation:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/repatriation/exporter/:exporterId — Get by exporter
router.get('/exporter/:exporterId', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER', 'EXPORTER']), async (req, res) => {
  try {
    const { exporterId } = req.params;
    const user = (req as any).user;
    if (String(user?.role || '').toUpperCase() === 'EXPORTER' &&
        String(user?.exporterId || user?.username || '') !== exporterId) {
      return res.status(403).json({ success: false, error: 'Exporters can only view their own repatriation records' });
    }
    logger.info(`[REPATRIATION] 🔍 Fetching repatriations for exporter: ${exporterId}`);
    
    const result = await fabricService.evaluateTransaction('QueryRepatriationsByExporter', exporterId);
    
    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const repatriations = result.data || [];
    
    res.json({
      success: true,
      data: repatriations,
      count: repatriations.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[REPATRIATION] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/repatriation/status/:status — Get by status
router.get('/status/:status', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { status } = req.params;
    logger.info(`[REPATRIATION] 🔍 Fetching repatriations with status: ${status}`);
    
    const result = await fabricService.evaluateTransaction('QueryRepatriationsByStatus', status);
    
    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const repatriations = result.data || [];
    
    res.json({
      success: true,
      data: repatriations,
      count: repatriations.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[REPATRIATION] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/repatriation/overdue/all — Get overdue repatriations
router.get('/overdue/all', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    logger.info('[REPATRIATION] 🔍 Fetching overdue repatriations');
    
    const result = await fabricService.evaluateTransaction('QueryOverdueRepatriations');
    
    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const repatriations = result.data || [];
    
    res.json({
      success: true,
      data: repatriations,
      count: repatriations.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[REPATRIATION] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Map an InitiateRepatriation chain failure to its client-error HTTP
// status (F-8). A duplicate initiate — the payment already has a
// repatriation record (composite-key + legacy uniqueness checks,
// repatriation.go) — is a client-side state conflict (409), not a server
// error; anything else stays 500.
function initiateFailureStatus(error: string): number | null {
  if (error.includes('already has a repatriation record')) return 409;
  return null;
}

// POST /api/v1/repatriation/initiate — Initiate new repatriation
// LEG3 M-11: this route had ZERO validation — an empty body reached
// submitTransactionAs and failed at the Fabric layer as a 500/409.
// Validation now rejects bad input up front (400 VALIDATION_ERROR, the
// codebase standard — see middleware/validation.ts — rather than a
// one-off 422). shipmentDate must be YYYY-MM-DD: the chaincode parses
// exactly that format (repatriation.go).
router.post('/initiate', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER']), [
  body('repatriationId').notEmpty().withMessage('Repatriation ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('contractId').notEmpty().withMessage('Contract ID is required'),
  body('shipmentId').notEmpty().withMessage('Shipment ID is required'),
  body('exporterId').notEmpty().withMessage('Exporter ID is required'),
  body('exportAmount').isFloat({ gt: 0 }).withMessage('Export amount must be greater than 0'),
  body('currency').notEmpty().withMessage('Currency is required'),
  body('fcyAccountNumber').notEmpty().withMessage('FCY account number is required'),
  body('fcyBank').notEmpty().withMessage('FCY bank is required'),
  body('fcyBankBIC').notEmpty().withMessage('FCY bank BIC is required'),
  body('shipmentDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Shipment date must be YYYY-MM-DD'),
  body('swiftReference').optional().isString(),
  body('bankStatementRef').optional().isString(),
  body('notes').optional().isString(),
], validateRequest, async (req, res) => {
  try {
    const {
      repatriationId,
      paymentId,
      contractId,
      shipmentId,
      exporterId,
      exportAmount,
      currency,
      fcyAccountNumber,
      fcyBank,
      fcyBankBIC,
      shipmentDate,
      // LEG3 M-11: these three used to be silently discarded — the
      // dialog sent them and the handler destructured only the 11
      // chaincode args. They are now stored in the PG mirror below.
      swiftReference,
      bankStatementRef,
      notes
    } = req.body;

    logger.info(`[REPATRIATION] 📝 Initiating repatriation: ${repatriationId}`);

    // Pinned to BanksMSP: InitiateRepatriation enforces a bank MSP
    // (repatriation.go: isBankMSP) and the shared gateway otherwise signs
    // as whatever org the previous concurrent request connected as
    // (cb12f0b4 precedent). submitTransactionAs throws on chain failure,
    // exactly like submitTransaction did here.
    const result = await fabricService.submitTransactionAs('BanksMSP', 'InitiateRepatriation',
      repatriationId,
      paymentId,
      contractId,
      shipmentId,
      exporterId,
      String(exportAmount),
      currency,
      fcyAccountNumber,
      fcyBank,
      fcyBankBIC,
      shipmentDate
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to initiate: ${result.error}`);
      const status = initiateFailureStatus(result.error || '');
      return res.status(status ?? 500).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`[REPATRIATION] ✅ Initiated: ${repatriationId}`);

    // LEG3 M-11: mirror the initiation to Postgres, INCLUDING the three
    // form extras the old handler dropped (swiftReference -> the
    // swift_references evidence array, bankStatementRef -> bank
    // certificate, notes -> comments). Ledger-first and best-effort: the
    // chain write already committed; a mirror failure is logged, never
    // failed. compliance_deadline mirrors the chaincode's shipment date
    // + 120 days (repatriation.go); status PENDING matches the ledger.
    try {
      const deadline = new Date(`${shipmentDate}T00:00:00.000Z`);
      deadline.setUTCDate(deadline.getUTCDate() + 120);
      await postgresDb.run(
        `INSERT INTO export_proceeds_repatriation (
          repatriation_id, payment_id, contract_id, shipment_id, exporter_id,
          export_amount, currency, fcy_account_number, fcy_bank, fcy_bank_bic,
          shipment_date, compliance_deadline, status,
          swift_references, bank_certificate, comments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING', $13, $14, $15)
        ON CONFLICT (repatriation_id) DO NOTHING`,
        [
          repatriationId, paymentId, contractId, shipmentId, exporterId,
          Number(exportAmount), currency, fcyAccountNumber, fcyBank, fcyBankBIC,
          shipmentDate, deadline.toISOString(),
          swiftReference ? JSON.stringify([swiftReference]) : '[]',
          bankStatementRef || null,
          notes || null,
        ]
      );
    } catch (mirrorErr) {
      logger.warn(`[REPATRIATION] Could not mirror initiation of ${repatriationId} to Postgres:`, mirrorErr);
    }

    res.status(201).json({
      success: true,
      message: 'Repatriation initiated successfully',
      data: {
        repatriationId,
        swiftReference: swiftReference || undefined,
        bankStatementRef: bankStatementRef || undefined,
        notes: notes || undefined,
      },
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error initiating:', error);
    const status = initiateFailureStatus(error?.message || '');
    res.status(status ?? 500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/repatriation/:id/record — Record actual repatriation
// LEG3 M-11 (same class as /initiate): no validation — an empty body
// failed at the Fabric layer as a 500.
router.post('/:id/record', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER']), [
  param('id').notEmpty().withMessage('Repatriation ID is required'),
  body('repatriatedAmount').isFloat({ gt: 0 }).withMessage('Repatriated amount must be greater than 0'),
  body('convertedAmount').isFloat({ gt: 0 }).withMessage('Converted amount must be greater than 0'),
  body('exchangeRate').isFloat({ gt: 0 }).withMessage('Exchange rate must be greater than 0'),
  body('swiftReference').optional().isString(),
  body('bankCertificate').optional().isString(),
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      repatriatedAmount,
      convertedAmount,
      exchangeRate,
      swiftReference,
      bankCertificate
    } = req.body;

    logger.info(`[REPATRIATION] 💰 Recording repatriation: ${id}`);

    const result = await fabricService.submitTransactionAs('BanksMSP', 'RecordRepatriation',
      id,
      String(repatriatedAmount),
      String(convertedAmount),
      String(exchangeRate),
      swiftReference || '',
      bankCertificate || ''
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to record: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[REPATRIATION] ✅ Recorded: ${id}`);

    res.json({
      success: true,
      message: 'Repatriation recorded successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error recording:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Map a VerifyRepatriation chain failure to its client-error HTTP status.
// submitTransaction throws on chain failure (fabricService.ts:2881-2889),
// so the classification must live in the catch as well as the !success
// branch: a missing record or a record in the wrong state (e.g. already
// COMPLIED) is a client-side state failure, not a server error (F-8).
// Non-existent -> 400, wrong state -> 409, missing reference -> 400,
// wrong signing MSP -> 403; anything else stays 500.
function verifyFailureStatus(error: string): number | null {
  if (error.includes('does not exist')) return 400;
  if (error.includes('not ready for compliance verification')) return 409;
  if (error.includes('verification reference is required')) return 400;
  if (error.includes('only NBE can verify')) return 403;
  return null;
}

// POST /api/v1/repatriation/:id/verify — NBE verify repatriation
router.post('/:id/verify', authMiddleware, requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationRef, verificationNotes } = req.body;

    logger.info(`[REPATRIATION] ✅ NBE verifying: ${id}`);

    const result = await fabricService.submitTransactionAs('NBEMSP', 'VerifyRepatriation',
      id,
      verificationRef || '',
      verificationNotes || ''
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to verify: ${result.error}`);
      const status = verifyFailureStatus(result.error || '');
      return res.status(status ?? 500).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`[REPATRIATION] ✅ Verified: ${id}`);

    // N4: mirror the verification into Postgres, matching the ledger.
    // The old handler wrote to the chain only, so the PG row stayed
    // PENDING with NULL verification fields while the ledger was
    // COMPLIED. Ledger-first and best-effort: the chain write already
    // committed; a mirror failure is logged, never failed. The state
    // is read back from the ledger (COMPLIED or NON_COMPLIANT) rather
    // than assumed, so the mirror matches what the chain holds.
    try {
      const ledgerRecord = await fabricService.evaluateTransaction('ReadRepatriation', id);
      if (ledgerRecord.success && ledgerRecord.data) {
        const d: any = ledgerRecord.data;
        const mirrored = await postgresDb.run(
          `UPDATE export_proceeds_repatriation
           SET status = $1, verified_by = $2, verified_by_msp = $3,
               verification_date = $4, verification_ref = $5,
               verification_notes = $6, compliance_date = $7,
               is_overdue = $8, updated_at = CURRENT_TIMESTAMP
           WHERE repatriation_id = $9`,
          [
            d.status || d.Status || null,
            d.verifiedBy || d.VerifiedBy || null,
            d.verifiedByMsp || d.VerifiedByMSP || null,
            d.verificationDate || d.VerificationDate || null,
            d.verificationRef || d.VerificationRef || null,
            d.verificationNotes || d.VerificationNotes || null,
            d.complianceDate || d.ComplianceDate || null,
            d.isOverdue ?? d.IsOverdue ?? false,
            id,
          ]
        );
        if (!mirrored || mirrored.rowCount === 0) {
          logger.warn(`[REPATRIATION] Verify mirror: no PG row for ${id} — ledger is ${d.status || d.Status} but Postgres has nothing to update`);
        }
      } else {
        logger.warn(`[REPATRIATION] Could not read back ${id} from the ledger to mirror verification:`, ledgerRecord.error);
      }
    } catch (mirrorErr) {
      logger.warn(`[REPATRIATION] Could not mirror verification of ${id} to Postgres:`, mirrorErr);
    }

    res.json({
      success: true,
      message: 'Repatriation verified successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error verifying:', error);
    const status = verifyFailureStatus(error.message || '');
    res.status(status ?? 500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/repatriation/:id/penalty — Apply penalty
router.post('/:id/penalty', authMiddleware, requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { penaltyAmount, penaltyCurrency, reason } = req.body;

    logger.info(`[REPATRIATION] ⚠️  Applying penalty: ${id}`);

    const result = await fabricService.submitTransactionAs('NBEMSP', 'ApplyNonCompliancePenalty',
      id,
      String(penaltyAmount),
      penaltyCurrency,
      reason
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to apply penalty: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[REPATRIATION] ✅ Penalty applied: ${id}`);

    res.json({
      success: true,
      message: 'Penalty applied successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error applying penalty:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/repatriation/:id/waiver/request — Request waiver
router.post('/:id/waiver/request', authMiddleware, requireRole(['EXPORTER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { waiverReason } = req.body;

    const record = await fabricService.evaluateTransaction('ReadRepatriation', id);
    const user = (req as any).user;
    if (!record.success || !record.data) {
      return res.status(404).json({ success: false, error: 'Repatriation record not found' });
    }
    if (String(user?.exporterId || user?.username || '') !== String(record.data.exporterId || record.data.ExporterID || '')) {
      return res.status(403).json({ success: false, error: 'Exporters can only request waivers for their own repatriation records' });
    }
    if (!String(waiverReason || '').trim()) {
      return res.status(400).json({ success: false, error: 'A waiver reason is required' });
    }

    logger.info(`[REPATRIATION] 📄 Requesting waiver: ${id}`);

    const result = await fabricService.submitTransactionAs('ECTAMSP', 'RequestWaiver',
      id,
      waiverReason
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to request waiver: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[REPATRIATION] ✅ Waiver requested: ${id}`);

    res.json({
      success: true,
      message: 'Waiver requested successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error requesting waiver:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/repatriation/:id/waiver/approve — Approve/reject waiver
router.post('/:id/waiver/approve', authMiddleware, requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;

    logger.info(`[REPATRIATION] 📋 NBE approving waiver: ${id}`);

    const result = await fabricService.submitTransactionAs('NBEMSP', 'ApproveWaiver',
      id,
      String(approved),
      reason || ''
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to approve waiver: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[REPATRIATION] ✅ Waiver ${approved ? 'approved' : 'rejected'}: ${id}`);

    res.json({
      success: true,
      message: `Waiver ${approved ? 'approved' : 'rejected'} successfully`,
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[REPATRIATION] ❌ Error approving waiver:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
