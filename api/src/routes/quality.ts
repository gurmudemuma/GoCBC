import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { ShipmentService } from '../services/shipmentService';
import { logger } from '../utils/logger';
import notificationService from '../services/notificationService';
import { resolveDocumentPath } from '../utils/fileUtils';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();
const shipmentService = ShipmentService.getInstance();

/**
 * STRICT chaincode write for quality approve/reject.
 *
 * ApproveQualityInspection / RejectQualityInspection exist in
 * chaincodes/coffee/quality.go and in the deployed chaincode v2.3
 * (the ledger-proof run saw ApproveQualityInspection execute and fail
 * with "inspection does not exist" — the function is there, the
 * inspection was not, because create never wrote it on-chain). Both
 * operate on the QualityInspection entity keyed INSPECTION_<id> and
 * guard INSPECTED -> APPROVED / REJECTED.
 *
 * This is deliberately NOT best-effort: the old best-effort sync wrote
 * APPROVED to Postgres first and then reported HTTP 200 with
 * blockchainSynced:false when the ledger write failed — a phantom
 * success (LEDGER-PROOF-REPORT §4). A failed ledger write here is a
 * failed decision: the caller returns non-2xx and no Postgres mirror
 * is written. The old "no function yet" comment above was stale.
 */
async function syncQualityDecision(
  functionName: 'ApproveQualityInspection' | 'RejectQualityInspection',
  args: string[]
): Promise<{ ok: true; txId: string | null } | { ok: false; error: string }> {
  try {
    const chainResult = await fabricService.invokeChaincode(functionName, args);
    if (chainResult.success) {
      return { ok: true, txId: chainResult.txId || null };
    }
    return { ok: false, error: chainResult.error || `Chaincode ${functionName} failed` };
  } catch (chainError: any) {
    return { ok: false, error: chainError.message };
  }
}

/**
 * Shared approve/reject core (TEST-STATUS-MATRIX §17 #14): the POST and
 * PUT approve routes — and the POST and PUT reject routes — duplicated
 * this logic with diverging writes. One core now does the guard (the
 * inspection must exist and be INSPECTED), the LEDGER write FIRST, and
 * only then the Postgres mirror. If the ledger write fails the decision
 * fails honestly (503, no Postgres write) — never HTTP 200 APPROVED
 * with blockchainSynced:false. The routes add only their own extras —
 * the POST approve's document signing — and their own response shape
 * (POST: certificateNo + customsAutoTriggered; PUT: certificateNumber
 * + grade).
 */
async function decideQualityInspection(
  inspectionID: string,
  decision: 'APPROVED' | 'REJECTED',
  opts: { certificateNumber?: string; grade?: string; remarks?: string; reason?: string; approvedBy?: string }
): Promise<
  | { ok: true; chainSync: { blockchainSynced: boolean; blockchainWarning: string | null; blockchain_tx_id: string | null }; certificateNumber: string; grade: string }
  | { ok: false; status: number; error: { code: string; message: string } }
> {
  const inspection = await postgresDb.get(
    'SELECT id, status, shipment_id, exporter_id FROM quality_inspections WHERE inspection_id = $1',
    [inspectionID]
  );

  if (!inspection) {
    return { ok: false, status: 404, error: { code: 'NOT_FOUND', message: 'Inspection not found' } };
  }

  const verb = decision === 'APPROVED' ? 'approve' : 'reject';
  if (inspection.status !== 'INSPECTED') {
    return { ok: false, status: 400, error: { code: 'INVALID_STATUS', message: `Cannot ${verb} inspection. Current status: ${inspection.status}. Must be 'INSPECTED' first.` } };
  }

  const certificateNumber = opts.certificateNumber || `CERT-${inspectionID}`;
  const grade = opts.grade || 'Grade 1';

  // LEDGER FIRST: the Postgres mirror below is written only after the
  // on-chain decision succeeds. ApproveQualityInspection requires the
  // inspection to exist on-chain in INSPECTED status — which is why
  // create/perform/lab-results must also go on-chain (see those
  // handlers). A failure here returns 503 and writes nothing.
  const chainFn = decision === 'APPROVED' ? 'ApproveQualityInspection' : 'RejectQualityInspection';
  const chainArgs = decision === 'APPROVED'
    ? [inspectionID, opts.approvedBy || 'ECTA Quality Director']
    : [inspectionID, opts.reason || ''];
  const chainResult = await syncQualityDecision(chainFn, chainArgs);
  if (!chainResult.ok) {
    logger.error(`[QUALITY] ${chainFn} failed for ${inspectionID}: ${chainResult.error}`);
    return {
      ok: false,
      status: 503,
      error: {
        code: decision === 'APPROVED' ? 'INSPECTION_APPROVE_FAILED' : 'INSPECTION_REJECT_FAILED',
        message: chainResult.error,
      },
    };
  }
  const chainSync = { blockchainSynced: true, blockchainWarning: null, blockchain_tx_id: chainResult.txId };

  if (decision === 'APPROVED') {
    await postgresDb.run(
      `UPDATE quality_inspections SET
        status = 'APPROVED',
        passed = true,
        certification_number = $2,
        grade = COALESCE($3, grade, 'Grade 1'),
        remarks = COALESCE($4, remarks),
        blockchain_tx_id = $5,
        updated_at = NOW()
       WHERE inspection_id = $1`,
      [inspectionID, certificateNumber, opts.grade || null, opts.remarks || null, chainSync.blockchain_tx_id]
    );

    // O-1: ApproveQualityInspection moves the linked shipment
    // INSPECTION_PENDING -> INSPECTION_COMPLETE on-chain (quality.go:444);
    // mirror it in Postgres so the shipment leaves INSPECTION_PENDING.
    // Best-effort: the mirror never fails the decision. (Reject moves no
    // shipment status — the shipment stays INSPECTION_PENDING — so the
    // REJECTED branch below mirrors nothing.)
    if ((inspection as any).shipment_id) {
      await shipmentService.mirrorShipmentStatus((inspection as any).shipment_id, 'INSPECTION_COMPLETE');
    }
  } else {
    await postgresDb.run(
      `UPDATE quality_inspections SET
        status = 'REJECTED',
        passed = false,
        remarks = $2,
        notes = $2,
        blockchain_tx_id = $3,
        updated_at = NOW()
       WHERE inspection_id = $1`,
      [inspectionID, `REJECTED: ${opts.reason || ''}`, chainSync.blockchain_tx_id]
    );
  }

  // In-app notification (persisted feed + live WS broadcast). This helper
  // serves all four approve/reject routes, so one hook covers them all.
  // Best-effort inside emitWorkflowEvent: never fails the decision.
  await notificationService.emitWorkflowEvent({
    type: decision === 'APPROVED' ? 'inspection_passed' : 'inspection_failed',
    title: decision === 'APPROVED'
      ? `Inspection ${inspectionID} approved`
      : `Inspection ${inspectionID} rejected`,
    message: decision === 'APPROVED'
      ? `Quality inspection ${inspectionID} was approved (certificate ${certificateNumber}, ${grade}).`
      : `Quality inspection ${inspectionID} was rejected. Reason: ${opts.reason || 'quality requirements not met'}`,
    entityType: 'inspection', entityId: inspectionID,
    severity: decision === 'APPROVED' ? 'success' : 'warning',
    roles: ['ECTA'], exporterId: (inspection as any).exporter_id || undefined,
    actionUrl: '/portals/exporter?tab=quality',
    actionUrls: { ECTA: '/portals/ecta?tab=quality' },
  });
  return { ok: true, chainSync, certificateNumber, grade };
}

/**
 * @route GET /api/v1/quality/inspections
 * @route GET /api/v1/quality-inspections
 * @desc Get all quality inspections (with optional filters)
 * @access Authenticated
 */
