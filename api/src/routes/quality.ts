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

      // Check if shipment already has a pending inspection
      const pendingInspection = await postgresDb.get(
        'SELECT inspection_id FROM quality_inspections WHERE shipment_id = $1 AND status = $2',
        [shipmentID, 'pending']
      );

      if (pendingInspection) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSPECTION_ALREADY_SCHEDULED',
            message: `Shipment ${shipmentID} already has a pending inspection: ${pendingInspection.inspection_id}`
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
 * @route POST /api/v1/quality/inspections/:inspectionID/perform
 * @desc Perform inspection and record results (status: requested → inspected)
 * @access ECTA Quality Inspector
 */
router.post('/inspections/:inspectionID/perform',
  authMiddleware,
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
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'pending' && inspection.status !== 'requested') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot perform inspection. Current status: ${inspection.status}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Calculate grade from overall score
      let grade = 'Grade 1';
      if (overall >= 85) grade = 'Grade 1';
      else if (overall >= 80) grade = 'Grade 2';
      else if (overall >= 75) grade = 'Grade 3';
      else grade = 'Below Grade';

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
        overall: overall || 0
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
- Fragrance/Aroma: ${fragrance}/10
- Flavor: ${flavor}/10
- Aftertaste: ${aftertaste}/10
- Acidity: ${acidity}/10
- Body: ${body}/10
- Balance: ${balance}/10
- Uniformity: ${uniformity}/10
- Clean Cup: ${cleanCup}/10
- Sweetness: ${sweetness}/10
- Overall Score: ${overall}/100

LAB TESTS:
- Pesticide Test: ${pesticideTest || 'N/A'}
- Heavy Metal Test: ${heavyMetalTest || 'N/A'}
- Mycotoxin Test: ${mycotoxinTest || 'N/A'}

INSPECTOR REMARKS:
${remarks || 'No additional remarks'}
`.trim();

      // Update inspection with ALL results
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'inspected',
          inspection_date = NOW(),
          inspector_name = $2,
          sample_size = $3,
          moisture_content = $4,
          defect_count = $5,
          screen_size = $6,
          grade = $7,
          cup_quality = $8,
          remarks = $9,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [
          inspectionID,
          inspectorName || 'ECTA Quality Lab',
          sampleSize || 100,
          moistureContent,
          defectCount,
          parseInt(beanSize) || 17,
          grade,
          cupQualityJson,  // Store all cup scores as JSON
          comprehensiveRemarks
        ]
      );

      logger.info(`Quality inspection performed: ${inspectionID}, Overall: ${overall}, Grade: ${grade}`);

      res.json({
        success: true,
        data: { 
          inspectionID, 
          status: 'inspected',
          grade,
          overall,
          cupQuality: cupQualityScores
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Quality inspection perform error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
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
  [
    param('inspectionID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { approvedBy, certificateNo } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'inspected') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot approve inspection. Current status: ${inspection.status}. Must be 'inspected' first.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Approve inspection
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'approved',
          passed = true,
          certification_number = $2,
          grade = COALESCE(grade, 'Grade 1'),
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, certificateNo || `CERT${inspectionID}`]
      );

      logger.info(`Quality inspection approved: ${inspectionID}, Certificate: ${certificateNo}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'approved', certificateNo },
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

/**
 * @route POST /api/v1/quality/inspections/:inspectionID/reject
 * @desc Reject inspection results (status: inspected → rejected)
 * @access ECTA Quality Director
 */
router.post('/inspections/:inspectionID/reject',
  authMiddleware,
  [
    param('inspectionID').notEmpty(),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { reason, rejectedBy } = req.body;

      // Check inspection exists and is in correct status
      const inspection = await postgresDb.get(
        'SELECT id, status FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'inspected') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot reject inspection. Current status: ${inspection.status}. Must be 'inspected' first.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Reject inspection
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'rejected',
          passed = false,
          remarks = $2,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, `REJECTED: ${reason}`]
      );

      logger.info(`Quality inspection rejected: ${inspectionID}, Reason: ${reason}`);

      res.json({
        success: true,
        data: { inspectionID, status: 'rejected', reason },
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
 * @route POST /api/v1/quality/inspections/:inspectionID/issue-permit
 * @desc Issue export permit after inspection approval (status: approved → permit_issued)
 * @access ECTA Export Permit Office
 */
router.post('/inspections/:inspectionID/issue-permit',
  authMiddleware,
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
        'SELECT id, status, shipment_id, exporter_id, passed, certification_number FROM quality_inspections WHERE inspection_id = $1',
        [inspectionID]
      );

      if (!inspection) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Inspection not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (inspection.status !== 'approved' && inspection.passed !== true) {
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

      const permitNumber = exportPermitNo || `PERMIT${Date.now()}`;

      // Update inspection status to permit_issued
      await postgresDb.run(
        `UPDATE quality_inspections SET
          status = 'permit_issued',
          remarks = COALESCE(remarks, '') || '\n\nEXPORT PERMIT ISSUED: ' || $2 || ' by ' || $3,
          updated_at = NOW()
        WHERE inspection_id = $1`,
        [inspectionID, permitNumber, issuedBy || 'ECTA Export Permit Office']
      );

      logger.info(`Export permit issued: ${permitNumber} for inspection ${inspectionID}, shipment ${inspection.shipment_id}`);

      // TODO: If autoCreateCustomsDeclaration is true, trigger customs workflow
      // This would create a customs declaration record for the shipment

      res.json({
        success: true,
        data: { 
          inspectionID,
          shipmentID: inspection.shipment_id,
          exportPermitNo: permitNumber,
          certificateNo: inspection.certification_number,
          status: 'permit_issued'
        },
        message: 'Export permit issued successfully. Shipment ready for customs clearance.',
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
          certificateNo: insp.certification_number,
          certificationNumber: insp.certification_number,
          grade: insp.grade,
          cupQuality: insp.cup_quality,  // Raw JSON string or text
          cupQualityScores: cupQualityScores,  // Parsed JSON object
          moistureContent: insp.moisture_content,
          defectCount: insp.defect_count,
          screenSize: insp.screen_size,
          passed: insp.passed,
          remarks: insp.remarks,
          overall: overallScore,
          overallScore: overallScore,
          createdAt: insp.created_at,
          updatedAt: insp.updated_at,
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

export default router;
