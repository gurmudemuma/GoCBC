// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Export Proceeds Repatriation API Routes

import express from 'express';
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
router.post('/initiate', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER']), async (req, res) => {
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
      shipmentDate
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

    res.status(201).json({
      success: true,
      message: 'Repatriation initiated successfully',
      data: { repatriationId },
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
router.post('/:id/record', authMiddleware, requireRole(['BANKS', 'BANK', 'BANK_ADMIN', 'BANK OFFICER']), async (req, res) => {
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
