// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Routes — Warehouse Intake, Grading, Lot Assignment & Release

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();
const dbService = DatabaseService.getInstance();

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
    // Return comprehensive market prices for Ethiopian coffee grades
    res.json({ 
      success: true, 
      data: {
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
router.get('/lots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await fabricService.queryChaincode('QueryAllECXLots', []);
    if (result.success) {
      const data = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } else {
      // ECX functions not yet deployed — return empty gracefully
      logger.warn('QueryAllECXLots not available yet:', result.error);
      res.json({ success: true, data: [], message: 'ECX chaincode functions pending deployment', timestamp: new Date().toISOString() });
    }
  } catch (err: any) {
    logger.warn('ECX lots query failed (functions may not be deployed yet):', err.message);
    res.json({ success: true, data: [], message: err.message, timestamp: new Date().toISOString() });
  }
});

const isPendingDeploy = (error?: string) =>
  !!error && (error.includes('not found in contract') || error.includes('Function') && error.includes('not found'));

// POST /api/v1/ecx/lots — warehouse intake (issue warehouse receipt)
router.post('/lots', authMiddleware,
  [body('exporterId').notEmpty(), body('origin').notEmpty(), body('quantity').isNumeric(), body('processingMethod').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { ecxLotNumber, exporterId, exporterName, warehouseId, origin, subRegion, quantity, bags, processingMethod, harvestSeason } = req.body;
      const lotId = `LOT_${Date.now()}`;
      const result = await fabricService.invokeChaincode('RegisterECXLot', [
        lotId, ecxLotNumber, exporterId, exporterName || '', warehouseId || 'WH-ADDIS-01',
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
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'AVAILABLE', NOW(), NOW(), NOW())
             ON CONFLICT (lot_id) DO NOTHING`,
            [
              lotId,
              ecxLotNumber || null,
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
        res.status(201).json({ success: true, data: { lotId, ecxLotNumber }, txId: result.txId, timestamp: new Date().toISOString() });
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
router.post('/lots/:lotId/grade', authMiddleware,
  [param('lotId').notEmpty(), body('grade').notEmpty(), body('moistureContent').isNumeric(), body('defectCount').isInt(), body('gradingOfficer').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { lotId } = req.params;
      const { grade, qualityScore, moistureContent, defectCount, gradingOfficer, remarks, gradingDate } = req.body;
      if (parseFloat(moistureContent) > 12) {
        return res.status(400).json({ success: false, error: { code: 'MOISTURE_EXCEEDED', message: `Moisture ${moistureContent}% exceeds 12% export limit — lot cannot be exported` }, timestamp: new Date().toISOString() });
      }
      const result = await fabricService.invokeChaincode('GradeECXLot', [
        lotId, grade, (qualityScore || 0).toString(), moistureContent.toString(),
        defectCount.toString(), gradingOfficer, remarks || '', gradingDate || new Date().toISOString(),
      ]);
      if (result.success) {
        res.json({ success: true, data: { lotId, grade, qualityScore: Number(qualityScore || 0), moistureContent: Number(moistureContent), defectCount: Number(defectCount) }, txId: result.txId, timestamp: new Date().toISOString() });
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

// POST /api/v1/ecx/lots/:lotId/assign
router.post('/lots/:lotId/assign', authMiddleware,
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
router.post('/lots/:lotId/release', authMiddleware,
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
router.post('/lots/:lotId/auto-release', authMiddleware,
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
