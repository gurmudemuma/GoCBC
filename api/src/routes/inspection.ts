// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Pre-shipment Inspection API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

// ==================== PRE-SHIPMENT INSPECTION ROUTES ====================

// POST /api/v1/inspection — Create inspection (wrapper for /request endpoint)
router.post('/', authMiddleware,
  requireRole('EXPORTER', 'ECTA', 'ECTA_ADMIN'), async (req, res) => {
  try {
    const {
      inspectionID,
      shipmentID,
      contractID,
      exporterID,
      inspectorID,
      coffeeType,
      quantity,
      qualityGrade,
      moistureContent,
      defectPercentage,
      cuppingScore,
      result: inspectionResult,
      status
    } = req.body;

    logger.info(`[INSPECTION] 📝 Creating inspection: ${inspectionID}`);

    // Map workflow test parameters to blockchain function parameters
    const inspectionId = inspectionID || req.body.inspectionId;
    const contractId = contractID || req.body.contractId || '';
    const shipmentId = shipmentID || req.body.shipmentId || '';
    const exporterId = exporterID || req.body.exporterId || '';
    const inspectionAgency = 'SGS'; // Default inspection agency
    const inspectionLocation = 'Addis Ababa Warehouse';
    const contractQuantity = quantity || 10000;
    const contractGrade = qualityGrade || coffeeType || 'Grade 2';
    const contractType = coffeeType || 'Arabica';
    const packagingType = 'JUTE_BAGS';

    if (!inspectionId || !shipmentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: inspectionID, shipmentID',
        },
        timestamp: new Date().toISOString(),
      });
    }

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
      logger.error(`[INSPECTION] ❌ Failed to create: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        timestamp: new Date().toISOString() 
      });
    }

    logger.info(`[INSPECTION] ✅ Created: ${inspectionId}`);

    res.status(201).json({
      success: true,
      message: 'Inspection created successfully',
      data: { inspectionID: inspectionId, inspectionId, status: 'pending' },
      txId: result.transactionId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[INSPECTION] ❌ Error creating:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

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
router.post('/request', authMiddleware,
  requireRole('EXPORTER', 'ECTA', 'ECTA_ADMIN'), async (req, res) => {
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
router.post('/:id/schedule', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inspectorName,
      inspectorLicense,
      inspectionDate
    } = req.body;

    // All three are passed straight to the chaincode call; an undefined
    // arg makes fabric-common throw "Cannot read properties of undefined
    // (reading 'toString')" and surfaces as a 500 with no usable detail.
    // Fail honestly with 400 instead.
    if (!inspectorName || !inspectorLicense || !inspectionDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'inspectorName, inspectorLicense and inspectionDate are all required to schedule an inspection'
        },
        timestamp: new Date().toISOString()
      });
    }

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
router.post('/:id/results', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req, res) => {
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
router.post('/:id/certificate', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req, res) => {
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
router.post('/:id/approve', authMiddleware, requireRole('ECTA', 'ECTA_ADMIN'), async (req, res) => {
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

    // Leg2 #6: a pre-shipment inspection approved here must satisfy the
    // permit gate — quality.ts issue-permit requires a
    // quality_inspections row with status='APPROVED', and nothing in
    // this parallel system ever wrote that table, so an inspection
    // completed here could never lead to a permit. Mirror the approval
    // into quality_inspections (best-effort: the chaincode approval
    // already committed, so a mirror failure must never fail this
    // response). The inspection is read back from the ledger for its
    // shipment/contract/exporter linkage.
    try {
      const readBack = await fabricService.evaluateTransaction('ReadInspection', id);
      const insp: any = readBack?.success ? readBack.data : null;
      const shipmentId = insp?.shipmentId || insp?.ShipmentID || insp?.shipmentID || '';
      const contractId = insp?.contractId || insp?.ContractID || insp?.contractID || '';
      const exporterId = insp?.exporterId || insp?.ExporterID || insp?.exporterID || '';
      if (shipmentId) {
        // No ON CONFLICT here: idx_quality_inspections_inspection_id
        // is a PARTIAL unique index (WHERE inspection_id IS NOT NULL),
        // which ON CONFLICT (inspection_id) cannot target.
        const existing = await postgresDb.get(
          'SELECT id FROM quality_inspections WHERE inspection_id = $1',
          [id]
        );
        if (existing) {
          await postgresDb.run(
            `UPDATE quality_inspections SET status = 'APPROVED', passed = true,
               blockchain_tx_id = $2, updated_at = NOW() WHERE inspection_id = $1`,
            [id, result.transactionId || null]
          );
        } else {
          await postgresDb.run(
            `INSERT INTO quality_inspections (
               inspection_id, exporter_id, contract_id, shipment_id,
               coffee_type, quantity, status, passed, blockchain_tx_id
             ) VALUES ($1, $2, $3, $4, 'Arabica', $5, 'APPROVED', true, $6)`,
            [id, exporterId || null, contractId || null, shipmentId, Number(insp?.quantity ?? insp?.Quantity ?? 0) || null, result.transactionId || null]
          );
        }
        logger.info(`[INSPECTION] ✅ Mirrored approval of ${id} into quality_inspections (APPROVED) for shipment ${shipmentId}`);
      } else {
        logger.warn(`[INSPECTION] Could not mirror approval of ${id}: ledger read returned no shipment linkage`);
      }
    } catch (mirrorErr: any) {
      logger.warn(`[INSPECTION] Could not mirror approval of ${id} into quality_inspections:`, mirrorErr.message);
    }

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
router.post('/:id/reject', authMiddleware, requireRole('ECTA', 'ECTA_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // rejectionReason is passed straight to the chaincode call; an
    // undefined arg makes fabric-common throw "Cannot read properties of
    // undefined (reading 'toString')" and surfaces as a 500. Fail
    // honestly with 400 instead.
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'rejectionReason is required to reject an inspection'
        },
        timestamp: new Date().toISOString()
      });
    }

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
