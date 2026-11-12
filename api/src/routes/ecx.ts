// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Routes — Warehouse Intake, Grading, Lot Assignment & Release

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();
const dbService = DatabaseService.getInstance();
// Mirror an ECX lot status change into Postgres. The grade/assign/release
// routes only wrote the chain, so the ecx_lots mirror row (created at
// intake) kept its intake status forever and the portal dashboards that
// read ecx_lots showed stale counts. Best-effort: a mirror failure must
// never fail a committed chaincode transaction. `extra` mirrors the
// fields the route just set on-chain (grade, contract) so the GET /lots
// PostgreSQL fallback returns rows the portal can render as-is; only
// allowlisted mirror columns may be set.
async function mirrorLotStatusPG(lotId: string, status: string, extra: Record<string, unknown> = {}): Promise<void> {
  try {
    const allowedColumns = new Set(['grade', 'quality_score', 'contract_id', 'rejection_reason']);
    const sets: string[] = ['status = $1'];
    const params: unknown[] = [status];
    let idx = 2;
    for (const [col, val] of Object.entries(extra)) {
      if (!allowedColumns.has(col)) continue;
      sets.push(`${col} = $${idx++}`);
      params.push(val);
    }
    sets.push('updated_at = NOW()');
    params.push(lotId);
    await dbService.run(
      `UPDATE ecx_lots SET ${sets.join(', ')} WHERE lot_id = $${idx}`,
      params
    );
  } catch (err: any) {
    logger.warn(`[ECX] Could not mirror lot ${lotId} status ${status} to Postgres:`, err.message);
  }
}


// GET /api/v1/ecx — ECX status/info (root endpoint)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json({ 
      success: true, 
      data: { 
        service: 'ECX', 
        status: 'operational',
        endpoints: ['/lots', '/warehouse', '/market']
      }, 
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
  }
});

// GET /api/v1/ecx/warehouse — alias for /lots
router.get('/warehouse', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await fabricService.queryChaincode('QueryAllECXLots', []);
    if (result.success) {
      const data = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } else {
      logger.warn('QueryAllECXLots not available yet:', result.error);
      res.json({ success: true, data: [], message: 'ECX chaincode functions pending deployment', timestamp: new Date().toISOString() });
    }
  } catch (err: any) {
    logger.warn('ECX warehouse query failed:', err.message);
    res.json({ success: true, data: [], message: err.message, timestamp: new Date().toISOString() });
  }
});

