// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Export Proceeds Repatriation API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

// ==================== EXPORT PROCEEDS REPATRIATION ROUTES ====================

// GET /api/v1/repatriation — Get all repatriations
router.get('/', authMiddleware, async (req, res) => {
  try {
    logger.info('[REPATRIATION] 🔗 Querying all repatriations from blockchain...');
    
    const result = await fabricService.evaluateTransaction('QueryAllRepatriations');
    
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
router.get('/:id', authMiddleware, async (req, res) => {
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
router.get('/exporter/:exporterId', authMiddleware, async (req, res) => {
  try {
    const { exporterId } = req.params;
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
router.get('/status/:status', authMiddleware, async (req, res) => {
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
router.get('/overdue/all', authMiddleware, async (req, res) => {
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

// POST /api/v1/repatriation/initiate — Initiate new repatriation
router.post('/initiate', authMiddleware, async (req, res) => {
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

    const result = await fabricService.submitTransaction('InitiateRepatriation',
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
      return res.status(500).json({ 
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
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/repatriation/:id/record — Record actual repatriation
router.post('/:id/record', authMiddleware, async (req, res) => {
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

    const result = await fabricService.submitTransaction('RecordRepatriation',
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

// POST /api/v1/repatriation/:id/verify — NBE verify repatriation
router.post('/:id/verify', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationRef, verificationNotes } = req.body;

    logger.info(`[REPATRIATION] ✅ NBE verifying: ${id}`);

    const result = await fabricService.submitTransaction('VerifyRepatriation',
      id,
      verificationRef || '',
      verificationNotes || ''
    );

    if (!result.success) {
      logger.error(`[REPATRIATION] ❌ Failed to verify: ${result.error}`);
      return res.status(500).json({ 
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
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/repatriation/:id/penalty — Apply penalty
router.post('/:id/penalty', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { penaltyAmount, penaltyCurrency, reason } = req.body;

    logger.info(`[REPATRIATION] ⚠️  Applying penalty: ${id}`);

    const result = await fabricService.submitTransaction('ApplyNonCompliancePenalty',
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
router.post('/:id/waiver/request', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { waiverReason } = req.body;

    logger.info(`[REPATRIATION] 📄 Requesting waiver: ${id}`);

    const result = await fabricService.submitTransaction('RequestWaiver',
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
router.post('/:id/waiver/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;

    logger.info(`[REPATRIATION] 📋 NBE approving waiver: ${id}`);

    const result = await fabricService.submitTransaction('ApproveWaiver',
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
