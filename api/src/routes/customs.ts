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

/**
 * GET /api/v1/customs/permit-ready
 * Returns all shipments that have received export permits from ECTA Quality Control
 * Status: permit_issued means ECTA has issued the export permit
 */
router.get('/permit-ready',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      logger.info('[CUSTOMS] Fetching permit-ready shipments (status=permit_issued)');
      
      // Fetch all inspections with status 'permit_issued'
      const inspections = await postgresDb.all(`
        SELECT 
          inspection_id,
          shipment_id,
          exporter_id,
          contract_id,
          coffee_type,
          quantity,
          status,
          passed,
          grade,
          certification_number,
          requested_date,
          inspection_date,
          remarks,
          created_at,
          updated_at
        FROM quality_inspections
        WHERE status = 'permit_issued'
        ORDER BY updated_at DESC, created_at DESC
      `);
      
      // Transform to camelCase and extract permit number and score from remarks
      const transformed = inspections.map((insp: any) => {
        // Extract permit number from remarks (format: "EXPORT PERMIT ISSUED: PERMIT123456...")
        let exportPermitNo = 'N/A';
        let totalScore: number | null = null;
        
        if (insp.remarks) {
          // Extract permit number
          const permitMatch = insp.remarks.match(/EXPORT PERMIT ISSUED:\s*([A-Z0-9]+)/);
          if (permitMatch) exportPermitNo = permitMatch[1];
          
          // Extract overall score (format: "Overall score: 87")
          const scoreMatch = insp.remarks.match(/Overall score:\s*(\d+)/i);
          if (scoreMatch) totalScore = parseInt(scoreMatch[1], 10);
        }
        
        return {
          inspectionId: insp.inspection_id,
          shipmentId: insp.shipment_id,
          exporterId: insp.exporter_id,
          contractId: insp.contract_id,
          coffeeType: insp.coffee_type,
          quantity: parseFloat(insp.quantity || 0),
          status: insp.status,
          passed: insp.passed,
          qualityGrade: insp.grade,
          classification: insp.grade, // Alias for grade
          totalScore: totalScore, // Extract from remarks
          certificateNo: insp.certification_number,
          exportPermitNo: exportPermitNo,
          requestedDate: insp.requested_date,
          inspectionDate: insp.inspection_date,
          remarks: insp.remarks,
          createdAt: insp.created_at,
          updatedAt: insp.updated_at
        };
      });
      
      logger.info(`[CUSTOMS] Found ${transformed.length} permit-ready shipments`);
      
      res.json({ 
        success: true, 
        data: transformed,
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error fetching permit-ready shipments:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