// GET /api/v1/ecx/market — market prices
router.get('/market', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Leg2 #20: these are STATIC reference prices, not a live market
    // feed — there is no live ECX feed wired in. They used to be
    // served as market data with a fresh timestamp, which presented a
    // hardcoded table as the market. Label them clearly instead.
    res.json({
      success: true,
      data: {
        source: 'STATIC_REFERENCE',
        note: 'Static reference prices for Ethiopian coffee grades. There is no live ECX market feed connected; do not treat these as current market prices.',
        prices: [
          { grade: 'Grade 1', pricePerKg: 8.50, currency: 'USD', description: 'Specialty grade, 0-3 defects', date: new Date().toISOString() },
          { grade: 'Grade 2', pricePerKg: 7.80, currency: 'USD', description: 'Premium grade, 4-12 defects', date: new Date().toISOString() },
          { grade: 'Grade 3', pricePerKg: 7.20, currency: 'USD', description: 'Exchange grade, 13-25 defects', date: new Date().toISOString() },
          { grade: 'Grade 4', pricePerKg: 6.50, currency: 'USD', description: 'Standard grade, 26-45 defects', date: new Date().toISOString() },
          { grade: 'Grade 5', pricePerKg: 5.80, currency: 'USD', description: 'Local grade, 46+ defects', date: new Date().toISOString() }
        ],
        marketStatus: 'OPEN',
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
  }
});

// GET /api/v1/ecx/grading-standards — Ethiopian coffee grading standards reference
router.get('/grading-standards', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        standards: [
          {
            grade: 'Grade 1',
            category: 'Specialty',
            defectCount: '0-3',
            cupscore: '85-100',
            moistureContent: '10-12%',
            description: 'Specialty grade coffee with no primary defects and minimal secondary defects',
            characteristics: 'Clean cup, sweet, complex flavors, bright acidity',
            primaryDefects: 0,
            secondaryDefectsMax: 3,
            minScreenSize: 15
          },
          {
            grade: 'Grade 2',
            category: 'Premium',
            defectCount: '4-12',
            cupscore: '80-84.9',
            moistureContent: '10-12%',
            description: 'Premium grade coffee with minimal defects suitable for export',
            characteristics: 'Good cup quality, balanced flavors, pleasant aroma',
            primaryDefects: 0,
            secondaryDefectsMax: 12,
            minScreenSize: 14
          },
          {
            grade: 'Grade 3',
            category: 'Exchange',
            defectCount: '13-25',
            cupscore: '75-79.9',
            moistureContent: '10-12%',
            description: 'Exchange grade coffee meeting international trading standards',
            characteristics: 'Acceptable cup quality, typical Ethiopian profile',
            primaryDefects: 0,
            secondaryDefectsMax: 25,
            minScreenSize: 14
          },
          {
            grade: 'Grade 4',
            category: 'Standard',
            defectCount: '26-45',
            cupscore: '70-74.9',
            moistureContent: '10-12%',
            description: 'Standard commercial grade coffee',
            characteristics: 'Basic cup quality, suitable for blends',
            primaryDefects: '0-1',
            secondaryDefectsMax: 45,
            minScreenSize: 12
          },
          {
            grade: 'Grade 5',
            category: 'Off-Grade',
            defectCount: '46+',
            cupscore: 'Below 70',
            moistureContent: '10-12%',
            description: 'Local consumption grade, below export standards',
            characteristics: 'Below standard quality, limited commercial value',
            primaryDefects: 'Multiple',
            secondaryDefectsMax: 'Unlimited',
            minScreenSize: 12
          }
        ],
        defectTypes: {
          primary: [
            'Full black beans',
            'Full sour beans',
            'Dried cherry/pod',
            'Fungus damaged beans',
            'Foreign matter',
            'Severe insect damage'
          ],
          secondary: [
            'Partial black beans',
            'Partial sour beans',
            'Parchment',
            'Floaters',
            'Immature beans',
            'Withered beans',
            'Shells',
            'Broken/chipped beans',
            'Hull/husk',
            'Slight insect damage'
          ]
        },
        methodology: 'Ethiopian Coffee Grading System based on ECX and SCAA standards',
        sampleSize: '350 grams per lot',
        reference: 'Ethiopian Commodity Exchange (ECX) Grading Manual 2024',
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error('[ECX] Error fetching grading standards:', err);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: err.message }, 
      timestamp: new Date().toISOString() 
    });
  }
});

// GET /api/v1/ecx/lots — all lots
// Fall back to the PostgreSQL ecx_lots mirror (same pattern as
// GET /shipments in shipments.ts): POST /ecx/lots mirrors every intake
// into ecx_lots as WAREHOUSED and the grade/assign/release routes mirror
// status changes, so without Fabric the portal would otherwise always
// show zero lots. The mirror columns are mapped onto the CoffeeLot
// shape the ECX portal consumes verbatim (lotId/status/quantity/grade);
// fields the mirror does not store (moistureContent, defectCount,
// pricePerKg, grading/assignment/release dates) stay
// undefined, exactly as a chaincode row without them would.
async function getLotsFromPG(): Promise<any[]> {
  const rows = await dbService.all(`SELECT * FROM ecx_lots ORDER BY created_at DESC`);
  return rows.map((r: any) => ({
    lotId: r.lot_id,
    ecxLotNumber: r.lot_number,
    exporterId: r.exporter_id,
    exporterName: r.exporter_name,
    warehouseId: r.warehouse_id,
    origin: r.origin,
    subRegion: r.sub_region,
    quantity: parseFloat(r.quantity) || 0,
    bags: r.bags,
    processingMethod: r.processing_method,
    harvestSeason: r.harvest_season,
    grade: r.grade,
    qualityScore: r.quality_score != null ? parseFloat(r.quality_score) : undefined,
    status: r.status,
    rejectionReason: r.rejection_reason || undefined,
    warehouseReceiptDate: r.receipt_date,
    contractId: r.contract_id,
  }));
}

