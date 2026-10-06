// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Pre-shipment Inspection API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

// ==================== PRE-SHIPMENT INSPECTION ROUTES ====================

// GET /api/v1/inspection — Get all inspections
router.get('/', authMiddleware, async (req, res) => {
  try {
    logger.info('[INSPECTION] 🔗 Querying all inspections from blockchain...');
    
    const result = await fabricService.evaluateTransaction('QueryAllInspections');
    
    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Blockchain query failed: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        source: 'blockchain'
      });
    }

    const inspections = result.data || [];
    logger.info(`[INSPECTION] ✅ Retrieved ${inspections.length} inspections`);

    res.json({
      success: true,
      data: inspections,
      count: inspections.length,
      source: 'blockchain',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error fetching inspections:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/inspection/:id — Get specific inspection
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[INSPECTION] 🔍 Fetching inspection: ${id}`);
    
    const result = await fabricService.evaluateTransaction('ReadInspection', id);
    
    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to fetch: ${result.error}`);
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
    logger.error(`[INSPECTION] ❌ Error fetching inspection:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/inspection/shipment/:shipmentId — Get by shipment
router.get('/shipment/:shipmentId', authMiddleware, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    logger.info(`[INSPECTION] 🔍 Fetching inspections for shipment: ${shipmentId}`);
    
    const result = await fabricService.evaluateTransaction('QueryInspectionsByShipment', shipmentId);
    
    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const inspections = result.data || [];
    
    res.json({
      success: true,
      data: inspections,
      count: inspections.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[INSPECTION] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/inspection/status/:status — Get by status
router.get('/status/:status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    logger.info(`[INSPECTION] 🔍 Fetching inspections with status: ${status}`);
    
    const result = await fabricService.evaluateTransaction('QueryInspectionsByStatus', status);
    
    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const inspections = result.data || [];
    
    res.json({
      success: true,
      data: inspections,
      count: inspections.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[INSPECTION] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/request — Request new inspection
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const {
      inspectionId,
      contractId,
      shipmentId,
      exporterId,
      inspectionAgency,
      inspectionLocation,
      contractQuantity,
      contractGrade,
      contractType,
      packagingType
    } = req.body;

    logger.info(`[INSPECTION] 📝 Requesting inspection: ${inspectionId}`);

    const result = await fabricService.submitTransaction('RequestPreShipmentInspection',
      inspectionId,
      contractId,
      shipmentId,
      exporterId,
      inspectionAgency,
      inspectionLocation,
      String(contractQuantity),
      contractGrade,
      contractType,
      packagingType
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to request: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Requested: ${inspectionId}`);

    res.status(201).json({
      success: true,
      message: 'Inspection requested successfully',
      data: { inspectionId },
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error requesting:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/:id/schedule — Schedule inspection
router.post('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inspectorName,
      inspectorLicense,
      inspectionDate
    } = req.body;

    logger.info(`[INSPECTION] 📅 Scheduling inspection: ${id}`);

    const result = await fabricService.submitTransaction('ScheduleInspection',
      id,
      inspectorName,
      inspectorLicense,
      inspectionDate
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to schedule: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Scheduled: ${id}`);

    res.json({
      success: true,
      message: 'Inspection scheduled successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error scheduling:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/:id/results — Record inspection results
router.post('/:id/results', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inspectedQuantity,
      actualGrade,
      cuppingScore,
      defectsCount,
      moistureContent,
      beanSize,
      bagsInspected,
      packagingCondition,
      overallResult,
      inspectionNotes
    } = req.body;

    logger.info(`[INSPECTION] 📊 Recording results: ${id}`);

    const result = await fabricService.submitTransaction('RecordInspectionResults',
      id,
      String(inspectedQuantity || 0),
      actualGrade || '',
      String(cuppingScore || 0),
      String(defectsCount || 0),
      String(moistureContent || 0),
      beanSize || '',
      String(bagsInspected || 0),
      packagingCondition || '',
      overallResult,
      inspectionNotes || ''
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to record results: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Results recorded: ${id} - ${overallResult}`);

    res.json({
      success: true,
      message: 'Inspection results recorded successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error recording results:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/:id/certificate — Issue certificate
router.post('/:id/certificate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateNumber, certificateURL } = req.body;

    logger.info(`[INSPECTION] 📜 Issuing certificate: ${id}`);

    const result = await fabricService.submitTransaction('IssueCertificate',
      id,
      certificateNumber,
      certificateURL || ''
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to issue certificate: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Certificate issued: ${id}`);

    res.json({
      success: true,
      message: 'Certificate issued successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error issuing certificate:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/:id/approve — Approve inspection
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    logger.info(`[INSPECTION] ✅ Approving inspection: ${id}`);

    const result = await fabricService.submitTransaction('ApproveInspection',
      id,
      comments || ''
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to approve: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Approved: ${id}`);

    res.json({
      success: true,
      message: 'Inspection approved successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error approving:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/inspection/:id/reject — Reject inspection
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    logger.info(`[INSPECTION] ❌ Rejecting inspection: ${id}`);

    const result = await fabricService.submitTransaction('RejectInspection',
      id,
      rejectionReason
    );

    if (!result.success) {
      logger.error(`[INSPECTION] ❌ Failed to reject: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[INSPECTION] ✅ Rejected: ${id}`);

    res.json({
      success: true,
      message: 'Inspection rejected successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error rejecting:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
