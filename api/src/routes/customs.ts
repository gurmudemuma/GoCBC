import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();

const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: errors.array() },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

router.post('/risk-assessment',
  authMiddleware,
  [
    body('shipmentID').notEmpty(),
    body('exporterID').notEmpty(),
    body('riskLevel').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentID, exporterID, riskFactors, riskLevel, inspectionRequired } = req.body;
      const assessmentID = `RISK-${Date.now()}`;
      const user = (req as any).user;

      await postgresDb.run(
        `INSERT INTO customs_risk_assessments (
          assessment_id, shipment_id, exporter_id, risk_factors, risk_level,
          inspection_required, assessed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [assessmentID, shipmentID, exporterID, JSON.stringify(riskFactors || {}),
         riskLevel, inspectionRequired || false, user.username]
      );

      res.json({
        success: true,
        data: { assessmentID, riskLevel },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Risk assessment error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.post('/clearance',
  authMiddleware,
  [body('shipmentID').notEmpty(), body('clearanceNumber').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentID, clearanceNumber, status, clearedBy, clearedDate } = req.body;
      const clearanceID = `CLR-${Date.now()}`;

      await postgresDb.run(
        `INSERT INTO customs_clearances (
          clearance_id, shipment_id, clearance_number, status, cleared_by, cleared_date
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [clearanceID, shipmentID, clearanceNumber, status || 'pending',
         clearedBy || null, clearedDate || null]
      );

      res.json({
        success: true,
        data: { clearanceID, clearanceNumber, status },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Clearance error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

router.get('/clearances',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let query = 'SELECT * FROM customs_clearances WHERE 1=1';
      const params: any[] = [];
      
      if (status) {
        query += ' AND status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      const clearances = await postgresDb.all(query, params);

      res.json({ success: true, data: { clearances }, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