router.get('/lots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await fabricService.queryChaincode('QueryAllECXLots', []);
    if (result.success) {
      const data = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      if (data.length > 0) {
        return res.json({ success: true, data, source: 'blockchain', timestamp: new Date().toISOString() });
      }
      // Chain returned no lots — fall through to the PG mirror below.
      logger.info('[ECX] QueryAllECXLots returned 0 lots, falling back to PostgreSQL mirror');
    } else {
      // ECX functions not yet deployed — fall through to the PG mirror.
      logger.warn('QueryAllECXLots not available yet:', result.error);
    }
  } catch (err: any) {
    logger.warn('ECX lots query failed (functions may not be deployed yet):', err.message);
  }
  try {
    const pgLots = await getLotsFromPG();
    return res.json({ success: true, data: pgLots, source: 'database', timestamp: new Date().toISOString() });
  } catch (pgErr: any) {
    logger.warn('ECX lots PostgreSQL fallback failed:', pgErr.message);
    return res.json({ success: true, data: [], message: 'ECX chaincode functions pending deployment', timestamp: new Date().toISOString() });
  }
});

const isPendingDeploy = (error?: string) =>
  !!error && (error.includes('not found in contract') || error.includes('Function') && error.includes('not found'));

// POST /api/v1/ecx/lots — warehouse intake (issue warehouse receipt)
router.post('/lots', authMiddleware, requireRole('ECX', 'ECX_ADMIN'),
  [body('exporterId').notEmpty(), body('origin').notEmpty(), body('quantity').isNumeric(), body('processingMethod').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { ecxLotNumber, exporterId, exporterName, warehouseId, origin, subRegion, quantity, bags, processingMethod, harvestSeason } = req.body;
      const lotId = `LOT_${Date.now()}`;
      // ecxLotNumber must never reach the chaincode call as undefined:
      // fabric-common's proposal builder calls args[i].toString() on every
      // arg, so an omitted lot number threw a JS TypeError inside submit()
      // that surfaced as INTAKE_FAILED "Cannot read properties of
      // undefined (reading 'toString')". Default to the generated lot ID
      // (the ECX portal always sends its own ECX-… number, so this only
      // fires for callers that omit it).
      const lotNumber = ecxLotNumber || lotId;
      const result = await fabricService.invokeChaincode('RegisterECXLot', [
        lotId, lotNumber, exporterId, exporterName || '', warehouseId || 'WH-ADDIS-01',
        origin, subRegion || '', quantity.toString(),
        (bags || Math.ceil(quantity / 60)).toString(),
        processingMethod, harvestSeason || '2025/2026',
        new Date().toISOString(),
      ]);
      if (result.success) {
        logger.info(`ECX lot intake: ${ecxLotNumber} for exporter ${exporterId}`);
        // Mirror the lot into PostgreSQL: the ECX portal dashboard reads
        // available lots from ecx_lots, and nothing else ever writes that
        // table, so without this the portal always showed zero lots.
        // The mirror is best-effort — the chaincode intake already
        // succeeded, so a mirror failure must not fail the request.
        try {
          await dbService.run(
            `INSERT INTO ecx_lots (
               lot_id, lot_number, exporter_id, exporter_name, warehouse_id,
               origin, sub_region, quantity, bags, processing_method,
               harvest_season, status, receipt_date, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'WAREHOUSED', NOW(), NOW(), NOW())
             ON CONFLICT (lot_id) DO NOTHING`,
            [
              lotId,
              lotNumber,
              exporterId,
              exporterName || null,
              warehouseId || 'WH-ADDIS-01',
              origin,
              subRegion || null,
              quantity,
              bags || Math.ceil(Number(quantity) / 60),
              processingMethod,
              harvestSeason || '2025/2026',
            ]
          );
        } catch (mirrorError: any) {
          logger.warn(`ECX lot ${lotId} intake succeeded on-chain but the PostgreSQL mirror failed:`, mirrorError.message);
        }
        res.status(201).json({ success: true, data: { lotId, ecxLotNumber: lotNumber }, txId: result.txId, timestamp: new Date().toISOString() });
      } else if (isPendingDeploy(result.error)) {
        res.status(503).json({ success: false, error: { code: 'CHAINCODE_UPGRADING', message: 'ECX chaincode functions are being deployed. Run scripts/run-upgrade-seq2.bat and retry in a few minutes.' }, timestamp: new Date().toISOString() });
      } else {
        res.status(400).json({ success: false, error: { code: 'INTAKE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
      }
    } catch (err: any) {
      logger.error('ECX intake error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /api/v1/ecx/lots/:lotId/grade
router.post('/lots/:lotId/grade', authMiddleware, requireRole('ECX', 'ECX_ADMIN'),
  [param('lotId').notEmpty(), body('grade').notEmpty(), body('moistureContent').isNumeric(), body('defectCount').isInt(), body('gradingOfficer').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { grade, qualityScore, moistureContent, defectCount, gradingOfficer, remarks, gradingDate } = req.body;
      // No moisture pre-check here: GradeECXLot itself decides. Moisture
      // > 12 sets the lot REJECTED on-chain (with the reason); the old
      // 400 MOISTURE_EXCEEDED before the chaincode call meant that branch
      // could never run and no lot was ever recorded as REJECTED anywhere.
      const result = await fabricService.invokeChaincode('GradeECXLot', [
        lotId, grade, (qualityScore || 0).toString(), moistureContent.toString(),
        defectCount.toString(), gradingOfficer, remarks || '', gradingDate || new Date().toISOString(),
      ]);
      if (result.success) {
        if (parseFloat(moistureContent) > 12) {
          const rejectionReason = `Moisture content ${moistureContent}% exceeds 12% export limit`;
          await mirrorLotStatusPG(lotId, 'REJECTED', { rejection_reason: rejectionReason });
          return res.json({ success: true, data: { lotId, status: 'REJECTED', rejectionReason, moistureContent: Number(moistureContent), defectCount: Number(defectCount) }, txId: result.txId, timestamp: new Date().toISOString() });
        }
        await mirrorLotStatusPG(lotId, 'GRADED', { grade, quality_score: qualityScore != null ? Number(qualityScore) : null });
        res.json({ success: true, data: { lotId, status: 'GRADED', grade, qualityScore: Number(qualityScore || 0), moistureContent: Number(moistureContent), defectCount: Number(defectCount) }, txId: result.txId, timestamp: new Date().toISOString() });
      } else if (isPendingDeploy(result.error)) {
        res.status(503).json({ success: false, error: { code: 'CHAINCODE_UPGRADING', message: 'ECX chaincode functions are being deployed. Run scripts/run-upgrade-seq2.bat and retry.' }, timestamp: new Date().toISOString() });
      } else {
        res.status(400).json({ success: false, error: { code: 'GRADE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /api/v1/ecx/lots/:lotId/reject — explicit lot rejection for a cause
// other than moisture (defects/UG, contamination, failed cupping).
// Moisture rejections flow through the grade route instead, which lets
// GradeECXLot set REJECTED. Invokes the new RejectECXLot chaincode
// function (v2.3/seq 22 — not yet deployed on the Fabric host, so with
// reachable peers this returns 503 CHAINCODE_UPGRADING until the redeploy,
// exactly like the other ECX routes when their function is missing; with
// no peers reachable it returns 400 with the peer error, also like them).
// On success the REJECTED status + reason are mirrored into ecx_lots so
// the portal's REJECTED filter can show the lot. REJECTED is terminal
// (statusManager ECX machine: WAREHOUSED -> GRADED/REJECTED, REJECTED -> []).
router.post('/lots/:lotId/reject', authMiddleware,
  requireRole('ECX', 'ECX_ADMIN'), // Only ECX rejects lots
  [param('lotId').notEmpty(), body('rejectionReason').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { rejectionReason, rejectedBy, rejectionDate } = req.body;
      const result = await fabricService.invokeChaincode('RejectECXLot', [
        lotId, rejectionReason, rejectedBy || '', rejectionDate || new Date().toISOString(),
      ]);
      if (result.success) {
        await mirrorLotStatusPG(lotId, 'REJECTED', { rejection_reason: rejectionReason });
        res.json({ success: true, data: { lotId, status: 'REJECTED', rejectionReason }, txId: result.txId, timestamp: new Date().toISOString() });
      } else if (isPendingDeploy(result.error)) {
        res.status(503).json({ success: false, error: { code: 'CHAINCODE_UPGRADING', message: 'ECX chaincode functions are being deployed. Run scripts/run-upgrade-seq2.bat and retry.' }, timestamp: new Date().toISOString() });
      } else {
        res.status(400).json({ success: false, error: { code: 'REJECT_FAILED', message: result.error }, timestamp: new Date().toISOString() });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /api/v1/ecx/lots/:lotId/assign
router.post('/lots/:lotId/assign', authMiddleware, requireRole('ECX', 'ECX_ADMIN'),
  [param('lotId').notEmpty(), body('contractId').notEmpty(), body('pricePerKg').isNumeric()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { contractId, pricePerKg, assignmentDate } = req.body;
      if (parseFloat(pricePerKg) < 5.0) {
        return res.status(400).json({ success: false, error: { code: 'PRICE_BELOW_MINIMUM', message: `Price $${pricePerKg}/kg is below NBE minimum of $5.00/kg` }, timestamp: new Date().toISOString() });
      }
      const result = await fabricService.invokeChaincode('AssignECXLot', [
        lotId, contractId, pricePerKg.toString(), assignmentDate || new Date().toISOString(),
      ]);
      if (result.success) {
        await mirrorLotStatusPG(lotId, 'ASSIGNED', { contract_id: contractId });
        res.json({ success: true, data: { lotId, contractId }, txId: result.txId, timestamp: new Date().toISOString() });
      } else if (isPendingDeploy(result.error)) {
        res.status(503).json({ success: false, error: { code: 'CHAINCODE_UPGRADING', message: 'ECX chaincode functions are being deployed. Run scripts/run-upgrade-seq2.bat and retry.' }, timestamp: new Date().toISOString() });
      } else {
        res.status(400).json({ success: false, error: { code: 'ASSIGN_FAILED', message: result.error }, timestamp: new Date().toISOString() });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /api/v1/ecx/lots/:lotId/release
router.post('/lots/:lotId/release', authMiddleware, requireRole('ECX', 'ECX_ADMIN'),
  [param('lotId').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { releaseDate, note } = req.body;
      const result = await fabricService.invokeChaincode('ReleaseECXLot', [
        lotId, releaseDate || new Date().toISOString(), note || '',
      ]);
      if (result.success) {
        await mirrorLotStatusPG(lotId, 'RELEASED');
        res.json({ success: true, data: { lotId }, txId: result.txId, timestamp: new Date().toISOString() });
      } else if (isPendingDeploy(result.error)) {
        res.status(503).json({ success: false, error: { code: 'CHAINCODE_UPGRADING', message: 'ECX chaincode functions are being deployed. Run scripts/run-upgrade-seq2.bat and retry.' }, timestamp: new Date().toISOString() });
      } else {
        res.status(400).json({ success: false, error: { code: 'RELEASE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, timestamp: new Date().toISOString() });
    }
  }
);

// POST /api/v1/ecx/lots/:lotId/auto-release — release only after customs clearance
router.post('/lots/:lotId/auto-release', authMiddleware, requireRole('ECX', 'ECX_ADMIN'),
  [param('lotId').notEmpty(), body('shipmentID').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { shipmentID, releasedBy } = req.body;
      const lotResult = await fabricService.queryChaincode('ReadECXLot', [lotId]);

      if (!lotResult.success || !lotResult.data) {
        return res.status(404).json({
          success: false,
          error: { code: 'LOT_NOT_FOUND', message: `ECX lot ${lotId} was not found on the ledger` },
          timestamp: new Date().toISOString(),
        });
      }

      const lot = typeof lotResult.data === 'string' ? JSON.parse(lotResult.data) : lotResult.data;
      const ecxLotNumber = lot?.ecxLotNumber || lot?.ECXLotNumber;
      if (!ecxLotNumber) {
        return res.status(422).json({
          success: false,
          error: { code: 'LOT_NUMBER_MISSING', message: 'The ledger lot does not include its ECX lot number' },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fabricService.releaseECXLotForShipment(
        shipmentID,
        ecxLotNumber,
        releasedBy || (req as any).user?.username || 'Customs-cleared workflow'
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'AUTO_RELEASE_FAILED', message: result.error || 'Could not auto-release ECX lot' },
          timestamp: new Date().toISOString(),
        });
      }

      await mirrorLotStatusPG(lotId, 'RELEASED');
      return res.json({
        success: true,
        data: { lotId, ecxLotNumber, shipmentID },
        txId: result.txId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('[ECX] Auto-release failed:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'ECX auto-release failed' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