router.get('/inspections',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, shipmentId, type, limit = '50' } = req.query;
      
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      if (shipmentId) {
        query += ` AND shipment_id = $${paramIndex}`;
        params.push(shipmentId);
        paramIndex++;
      }
      
      // ✅ NEW: Add inspection type filter
      if (type) {
        query += ` AND inspection_type = $${paramIndex}`;
        params.push(String(type).toUpperCase());
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspections list error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Also respond to root /quality GET request
router.get('/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, shipmentId, type, limit = '50' } = req.query;
      
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      if (shipmentId) {
        query += ` AND shipment_id = $${paramIndex}`;
        params.push(shipmentId);
        paramIndex++;
      }
      
      // ✅ NEW: Add inspection type filter
      if (type) {
        query += ` AND inspection_type = $${paramIndex}`;
        params.push(String(type).toUpperCase());
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspections list error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ✅ NEW: Convenience endpoint for pre-shipment inspections
router.get('/pre-shipment',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, limit = '50' } = req.query;
      
      // Return all inspections - table doesn't have type column to filter
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        type: 'pre-shipment',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Pre-shipment inspections error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ✅ NEW: Convenience endpoint for post-delivery audits
router.get('/post-delivery',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterId, limit = '50' } = req.query;
      
      // Return all inspections - table doesn't have type column to filter
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (exporterId) {
        query += ` AND exporter_id = $${paramIndex}`;
        params.push(exporterId);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string) || 50);
      
      const inspections = await postgresDb.all(query, params);
      
      res.json({
        success: true,
        data: inspections,
        count: inspections.length,
        type: 'post-delivery',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Post-delivery audits error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Helper function for validation
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * @route POST /api/v1/quality/inspections
 * @desc Request quality inspection
 * @access Exporter, ECTA
 */
router.post('/inspections',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    body('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID, exporterID, contractID, shipmentID, coffeeType, quantity, sampleSize, requestedDate } = req.body;

      // Validate shipment ID is provided
      if (!shipmentID) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SHIPMENT_ID',
            message: 'Shipment ID is required to create an inspection'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check if inspection ID already exists
      const existing = await postgresDb.get(
        'SELECT id FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSPECTION_EXISTS',
            message: 'Inspection ID already exists'
          },
          timestamp: new Date().toISOString()
        });
      }

      // F9 (leg2): the named shipment must exist in Postgres AND on
      // the ledger before an inspection is requested for it — the
      // chaincode refuses it too (seq 11), but refuse honestly here
      // first with 404 instead of a 503 chain refusal.
      const shipmentCheck = await shipmentService.assertShipmentExists(shipmentID);
      if (!shipmentCheck.ok) {
        if (shipmentCheck.unavailable) {
          return res.status(503).json({
            success: false,
            error: { code: 'SHIPMENT_VERIFY_UNAVAILABLE', message: shipmentCheck.message },
            timestamp: new Date().toISOString()
          });
        }
        return res.status(404).json({
          success: false,
          error: { code: 'SHIPMENT_NOT_FOUND', message: shipmentCheck.message },
          timestamp: new Date().toISOString()
        });
      }

      // Check if shipment already has a pending inspection. Only a REAL
      // inspection counts: one created by this endpoint via RequestInspection
      // on-chain, whose Postgres mirror carries a blockchain_tx_id. Shipment
      // creation no longer auto-creates an inspection (removed 2026-11-12),
      // so a fresh shipment has no row here and this query returns nothing.
      // The `blockchain_tx_id IS NOT NULL` filter also keeps legacy phantom
      // rows (PG-only PENDING inspections with NULL tx id, created by the old
      // auto-create before its removal) from tripping the guard: an explicit
      // request for such a shipment proceeds to a real on-chain inspection.
      const pendingInspection = await postgresDb.get(
        'SELECT inspection_id FROM quality_inspections WHERE shipment_id = $1 AND status = $2 AND blockchain_tx_id IS NOT NULL',
        [shipmentID, 'PENDING']
      );

      if (pendingInspection) {
        // Return the existing inspection instead of an error — a genuine
        // duplicate while a real on-chain inspection is PENDING.
        logger.info(`Shipment ${shipmentID} already has inspection ${pendingInspection.inspection_id}, returning existing`);
        return res.status(200).json({
          success: true,
          data: { 
            inspectionID: pendingInspection.inspection_id, 
            status: 'PENDING',
            message: 'Inspection already exists for this shipment'
          },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: create the inspection on the ledger via
      // RequestInspection (chaincodes/coffee/quality.go:103) —
      // (inspectionID, shipmentID, contractID, exporterID, scheduledDate).
      // It writes INSPECTION_<id> with status PENDING and replicates
      // through the orderer to all 6 peers. The old code PUT a doc with
      // _id `inspection:<id>` straight into ECTA's CouchDB only: no
      // endorsement, no block, invisible to chaincode on the other five
      // peers (LEDGER-PROOF-REPORT §4 — `inspection:<id>` existed only
      // on couchdb.ecta:5985, GetHistory 0 entries), while the API
      // returned 200. The Postgres insert below runs ONLY after the
      // ledger write succeeds, so a failed create reports 503 and
      // leaves no phantom PG row for approve to act on.
      const scheduledDate = requestedDate || new Date().toISOString().split('T')[0];
      const chainResult = await fabricService.invokeChaincode('RequestInspection', [
        inspectionID,
        shipmentID,
        contractID || '',
        exporterID,
        scheduledDate,
      ]);
      let blockchain_tx_id: string | null = null;
      if (!chainResult.success) {
        const message = chainResult.error || 'RequestInspection failed';
        logger.error(`[INSPECTION] RequestInspection failed for ${inspectionID}: ${message}`);
        // Idempotent recovery: the inspection IS on the ledger but has
        // no Postgres mirror (e.g. a crash between the two writes).
        // Mirror it instead of failing — the ledger write demonstrably
        // happened, so this is a recovery, not a phantom success.
        if (/already exists/i.test(message)) {
          logger.warn(`[INSPECTION] Inspection ${inspectionID} already exists on-chain; restoring Postgres mirror`);
          await postgresDb.run(
            `INSERT INTO quality_inspections (
              inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
              quantity, sample_size, requested_date, status, blockchain_tx_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [inspectionID, exporterID, contractID || null, shipmentID || null, coffeeType,
             quantity, sampleSize || null, scheduledDate, 'PENDING', null]
          );
          return res.json({
            success: true,
            data: { inspectionID, status: 'PENDING', blockchain_tx_id: null, blockchainSynced: true, recoveredFromLedger: true },
            timestamp: new Date().toISOString()
          });
        }
        return res.status(503).json({
          success: false,
          error: { code: 'INSPECTION_CREATE_FAILED', message },
          timestamp: new Date().toISOString()
        });
      }
      blockchain_tx_id = chainResult.txId || null;
      logger.info(`✅ [INSPECTION] Inspection ${inspectionID} created on-chain (tx ${blockchain_tx_id})`);

      // O-1: RequestInspection moves the shipment to INSPECTION_PENDING
      // on-chain (quality.go:172); mirror it in Postgres so the portals
      // stop showing CREATED. Best-effort: the mirror never fails the
      // request. (The "already exists" recovery branch above returns
      // before this point, so it is deliberately not mirrored here —
      // that inspection predates this request and its shipment may
      // already have moved past INSPECTION_PENDING.)
      if (shipmentID) {
        await shipmentService.mirrorShipmentStatus(shipmentID, 'INSPECTION_PENDING');
      }

      // Postgres mirror AFTER the successful ledger write. coffeeType /
      // quantity are mirror-only fields — the chaincode QualityInspection
      // struct carries IDs, dates and status, not the coffee details.
      await postgresDb.run(
        `INSERT INTO quality_inspections (
          inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
          quantity, sample_size, requested_date, status, blockchain_tx_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [inspectionID, exporterID, contractID || null, shipmentID || null, coffeeType,
         quantity, sampleSize || null, scheduledDate, 'PENDING', blockchain_tx_id]
      );

      logger.info(`Quality inspection requested: ${inspectionID}`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'inspection_required',
        title: `Quality inspection requested for shipment ${shipmentID}`,
        message: `Quality inspection ${inspectionID} was requested for shipment ${shipmentID} (scheduled ${scheduledDate}). ECTA quality lab to inspect.`,
        entityType: 'inspection', entityId: inspectionID, severity: 'info',
        roles: ['ECTA'], exporterId: exporterID,
        actionUrl: '/portals/exporter?tab=quality',
        actionUrls: { ECTA: '/portals/ecta?tab=quality' },
      });

      res.json({
        success: true,
        data: { inspectionID, status: 'PENDING', blockchain_tx_id, blockchainSynced: true },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection creation error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/perform
 * @desc Perform inspection and record results (status: requested → inspected)
 * @access ECTA Quality Inspector
 */
router.post('/inspections/:inspectionID/perform',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const {
        inspectorID,
        inspectorName,
        sampleSize,
        moistureContent,
        defectCount,
        beanSize,
        color,
        odor,
        fragrance,
        flavor,
        aftertaste,
        acidity,
        body,
        balance,
        uniformity,
        cleanCup,
        sweetness,
        overall,
        classification,
        pesticideTest,
        heavyMetalTest,
        mycotoxinTest,
        remarks
      } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status, exporter_id, shipment_id FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'PENDING' && inspection.status !== 'REQUESTED' && inspection.status !== 'SAMPLE_COLLECTED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot perform inspection. Current status: ${inspection.status}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // F7 (leg2): moistureContent is REQUIRED — never default it.
      // The old code passed `moistureContent ?? 12` into
      // PerformInspection (and the raw value into the PG mirror, so
      // undefined became NULL in PG while the ledger said 12): a
      // missing-moisture probe returned 200 INSPECTED and consumed the
      // real perform. The chaincode already rejects an unparseable
      // moisture (PerformInspection, quality.go) and enforces 8–12%
      // (ValidateMoistureContent); the 400 here names the missing
      // field before anything is written, so the ledger and PG can
      // never disagree on moisture again.
      if (moistureContent === undefined || moistureContent === null || moistureContent === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'moistureContent is required: a quality inspection cannot be performed without a measured moisture content'
          },
          timestamp: new Date().toISOString()
        });
      }
      const moistureNum = Number(moistureContent);
      if (!Number.isFinite(moistureNum)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'moistureContent must be a number'
          },
          timestamp: new Date().toISOString()
        });
      }

      // The overall cupping score may arrive as `cuppingScore` (the
      // missing-steps suite and the lab-results route send cupScore /
      // cuppingScore, not `overall`). Resolve it once so the Postgres
      // grade below and the chaincode total score agree.
      const resolvedOverall = overall ?? (req.body as any).cuppingScore ?? 0;

      // Grade the SAME totalScore the chaincode grades (leg2 audit #3):
      // PerformInspection sums all ten cupping fields (each 0–100) into
      // totalScore and grades it in determineQualityGrade (quality.go).
      // The old code graded `overall` alone against 85/80/75, so an
      // inspection entered on the /10 scale (overall 8.5) was 'Below
      // Grade' in Postgres and Grade 1 on-chain. The rule below mirrors
      // determineQualityGrade exactly, including the moisture gate
      // (moisture > 12% is not exportable — see #19): the same
      // inspection can no longer be Below Grade in PG and Grade 1
      // on-chain. Chaincode grades 6–9 collapse to 'Below Grade' here.
      const cupFields = [fragrance, flavor, aftertaste, acidity, body, balance, uniformity, cleanCup, sweetness, resolvedOverall];
      const totalScore = cupFields.reduce((sum, v) => sum + (Number(v) || 0), 0);
      const defects = Number(defectCount) || 0;
      const moisture = moistureNum;
      let grade = 'Below Grade';
      if (Number.isFinite(moisture) && moisture > 12) {
        grade = 'Below Grade';
      } else if (defects <= 3 && totalScore >= 80) grade = 'Grade 1';
      else if (defects <= 12 && totalScore >= 80) grade = 'Grade 2';
      else if (defects <= 25 && totalScore >= 75) grade = 'Grade 3';
      else if (defects <= 45 && totalScore >= 70) grade = 'Grade 4';
      else if (defects <= 100 && totalScore >= 60) grade = 'Grade 5';

      // Build cup quality summary with all scores
      const cupQualityScores = {
        fragrance: fragrance || 0,
        flavor: flavor || 0,
        aftertaste: aftertaste || 0,
        acidity: acidity || 0,
        body: body || 0,
        balance: balance || 0,
        uniformity: uniformity || 0,
        cleanCup: cleanCup || 0,
        sweetness: sweetness || 0,
        overall: resolvedOverall
      };
      
      const cupQualityJson = JSON.stringify(cupQualityScores);
      
      // Build comprehensive remarks with all inspection data
      const comprehensiveRemarks = `
Inspection performed by ${inspectorName || 'ECTA Quality Lab'}.

PHYSICAL ATTRIBUTES:
- Bean Size: ${beanSize || 'N/A'}
- Color: ${color || 'N/A'}
- Odor: ${odor || 'N/A'}
- Classification: ${classification || 'N/A'}

QUALITY METRICS:
- Moisture Content: ${moistureContent}%
- Defect Count: ${defectCount}
- Sample Size: ${sampleSize}g

CUP QUALITY SCORES:
- Fragrance/Aroma: ${fragrance}/100
- Flavor: ${flavor}/100
- Aftertaste: ${aftertaste}/100
- Acidity: ${acidity}/100
- Body: ${body}/100
- Balance: ${balance}/100
- Uniformity: ${uniformity}/100
- Clean Cup: ${cleanCup}/100
- Sweetness: ${sweetness}/100
- Overall Score: ${overall}/100

LAB TESTS:
- Pesticide Test: ${pesticideTest || 'N/A'}
- Heavy Metal Test: ${heavyMetalTest || 'N/A'}
- Mycotoxin Test: ${mycotoxinTest || 'N/A'}

INSPECTOR REMARKS:
${remarks || 'No additional remarks'}
`.trim();

      // ✅ BLOCKCHAIN-FIRST: record results on the ledger via
      // PerformInspection (chaincodes/coffee/quality.go:184) —
      // (inspectionID, inspectorID, inspectorName, sampleSize,
      // moistureContent, defectCount, beanSize, color, odor,
      // fragrance, flavor, aftertaste, acidity, body, balance,
      // uniformity, cleanCup, sweetness, overall, classification,
      // pesticideTest, heavyMetalTest, mycotoxinTest, remarks).
      // It guards PENDING -> INSPECTED and grades on-chain. The old
      // code PUT the result into one peer's CouchDB under the wrong
      // database/key (fabricchannel_cecbschannel, `inspection:<id>`)
      // and swallowed failures, then wrote INSPECTED to Postgres
      // regardless — the phantom the approve step then inherited.
      // Moisture 8–12% is enforced by the chaincode itself
      // (ValidateMoistureContent, validation.go:300); an out-of-range
      // value fails here, honestly, with 503. A MISSING moisture is
      // refused with 400 above (F7) — it is never defaulted to 12.
      // Sparse callers (the missing-steps suite sends only
      // inspectorName / moisture / defect / remarks; the UI conduct
      // dialog sends moisture / defectPercentage / findings) get the
      // same defaults the old CouchDB/PG writes used, so a valid
      // chaincode call is still built: inspectorID 'AUTO', sampleSize
      // 100, beanSize 'Screen 17', lab tests 'PASS', cup scores 0.
      const performResult = await fabricService.performInspection(
        inspectionID,
        inspectorID || 'AUTO',
        inspectorName || 'ECTA Quality Lab',
        String(sampleSize ?? 100),
        String(moistureNum),
        String(defectCount ?? (req.body as any).defectPercentage ?? 0),
        beanSize || 'Screen 17',
        color || 'Green',
        odor || 'Fresh',
        String(fragrance ?? 0),
        String(flavor ?? 0),
        String(aftertaste ?? 0),
        String(acidity ?? 0),
        String(body ?? 0),
        String(balance ?? 0),
        String(uniformity ?? 0),
        String(cleanCup ?? 0),
        String(sweetness ?? 0),
        String(resolvedOverall),
        classification || grade,
        pesticideTest || 'PASS',
        heavyMetalTest || 'PASS',
        mycotoxinTest || 'PASS',
        comprehensiveRemarks
      );
      if (!performResult.success) {
        const message = performResult.error || 'PerformInspection failed';
        logger.error(`[INSPECTION] PerformInspection failed for ${inspectionID}: ${message}`);
        return res.status(503).json({
          success: false,
          error: { code: 'INSPECTION_PERFORM_FAILED', message },
          timestamp: new Date().toISOString()
        });
      }
      const blockchain_tx_id = performResult.txId || null;
      logger.info(`✅ [INSPECTION] Inspection ${inspectionID} performed on-chain (tx ${blockchain_tx_id})`);

      // Postgres mirror AFTER the successful ledger write
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'INSPECTED',
          inspection_date = NOW(),
          inspector_name = $2,
          sample_size = $3,
          moisture_content = $4,
          defect_count = $5,
          screen_size = $6,
          grade = $7,
          cup_quality = $8,
          remarks = $9,
          blockchain_tx_id = $10,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [
          inspectionID,
          inspectorName || 'ECTA Quality Lab',
          sampleSize || 100,
          // F7: the validated moisture — the old code passed the raw
          // body value, so a missing moisture became NULL here while
          // the ledger carried the 12% default.
          moistureNum,
          defectCount,
          parseInt(beanSize) || 17,
          grade,
          cupQualityJson,  // Store all cup scores as JSON
          comprehensiveRemarks,
          blockchain_tx_id
        ]
      );

      logger.info(`Quality inspection performed: ${inspectionID}, Overall: ${resolvedOverall}, Grade: ${grade}`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'inspection_completed',
        title: `Inspection ${inspectionID} completed`,
        message: `Quality inspection ${inspectionID} was performed (overall ${resolvedOverall}, grade ${grade}).`,
        entityType: 'inspection', entityId: inspectionID,
        severity: grade === 'Below Grade' ? 'warning' : 'success',
        roles: ['ECTA'], exporterId: (inspection as any).exporter_id || undefined,
        actionUrl: '/portals/exporter?tab=quality',
        actionUrls: { ECTA: '/portals/ecta?tab=quality' },
      });

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'INSPECTED',
          grade,
          overall: resolvedOverall,
          cupQuality: cupQualityScores,
          blockchain_tx_id,
          blockchainSynced: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection perform error:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        inspectionID: req.params.inspectionID
      });
      res.status(500).json({
        success: false,
        error: { 
          code: 'SERVER_ERROR', 
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/approve
 * @desc Approve inspection results (status: inspected → approved)
 * @access ECTA Quality Director
 */
router.post('/inspections/:inspectionID/approve',
  authMiddleware,
  // Previously auth-only despite the "@access ECTA Quality Director"
  // note on this route. Only ECTA may approve an inspection.
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { approvedBy, certificateNo } = req.body;

      // Shared approve core (TEST-STATUS-MATRIX §17 #14): guard +
      // LEDGER write first + Postgres mirror. The decision is already
      // on-chain by the time this returns ok — the old direct CouchDB
      // PUT here (one peer only, swallowed failures) is deleted, not
      // moved. Document signing below is this route's own extra.
      const decision = await decideQualityInspection(inspectionID, 'APPROVED', {
        certificateNumber: certificateNo,
        approvedBy,
      });
      if (!decision.ok) {
        return res.status(decision.status).json({
          success: false,
          error: decision.error,
          timestamp: new Date().toISOString()
        });
      }
      const { chainSync, certificateNumber } = decision;

      logger.info(`Quality inspection approved: ${inspectionID}, Certificate: ${certificateNumber}`);

      // ✅ SIGN INSPECTION DOCUMENTS - Add cryptographic signature with approver's identity
      const user = (req as any).user;
      try {
        const { persistDocumentLedgerProof, signDocumentFile } = await import('../services/documentSigningService');
        const FabricService = (await import('../services/fabricService')).default;
        const fabricService = FabricService.getInstance();
        
        // Get all inspection documents (quality reports, certificates, etc.)
        const inspectionDocuments = await postgresDb.all(
          `SELECT document_id, file_path, file_hash, mime_type, file_name 
           FROM documents 
           WHERE entity_type IN ('INSPECTION', 'QUALITY') 
             AND entity_id = $1 
             AND status = 'active'`,
          [inspectionID]
        );
        
        // Sign each document with ECTA Quality Director's cryptographic identity
        for (const doc of inspectionDocuments) {
          const signatureId = `SIG-${doc.document_id}-${user.org || 'ECTA'}-${Date.now()}`;
          const timestamp = new Date().toISOString();
          
          // Resolve physical file path for visual signature
          const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
          const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
          let visualSignatureAdded = false;
          let detachedSignatureCreated = false;
          let documentHash = doc.file_hash;

          if (resolvedPath) {
            try {
              // Get current signature count for positioning
              const sigCountResult = await postgresDb.get(
                'SELECT COUNT(*) as count FROM document_signatures WHERE document_id = $1',
                [doc.document_id]
              );
              const positionIndex = parseInt(sigCountResult?.count || '0');

              const proof = await signDocumentFile({
                filePath: resolvedPath,
                signerUsername: user.username || approvedBy || 'quality_director',
                signerEmail: user.email,
                organization: user.org || 'ECTAMSP',
                reason: `Quality inspection ${inspectionID} approved - Certificate: ${certificateNo}`,
                documentId: doc.document_id,
                documentType: doc.document_type || 'QUALITY_DOCUMENT',
                positionIndex,
                isPDF,
              });
              documentHash = proof.documentHash;
              visualSignatureAdded = proof.visualSignatureAdded;
              detachedSignatureCreated = proof.detachedSignatureCreated;
              await postgresDb.run(
                'UPDATE documents SET file_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $2',
                [documentHash, doc.document_id]
              );
            } catch (pdfError) {
              logger.warn(`Failed to add visual signature to PDF ${doc.document_id}:`, pdfError);
            }
          }
          
          // Store cryptographic signature in database
          await postgresDb.run(
            `INSERT INTO document_signatures (
              signature_id, document_id, signer_id, signer_org, signature_type,
              certificate_id, remarks, blockchain_tx_id, visual_signature_added
              , detached_signature_created, document_hash_signed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              signatureId,
              doc.document_id,
              user.username || approvedBy || 'quality_director',
              user.org || 'ECTAMSP',
              'APPROVE',
              user.sub || null, // X.509 certificate ID
              `Quality inspection ${inspectionID} approved - Certificate: ${certificateNo}`,
              null,
              visualSignatureAdded,
              detachedSignatureCreated,
              documentHash
            ]
          );
          
          // Sign document on blockchain
          try {
            if (fabricService.isConnected()) {
              if (!documentHash) throw new Error('Document content hash is unavailable');
              const blockchainSigResult = await fabricService.signDocument(
                doc.document_id,
                documentHash,
                'APPROVE',
                `Quality inspection ${inspectionID} approved`
              );
              
              if (blockchainSigResult.success && blockchainSigResult.txId) {
                await persistDocumentLedgerProof(
                  postgresDb,
                  signatureId,
                  doc.document_id,
                  documentHash,
                  detachedSignatureCreated,
                  blockchainSigResult.txId
                );
                logger.info(`✅ Blockchain signature recorded for document: ${doc.document_id}`);
              }
            }
          } catch (blockchainSigError) {
            logger.warn(`Blockchain document signature failed for ${doc.document_id}:`, blockchainSigError);
          }
          
          logger.info(`✅ Document signed by ${user.username} (${user.org}): ${doc.document_id}`);
        }
        
        if (inspectionDocuments.length > 0) {
          logger.info(`✅ Signed ${inspectionDocuments.length} inspection document(s) with approver's cryptographic identity`);
        }
      } catch (signError) {
        logger.error('Failed to sign inspection documents:', signError);
        // Don't fail the approval if document signing fails
      }

      // 🔥 WORKFLOW TRIGGER: Auto-create customs declaration after quality approval
      try {
        const inspectionWithShipment = await postgresDb.get(
          'SELECT shipment_id FROM quality_inspections WHERE inspection_id = $1',
          [inspectionID]
        );

        if (inspectionWithShipment?.shipment_id) {
          const customsResult = await shipmentService.triggerCustomsDeclaration(
            inspectionWithShipment.shipment_id,
            inspectionID,
            user?.username || approvedBy || 'quality_director'
          );

          if (customsResult.success) {
            logger.info(`✅ Customs declaration auto-triggered: ${customsResult.declarationID}`);
          }
        }
      } catch (customsError) {
        logger.error('Failed to auto-create customs declaration:', customsError);
        // Don't fail the approval if customs declaration fails
      }

      res.json({
        success: true,
        data: { 
          inspectionID, 
          status: 'APPROVED', 
          certificateNo: certificateNumber,
          blockchain_tx_id: chainSync.blockchain_tx_id,
          blockchainSynced: chainSync.blockchainSynced,
          blockchainWarning: chainSync.blockchainWarning,
          customsAutoTriggered: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection approval error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// PUT version of approve for compatibility with tests
router.put('/inspections/:inspectionID/approve',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { certificateNumber, grade, remarks, approvedBy } = req.body;
      const user = (req as any).user;

      // Shared approve core (TEST-STATUS-MATRIX §17 #14) — same guard,
      // ledger write first + Postgres mirror as the POST approve route.
      const decision = await decideQualityInspection(inspectionID, 'APPROVED', {
        certificateNumber,
        grade,
        remarks,
        approvedBy,
      });
      if (!decision.ok) {
        return res.status(decision.status).json({
          success: false,
          error: decision.error,
          timestamp: new Date().toISOString()
        });
      }
      const { chainSync, certificateNumber: effectiveCert, grade: effectiveGrade } = decision;

      logger.info(`Inspection ${inspectionID} approved via PUT by ${user.username}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'APPROVED',
          certificateNumber: effectiveCert,
          grade: effectiveGrade,
          blockchain_tx_id: chainSync.blockchain_tx_id,
          blockchainSynced: chainSync.blockchainSynced,
          blockchainWarning: chainSync.blockchainWarning
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection approval error (PUT):', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/reject
 * @desc Reject inspection results (status: inspected → rejected)
 * @access ECTA Quality Director
 */
router.post('/inspections/:inspectionID/reject',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { reason, rejectedBy } = req.body;

      // Shared reject core (TEST-STATUS-MATRIX §17 #14): guard +
      // ledger write first + PG mirror, same as the PUT reject route.
      // NOTE: `rejectedBy` is accepted from the caller but not
      // passed to the chaincode — RejectQualityInspection sets
      // RejectedBy from the client identity.
      // (The old handler called RejectInspection blockchain-first —
      // but that function belongs to the *other* inspection entity
      // (PreShipmentInspection, inspection.go) and takes 2 args, not
      // the 3 passed here, so the chain call could throw and the PG
      // rejection never happened.)
      const decision = await decideQualityInspection(inspectionID, 'REJECTED', {
        reason,
      });
      if (!decision.ok) {
        return res.status(decision.status).json({
          success: false,
          error: decision.error,
          timestamp: new Date().toISOString()
        });
      }
      const { chainSync } = decision;
      const blockchain_tx_id = chainSync.blockchain_tx_id;
      logger.info(`✅ Inspection rejection recorded: ${inspectionID}, TX: ${blockchain_tx_id}`);

      logger.info(`Quality inspection rejected: ${inspectionID}, Reason: ${reason}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'REJECTED', reason, blockchain_tx_id, blockchainSynced: chainSync.blockchainSynced, blockchainWarning: chainSync.blockchainWarning },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection rejection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/issue
 * @desc Issue quality certificate (wrapper endpoint)
 * @access ECTA Quality Director
 */
router.post('/issue',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { certificateID, shipmentID, inspectionID, qualityGrade, status } = req.body;

      logger.info(`[QUALITY] 📜 Issuing quality certificate: ${certificateID}`);

      const certId = certificateID || req.body.certificateId || `QC-${Date.now()}`;
      const inspectionId = inspectionID || req.body.inspectionId || '';
      const shipmentId = shipmentID || req.body.shipmentId || '';

      if (!certId || !inspectionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: certificateID, inspectionID',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check inspection exists and passed
      const inspection = await postgresDb.get(
        'SELECT id, status, shipment_id, exporter_id, passed, grade FROM quality_inspections WHERE inspection_id = $1',
        [inspectionId]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: Call IssueCertificate chaincode.
      // IssueCertificate (inspection.go:342) takes exactly
      // (inspectionID, certificateNumber, certificateURL) — the old call
      // passed 5 args (cert, inspection, shipment, grade, date), which the
      // contract API rejects as a wrong-arity call.
      // NOTE: it reads a PRE-SHIPMENT inspection (preShipmentInspectionKey),
      // so a quality-entity inspectionId that was never a pre-shipment
      // inspection 404s on-chain. Kept as a direct call (rather than
      // routing through POST /inspection/:id/certificate, inspection.ts,
      // which passes the same 3 args) so the quality_inspections PG mirror
      // below (certification_number / CERTIFICATE_ISSUED) stays in this
      // handler. invokeChaincode returns {success:false} instead of
      // throwing when Fabric is unreachable, so a chain miss does not
      // block the PG certificate record.
      const certificateURL = (req.body as any).certificateURL || '';
      const blockchainResult = await fabricService.invokeChaincode(
        'IssueCertificate',
        [
          inspectionId,
          certId,
          certificateURL
        ]
      );
      
      const blockchain_tx_id = blockchainResult?.txId || null;
      logger.info(`✅ Quality certificate recorded on blockchain: ${certId}, TX: ${blockchain_tx_id}`);

      // Update inspection with certificate number
      await postgresDb.run(
        `UPDATE quality_inspections SET
          certification_number = $1,
          status = 'CERTIFICATE_ISSUED',
          blockchain_tx_id = $2,
          updated_at = NOW()
        WHERE inspection_id = $3`,
        [certId, blockchain_tx_id, inspectionId]
      );

      logger.info(`Quality certificate issued: ${certId} for inspection ${inspectionId}`);

      res.status(201).json({
        success: true,
        message: 'Quality certificate issued successfully',
        data: { 
          certificateID: certId, 
          certificateId: certId,
          inspectionID: inspectionId,
          status: 'issued',
          blockchain_tx_id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[QUALITY] Quality certificate issuance error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/issue-permit
 * @desc Issue export permit after inspection approval (status: approved → permit_issued)
 * @access ECTA Export Permit Office
 */
router.post('/inspections/:inspectionID/issue-permit',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { exportPermitNo, issuedBy, autoCreateCustomsDeclaration } = req.body;

      // Check inspection exists and is approved
      const inspection = await postgresDb.get(
        'SELECT id, status, shipment_id, exporter_id, contract_id, passed, certification_number FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'APPROVED' && inspection.passed !== true) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot issue export permit. Inspection must be approved first. Current status: ${inspection.status}`
          },
          timestamp: new Date().toISOString()
        });
      }

      if (!inspection.certification_number) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CERTIFICATE',
            message: 'Cannot issue export permit without quality certificate'
          },
          timestamp: new Date().toISOString()
        });
      }

      // The permit names a shipment (inspection.shipment_id): it must
      // exist in Postgres AND on the ledger before anything is issued.
      // Before this fix the route resolved the contract from the
      // inspection, issued the permit on-chain, returned 200, and the
      // shipment mirror silently no-opped — a permit for a shipment
      // that does not exist anywhere (proven live: INSP-BUG1-FAKE →
      // SHIP-FAKE-BUG1C issued PERMIT-1794509648620 with 200).
      if (!inspection.shipment_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot issue export permit: the inspection has no shipment'
          },
          timestamp: new Date().toISOString()
        });
      }
      const shipmentCheck = await shipmentService.assertShipmentExists(inspection.shipment_id);
      if (!shipmentCheck.ok) {
        if (shipmentCheck.unavailable) {
          return res.status(503).json({
            success: false,
            error: { code: 'SHIPMENT_VERIFY_UNAVAILABLE', message: shipmentCheck.message },
            timestamp: new Date().toISOString()
          });
        }
        return res.status(404).json({
          success: false,
          error: { code: 'SHIPMENT_NOT_FOUND', message: shipmentCheck.message },
          timestamp: new Date().toISOString()
        });
      }
      const shipmentStatusBefore: string = String(shipmentCheck.pg?.status || '');

      // Resolve the IssueCBEExportPermit inputs from Postgres (request-body
      // values override). IssueCBEExportPermit (permit.go:48) requires an
      // ACTIVE exporter licence, an APPROVED contract (when a contract id
      // is given) and an ISSUED/APPROVED LC (when the payment method is LC
      // and an LC id is given). No invented defaults: an amount that cannot
      // be resolved from the contract or the body is a 400, not a
      // fabricated permit.
      let contractId: string =
        (inspection as any).contract_id || req.body.contractId || req.body.contractID || '';
      let exporterId: string =
        inspection.exporter_id || req.body.exporterId || req.body.exporterID || '';
      let amount: number | null = req.body.amount != null ? Number(req.body.amount) : null;
      let currency: string = req.body.currency || '';
      let destination: string = req.body.destination || '';
      const paymentMethod: string = req.body.paymentMethod || 'LC';
      let lcId: string = req.body.lcId || req.body.lcID || '';

      if (inspection.shipment_id) {
        const shipment = await postgresDb.get(
          'SELECT contract_id, exporter_id, destination FROM shipments WHERE shipment_id = $1',
          [inspection.shipment_id]
        );
        if (shipment) {
          if (!contractId) contractId = shipment.contract_id || '';
          if (!exporterId) exporterId = shipment.exporter_id || '';
          if (!destination) destination = shipment.destination || '';
        }
      }
      if (contractId) {
        const contract = await postgresDb.get(
          'SELECT exporter_id, total_value, currency, buyer_country FROM contracts WHERE contract_id = $1',
          [contractId]
        );
        if (contract) {
          if (!exporterId) exporterId = contract.exporter_id || '';
          if (amount == null && contract.total_value != null) amount = Number(contract.total_value);
          if (!currency) currency = contract.currency || 'USD';
          if (!destination) destination = contract.buyer_country || '';
        }
      }
      if (!currency) currency = 'USD';
      if (paymentMethod === 'LC' && !lcId && inspection.shipment_id) {
        const lc = await postgresDb.get(
          `SELECT lc_number FROM letters_of_credit
            WHERE shipment_id = $1 AND status IN ('ISSUED', 'APPROVED')
            ORDER BY created_at DESC LIMIT 1`,
          [inspection.shipment_id]
        );
        if (lc) lcId = lc.lc_number || '';
      }
      if (!contractId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot issue export permit: no contract could be resolved from the inspection, shipment or request body (IssueCBEExportPermit requires a contractID)'
          },
          timestamp: new Date().toISOString()
        });
      }
      if (amount == null || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot issue export permit: no positive permit amount could be resolved from the contract or request body'
          },
          timestamp: new Date().toISOString()
        });
      }

      const permitId = `PERMIT-${Date.now()}`;
      const permitNumber = exportPermitNo || `PERMIT${Date.now()}`;
      const description = `Export Permit for shipment ${inspection.shipment_id}`;
      const commercialInvoice = inspection.certification_number || `CI-${permitId}`;
      const bankBranch = req.body.bankBranch || 'CBE Main Branch';
      const approvedBy = issuedBy || 'Bank Officer';

      // ✅ LEDGER FIRST: IssueCBEExportPermit exists in chaincode
      // (permit.go:48) — the old "function doesn't exist" comment was
      // stale — and it is BanksMSP-only on-chain (permit.go:64-66), so
      // pin BanksMSP per invoke (cb12f0b4 precedent, as in permits.ts).
      // A chain failure fails honestly with 503 and writes nothing to
      // Postgres. The customs declaration IS auto-created after success
      // below (maybeTriggerCustomsDeclarationAfterPermit): the inspection
      // is already APPROVED here, so permit issuance is the first moment
      // both preconditions hold — the quality-approval trigger fires too
      // early in this literal order and is never retried.
      // autoCreateCustomsDeclaration is accepted but the trigger does not
      // depend on it.
      await fabricService.connectAsOrg('BanksMSP');
      const chainResult = await fabricService.invokeChaincode(
        'IssueCBEExportPermit',
        [
          permitId,
          permitNumber,
          contractId,
          exporterId,
          lcId,
          paymentMethod,
          amount.toString(),
          currency,
          description,
          destination,
          commercialInvoice,
          bankBranch,
          approvedBy
        ],
        'BanksMSP'
      );
      if (!chainResult.success) {
        logger.error(`[PERMIT] IssueCBEExportPermit failed for inspection ${inspectionID}: ${chainResult.error}`);
        return res.status(503).json({
          success: false,
          error: {
            code: 'PERMIT_ISSUE_FAILED',
            message: chainResult.error || 'Failed to issue export permit on the ledger'
          },
          timestamp: new Date().toISOString()
        });
      }
      const blockchain_tx_id = chainResult.txId || null;

      // Postgres mirror, only after the ledger write committed.
      // #6: this UPDATE used to be unguarded, and the export_permit_no
      // column did not exist (added by migration 077) — so a successful
      // ledger issuance still returned HTTP 500 and left PG stale. The
      // mirror must never turn a committed issuance into a bare 500:
      // on failure, keep going (shipment mirror + customs trigger below
      // are independent) and report the ledger result AND the mirror
      // error separately in the response.
      let inspectionMirrorError: string | null = null;
      try {
        // F10: record the SUBMITTING ECTA officer (the authenticated
        // user), not just the body-supplied office name — the ledger
        // signer is BanksMSP, the submitter is this officer.
        const submittingOfficer = (req as any).user?.username || issuedBy || 'ECTA Export Permit Office';
        await postgresDb.run(
          `UPDATE quality_inspections SET
            status = 'PERMIT_ISSUED',
            remarks = COALESCE(remarks, '') || '\n\nEXPORT PERMIT ISSUED: ' || $2 || ' by ' || $3,
            blockchain_tx_id = $4,
            export_permit_no = $5,
            updated_at = NOW()
          WHERE inspection_id = $1`,
          [inspectionID, permitNumber, submittingOfficer, blockchain_tx_id, permitNumber]
        );
      } catch (mirrorErr: any) {
        inspectionMirrorError = mirrorErr?.message || String(mirrorErr);
        logger.error(`[PERMIT] Inspection PG mirror failed for ${inspectionID} (ledger permit ${permitId} already issued, tx ${blockchain_tx_id}):`, mirrorErr);
      }

      // Best-effort: mirror into export_permits (the table the portals
      // read) — same INSERT as permits.ts mirrorPermitPG. A mirror
      // failure must never fail a committed issuance.
      try {
        await postgresDb.run(
          `INSERT INTO export_permits (permit_id, contract_id, status, approved_by)
           VALUES ($1, $2, 'ISSUED', $3)
           ON CONFLICT (permit_id) DO NOTHING`,
          [permitId, contractId || null, approvedBy]
        );
      } catch (mirrorErr) {
        logger.warn(`[PERMIT] Could not mirror permit ${permitId} to Postgres:`, mirrorErr);
      }

      // O-1: mirror the IssueCBEExportPermit cascade (permit.go:248):
      // every shipment under this contract in CREATED or
      // INSPECTION_COMPLETE moves to PERMIT_ISSUED on-chain. The
      // eligibility guard matches the chaincode exactly, so a shipment
      // that already moved on is never regressed. Best-effort: the
      // mirror never fails the issuance.
      if (contractId) {
        await shipmentService.mirrorShipmentStatusForContract(contractId, 'PERMIT_ISSUED', ['CREATED', 'INSPECTION_COMPLETE']);
      } else if (inspection.shipment_id) {
        await shipmentService.mirrorShipmentStatus(inspection.shipment_id, 'PERMIT_ISSUED', ['CREATED', 'INSPECTION_COMPLETE']);
      }

      // The shipment mirror must report honestly: re-read the named
      // shipment and confirm it actually moved (or was already past
      // the permit stage). Before this fix the mirror silently no-opped
      // on a missing shipment and the response still claimed success.
      // The pre-check above makes "missing" impossible here, but an
      // eligible shipment that still did not move is a real mirror
      // failure and must be reported, not hidden behind the 200.
      const shipmentMirror: { shipmentId: string; statusBefore: string; statusAfter?: string; moved: boolean; note?: string; error?: string } = {
        shipmentId: inspection.shipment_id, statusBefore: shipmentStatusBefore, moved: false,
      };
      try {
        const shipmentAfter = await postgresDb.get(
          'SELECT status FROM shipments WHERE shipment_id = $1',
          [inspection.shipment_id]
        );
        if (!shipmentAfter) {
          shipmentMirror.error = 'shipment row not found in Postgres after issuance';
          logger.error(`[PERMIT] Shipment ${inspection.shipment_id} missing from Postgres after permit ${permitId} issued (tx ${blockchain_tx_id})`);
        } else {
          shipmentMirror.statusAfter = shipmentAfter.status;
          if (shipmentAfter.status === 'PERMIT_ISSUED' && shipmentStatusBefore !== 'PERMIT_ISSUED') {
            shipmentMirror.moved = true;
          } else if (shipmentAfter.status === 'PERMIT_ISSUED') {
            shipmentMirror.note = 'shipment already PERMIT_ISSUED; mirror correctly left it';
          } else if (['CREATED', 'INSPECTION_COMPLETE'].includes(shipmentStatusBefore)) {
            shipmentMirror.error = `shipment still ${shipmentAfter.status} after mirror`;
            logger.error(`[PERMIT] Shipment ${inspection.shipment_id} still ${shipmentAfter.status} after permit ${permitId} issued (tx ${blockchain_tx_id}) — PG mirror did not move it`);
          } else {
            shipmentMirror.note = `shipment already ${shipmentStatusBefore}; mirror correctly left it`;
          }
        }
      } catch (reReadErr: any) {
        shipmentMirror.error = reReadErr?.message || String(reReadErr);
      }

      // Auto-create the customs declaration now that the permit exists:
      // the inspection is already APPROVED here, so this is the first
      // moment both preconditions hold (literal order inspect → permit
      // → customs). Best-effort, never duplicates.
      await shipmentService.maybeTriggerCustomsDeclarationAfterPermit(
        inspection.shipment_id,
        issuedBy || 'ECTA Export Permit Office'
      );

      logger.info(`Export permit issued: ${permitNumber} for inspection ${inspectionID}, shipment ${inspection.shipment_id}, TX: ${blockchain_tx_id}`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'permit_issued',
        title: `Export permit ${permitId} issued`,
        message: `Export permit ${permitId} (${permitNumber}) was issued for shipment ${inspection.shipment_id}.`,
        entityType: 'permit', entityId: permitId, severity: 'success',
        roles: ['CUSTOMS', 'BANKS'], exporterId: exporterId || undefined,
        actionUrl: '/portals/exporter?tab=permits',
        actionUrls: { CUSTOMS: '/portals/customs?tab=permits', BANKS: '/portals/banks?tab=contracts' },
      });

      res.json({
        success: true,
        data: {
          inspectionID,
          shipmentID: inspection.shipment_id,
          exportPermitNo: permitNumber,
          permitNumber,
          permitId,
          certificateNo: inspection.certification_number,
          status: 'PERMIT_ISSUED',
          blockchain_tx_id,
          // F10 (leg2) — signer vs submitter, stated plainly:
          // IssueCBEExportPermit is BanksMSP-only on-chain
          // (permit.go:64-66), so the ledger signer is always the
          // bank however the request arrived. This ECTA path submits
          // the request as the authenticated ECTA officer below; the
          // permit IS a CBE (bank) export permit by design, not an
          // ECTA-issued one. The portal says the same on the button.
          issuedBy: {
            signerMsp: 'BanksMSP',
            signer: 'Commercial Bank of Ethiopia (CBE)',
            submittedBy: (req as any).user?.username || issuedBy || 'ECTA Export Permit Office',
            submittedByOrg: 'ECTA',
            note: 'Bank-issued CBE export permit: signed on the ledger by BanksMSP, submitted by the ECTA officer above.',
          },
          // #6: the ledger issuance is the truth; a failed PG mirror is
          // reported here, never hidden behind a 500. The shipment
          // mirror is reported the same way: moved / already-past /
          // or an error when an eligible shipment did not move.
          postgresMirror: {
            ...(inspectionMirrorError
              ? { inspection: false, error: inspectionMirrorError }
              : { inspection: true }),
            shipment: shipmentMirror,
          },
        },
        txId: blockchain_tx_id,
        message: inspectionMirrorError
          ? 'Export permit issued on the ledger, but the Postgres inspection mirror failed — the ledger state is authoritative, re-check the inspection row before retrying.'
          : 'Export permit issued successfully. Shipment ready for customs clearance.',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Export permit issuance error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/complete
 * @desc Complete quality inspection with results (legacy - single step)
 * @access ECTA
 */
router.post('/inspections/:inspectionID/complete',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
    body('grade').notEmpty().withMessage('Grade is required'),
    body('passed').isBoolean().withMessage('Passed must be boolean'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { grade, cupQuality, moistureContent, defectCount, screenSize, passed, certificationNumber, inspectorName, remarks } = req.body;

      const inspection = await postgresDb.get(
        'SELECT id FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST: Use audit service for legacy complete endpoint
      const auditService = require('../services/auditService').default;
      await auditService.log({
        entityType: 'QUALITY_INSPECTION',
        entityId: inspectionID,
        action: 'COMPLETE',
        performedBy: inspectorName || 'ECTA Inspector',
        organization: 'ECTAMSP',
        performedByOrg: 'ECTAMSP',
        oldValue: 'PENDING',
        newValue: 'COMPLETED',
        reason: `Legacy inspection completion - Grade: ${grade}, Passed: ${passed}`,
        metadata: { grade, cupQuality, moistureContent, defectCount, screenSize, passed, certificationNumber },
        ipAddress: (req as any).ip
      });
      logger.info(`✅ Legacy inspection completion recorded on blockchain: ${inspectionID}`);

      // Now update inspection
      await postgresDb.run(
        `UPDATE quality_inspections SET
          inspection_date = $1, grade = $2, cup_quality = $3, moisture_content = $4,
          defect_count = $5, screen_size = $6, passed = $7, certification_number = $8,
          inspector_name = $9, remarks = $10, status = $11, updated_at = NOW()
        WHERE inspection_id = $12`,
        [new Date().toISOString().split('T')[0], grade, cupQuality || null, moistureContent || null,
         defectCount || null, screenSize || null, passed, certificationNumber || null,
         inspectorName || null, remarks || null, 'INSPECTED', inspectionID]
      );

      logger.info(`Quality inspection completed: ${inspectionID}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'INSPECTED', passed },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection completion error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/v1/quality/inspections
 * @desc List quality inspections
 * @access Authenticated
 */
router.get('/inspections',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status, exporterID, shipmentID } = req.query;
      let query = 'SELECT * FROM quality_inspections WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (exporterID) {
        query += ` AND exporter_id = $${paramIndex++}`;
        params.push(exporterID);
      }
      if (shipmentID) {
        query += ` AND shipment_id = $${paramIndex++}`;
        params.push(shipmentID);
      }

      query += ' ORDER BY created_at DESC';

      const inspections = await postgresDb.all(query, params);

      // Normalize field names for UI compatibility
      const normalizedInspections = inspections.map((insp: any) => {
        // Parse cup quality JSON if it exists
        let cupQualityScores: any = {};
        if (insp.cup_quality) {
          try {
            cupQualityScores = JSON.parse(insp.cup_quality);
          } catch (e) {
            // If not JSON, treat as plain text
            cupQualityScores = { description: insp.cup_quality };
          }
        }
        
        // Extract overall score from cup_quality JSON, remarks, or calculate from grade
        let overallScore: number | null = null;
        
        // Priority 1: From cup_quality JSON
        if (cupQualityScores.overall) {
          overallScore = cupQualityScores.overall;
        }
        // Priority 2: From remarks text
        else if (insp.remarks) {
          const match = insp.remarks.match(/Overall Score:\s*(\d+)/i);
          if (match) {
            overallScore = parseInt(match[1]);
          }
        }
        // Priority 3: Calculate from grade
        if (!overallScore && insp.grade) {
          const gradeMap: any = { 
            'G1': 90, 'Grade 1': 90, 'GRADE 1': 90,
            'G2': 85, 'Grade 2': 85, 'GRADE 2': 85,
            'G3': 80, 'Grade 3': 80, 'GRADE 3': 80
          };
          overallScore = gradeMap[insp.grade] || null;
        }
        
        return {
          inspectionID: insp.inspection_id,
          InspectionID: insp.inspection_id,
          shipmentID: insp.shipment_id,
          ShipmentID: insp.shipment_id,
          contractID: insp.contract_id,
          exporterID: insp.exporter_id,
          coffeeType: insp.coffee_type,
          quantity: insp.quantity,
          sampleSize: insp.sample_size,
          status: insp.status,
          Status: insp.status,
          requestedDate: insp.requested_date,
          scheduledDate: insp.scheduled_date,
          inspectionDate: insp.inspection_date,
          approvalDate: insp.approval_date,
          inspectorID: insp.inspector_id,
          inspectorName: insp.inspector_name,
          certificateNo: insp.certification_number,
          certificationNumber: insp.certification_number,
          exportPermitNo: insp.export_permit_no,
          grade: insp.grade,
          passed: insp.passed,
          cupQuality: insp.cup_quality,  // Raw JSON string or text
          cupQualityScores: cupQualityScores,  // Parsed JSON object
          moistureContent: insp.moisture_content,
          defectCount: insp.defect_count,
          screenSize: insp.screen_size,
          beanSize: insp.bean_size,
          color: insp.color,
          odor: insp.odor,
          classification: insp.classification,
          pesticideTest: insp.pesticide_test,
          heavyMetalTest: insp.heavy_metal_test,
          mycotoxinTest: insp.mycotoxin_test,
          remarks: insp.remarks,
          approvedBy: insp.approved_by,
          overall: overallScore,
          overallScore: overallScore,
          createdAt: insp.created_at,
          updatedAt: insp.updated_at,
          blockchainTxId: insp.blockchain_tx_id,
        };
      });

      res.json({
        success: true,
        data: { inspections: normalizedInspections },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('List inspections error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /quality/inspections/by-shipment/:shipmentId
 * Get all quality inspections for a specific shipment
 * @access Authenticated
 */
router.get('/inspections/by-shipment/:shipmentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      
      logger.info(`[QUALITY] Fetching inspections for shipment: ${shipmentId}`);
      
      const inspections = await postgresDb.all(
        'SELECT * FROM quality_inspections WHERE shipment_id = $1 ORDER BY inspection_date DESC',
        [shipmentId]
      );
      
      // Normalize field names for all inspections
      const normalized = inspections.map((inspection: any) => ({
        inspectionID: inspection.inspection_id,
        shipmentID: inspection.shipment_id,
        contractID: inspection.contract_id,
        exporterID: inspection.exporter_id,
        coffeeType: inspection.coffee_type,
        quantity: inspection.quantity,
        sampleSize: inspection.sample_size,
        scheduledDate: inspection.scheduled_date,
        inspectionDate: inspection.inspection_date,
        inspectorID: inspection.inspector_id,
        inspectorName: inspection.inspector_name,
        grade: inspection.grade,
        passed: inspection.passed,
        cupQuality: inspection.cup_quality,
        moistureContent: inspection.moisture_content,
        defectCount: inspection.defect_count,
        screenSize: inspection.screen_size,
        beanSize: inspection.bean_size,
        color: inspection.color,
        odor: inspection.odor,
        overall: inspection.overall_score || inspection.overall,
        classification: inspection.classification,
        pesticideTest: inspection.pesticide_test,
        heavyMetalTest: inspection.heavy_metal_test,
        mycotoxinTest: inspection.mycotoxin_test,
        remarks: inspection.remarks,
        status: inspection.status,
        certificationNumber: inspection.certification_number,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
      }));
      
      logger.info(`[QUALITY] ✅ Found ${normalized.length} inspections for shipment: ${shipmentId}`);
      
      res.json({
        success: true,
        data: normalized,
        count: normalized.length,
        shipmentId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error(`[QUALITY] Error fetching inspections for shipment:`, error);
      res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /quality/inspections/:inspectionID
 * Get a specific quality inspection by ID
 * @access Authenticated
 */
router.get('/inspections/:inspectionID',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      
      logger.info(`[QUALITY] Fetching inspection: ${inspectionID}`);
      
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );
      
      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Inspection ${inspectionID} not found` },
          timestamp: new Date().toISOString()
        });
      }
      
      // Normalize field names
      const normalized = {
        inspectionID: inspection.inspection_id,
        shipmentID: inspection.shipment_id,
        contractID: inspection.contract_id,
        exporterID: inspection.exporter_id,
        coffeeType: inspection.coffee_type,
        quantity: inspection.quantity,
        sampleSize: inspection.sample_size,
        scheduledDate: inspection.scheduled_date,
        inspectionDate: inspection.inspection_date,
        inspectorID: inspection.inspector_id,
        inspectorName: inspection.inspector_name,
        grade: inspection.grade,
        passed: inspection.passed,
        cupQuality: inspection.cup_quality,
        moistureContent: inspection.moisture_content,
        defectCount: inspection.defect_count,
        screenSize: inspection.screen_size,
        beanSize: inspection.bean_size,
        color: inspection.color,
        odor: inspection.odor,
        overall: inspection.overall_score || inspection.overall,
        classification: inspection.classification,
        pesticideTest: inspection.pesticide_test,
        heavyMetalTest: inspection.heavy_metal_test,
        mycotoxinTest: inspection.mycotoxin_test,
        remarks: inspection.remarks,
        status: inspection.status,
        certificationNumber: inspection.certification_number,
        certificateNo: inspection.certificate_no,
        exportPermitNo: inspection.export_permit_no,
        approvedBy: inspection.approved_by,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
        blockchainTxId: inspection.blockchain_tx_id
      };
      
      res.json({
        success: true,
        data: normalized,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      logger.error('[QUALITY] Error fetching inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/collect-sample
 * @desc Record sample collection (pending → sample_collected)
 * @access Quality Officer
 */
router.post('/inspections/:inspectionID/collect-sample',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
    body('sampleWeight').isNumeric().withMessage('Sample weight must be numeric'),
    body('collectionDate').notEmpty().withMessage('Collection date is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { sampleWeight, collectionDate, collectorName, sealNumber } = req.body;

      // Check if inspection exists
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // NOTE: deliberately Postgres-only — there is no chaincode
      // function or QualityInspection status for sample collection
      // (quality.go statuses: PENDING, INSPECTED, APPROVED, REJECTED,
      // REWORK). The ledger transition happens at lab-results /
      // perform (PerformInspection, PENDING -> INSPECTED).
      await postgresDb.run(
        `UPDATE quality_inspections SET
          sample_size = $1,
          inspector_name = $2,
          status = 'SAMPLE_COLLECTED',
          updated_at = NOW()
         WHERE inspection_id = $3`,
        [sampleWeight, collectorName || 'Quality Officer', inspectionID]
      );

      logger.info(`Sample collected for inspection ${inspectionID}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'SAMPLE_COLLECTED',
          sampleWeight,
          collectionDate,
          collectorName,
          sealNumber
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Sample collection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/lab-results
 * @desc Record laboratory test results (sample_collected → inspected)
 * @access Quality Lab Technician
 */
router.post('/inspections/:inspectionID/lab-results',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
    body('moistureContent').isNumeric().withMessage('Moisture content must be numeric'),
    body('defectCount').isNumeric().withMessage('Defect count must be numeric'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const {
        moistureContent,
        defectCount,
        cupScore,
        screenSize,
        labTechnician,
        testDate
      } = req.body;

      // Check if inspection exists
      const inspection = await postgresDb.get(
        'SELECT * FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      // ✅ BLOCKCHAIN-FIRST (unless already INSPECTED on-chain): lab
      // results ARE the inspection results, and PerformInspection
      // (quality.go:184) is the only chaincode function that moves a
      // QualityInspection PENDING -> INSPECTED. The old handler wrote
      // INSPECTED to Postgres only, so the ledger stayed PENDING and
      // the next step — ApproveQualityInspection, which requires
      // INSPECTED on-chain — could never succeed; approve then failed
      // on-chain while the API reported 200 APPROVED. If Postgres
      // already says INSPECTED, the results were already recorded
      // on-chain (via perform or an earlier lab-results call), so the
      // ledger write is skipped and only the Postgres mirror is
      // refreshed. Moisture 8–12% is enforced by the chaincode
      // itself; this route does not pre-block any moisture value.
      let labTxId: string | null = null;
      if (inspection.status !== 'INSPECTED') {
        const labResult = await fabricService.performInspection(
          inspectionID,
          'LAB',
          labTechnician || 'Lab Technician',
          '100',
          String(moistureContent),
          String(defectCount),
          String(screenSize || 'Screen 17'),
          'Green',
          'Fresh',
          '0', '0', '0', '0', '0', '0', '0', '0', '0',
          String(cupScore ?? 0),
          (req.body as any).grade || 'Grade 1',
          'PASS',
          'PASS',
          'PASS',
          `Lab results recorded by ${labTechnician || 'Lab Technician'}${testDate ? ` on ${testDate}` : ''}`
        );
        if (!labResult.success) {
          const message = labResult.error || 'PerformInspection failed';
          logger.error(`[INSPECTION] Lab-results PerformInspection failed for ${inspectionID}: ${message}`);
          return res.status(503).json({
            success: false,
            error: { code: 'LAB_RESULTS_FAILED', message },
            timestamp: new Date().toISOString()
          });
        }
        labTxId = labResult.txId || null;
        logger.info(`✅ [INSPECTION] Lab results recorded on-chain for ${inspectionID} (tx ${labTxId})`);
      }

      // Postgres mirror AFTER the successful ledger write
      await postgresDb.run(
        `UPDATE quality_inspections SET
          moisture_content = $1,
          defect_count = $2,
          cup_quality = $3,
          screen_size = $4,
          inspector_name = $5,
          inspection_date = $6,
          status = 'INSPECTED',
          blockchain_tx_id = COALESCE($8, blockchain_tx_id),
          updated_at = NOW()
         WHERE inspection_id = $7`,
        [
          moistureContent,
          defectCount,
          cupScore || null,
          screenSize || null,
          labTechnician || 'Lab Technician',
          testDate || new Date().toISOString().split('T')[0],
          inspectionID,
          labTxId
        ]
      );

      logger.info(`Lab results recorded for inspection ${inspectionID}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'INSPECTED',
          moistureContent,
          defectCount,
          cupScore,
          screenSize,
          testDate,
          blockchain_tx_id: labTxId,
          blockchainSynced: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Lab results recording error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route PUT /api/v1/quality/inspections/:inspectionID/reject
 * @desc Reject inspection due to quality issues
 * @access Quality Director
 */
router.put('/inspections/:inspectionID/reject',
  authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'),
  [
    param('inspectionID').notEmpty(),
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { rejectionReason } = req.body;
      const user = (req as any).user;

      // Shared reject core (TEST-STATUS-MATRIX §17 #14) — same guard,
      // ledger write first + Postgres mirror as the POST reject route.
      // (The old handler rejected from any state and wrote notes only;
      // the core also sets passed=false and remarks.)
      const decision = await decideQualityInspection(inspectionID, 'REJECTED', {
        reason: rejectionReason,
      });
      if (!decision.ok) {
        return res.status(decision.status).json({
          success: false,
          error: decision.error,
          timestamp: new Date().toISOString()
        });
      }
      const { chainSync } = decision;

      logger.info(`Inspection ${inspectionID} rejected by ${user.username}: ${rejectionReason}`);

      res.json({
        success: true,
        data: {
          inspectionID,
          status: 'REJECTED',
          rejectionReason,
          blockchain_tx_id: chainSync.blockchain_tx_id,
          blockchainSynced: chainSync.blockchainSynced,
          blockchainWarning: chainSync.blockchainWarning
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Inspection rejection error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
