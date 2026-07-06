// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Routes — Warehouse Intake, Grading, Lot Assignment & Release

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();

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

export default router;
