import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();

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
  [
    body('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID, exporterID, contractID, shipmentID, coffeeType, quantity, sampleSize, requestedDate } = req.body;

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

      await postgresDb.run(
        `INSERT INTO quality_inspections (
          inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
          quantity, sample_size, requested_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [inspectionID, exporterID, contractID || null, shipmentID || null, coffeeType, 
         quantity, sampleSize || null, requestedDate || new Date().toISOString().split('T')[0], 'pending']
      );

      logger.info(`Quality inspection requested: ${inspectionID}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'pending' },
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
 * @route POST /api/v1/quality/inspections/:inspectionID/complete
 * @desc Complete quality inspection with results
 * @access ECTA
 */
router.post('/inspections/:inspectionID/complete',
  authMiddleware,
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

      await postgresDb.run(
        `UPDATE quality_inspections SET
          inspection_date = $1, grade = $2, cup_quality = $3, moisture_content = $4,
          defect_count = $5, screen_size = $6, passed = $7, certification_number = $8,
          inspector_name = $9, remarks = $10, status = $11, updated_at = NOW()
        WHERE inspection_id = $12`,
        [new Date().toISOString().split('T')[0], grade, cupQuality || null, moistureContent || null,
         defectCount || null, screenSize || null, passed, certificationNumber || null,
         inspectorName || null, remarks || null, 'completed', inspectionID]
      );

      logger.info(`Quality inspection completed: ${inspectionID}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'completed', passed },
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
      const { status, exporterID } = req.query;
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

      query += ' ORDER BY created_at DESC';

      const inspections = await postgresDb.all(query, params);

      res.json({
        success: true,
        data: { inspections },
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

export default router;
