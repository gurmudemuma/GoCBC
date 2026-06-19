// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Quality Inspection API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = new FabricService();

/**
 * POST /api/v1/quality/inspections - Request quality inspection
 */
router.post('/inspections',
  authMiddleware,
  [
    body('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID, shipmentID, contractID, exporterID } = req.body;

      const result = await fabricService.requestInspection(
        inspectionID,
        shipmentID,
        contractID,
        exporterID
      );

      if (result.success) {
        logger.info(`Quality inspection requested: ${inspectionID}`);
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REQUEST_FAILED',
            message: result.error || 'Failed to request inspection',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error requesting inspection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/quality/inspections/:inspectionID/perform - Perform inspection
 */
router.post('/inspections/:inspectionID/perform',
  authMiddleware,
  [
    param('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('inspectorID').notEmpty().withMessage('Inspector ID is required'),
    body('inspectorName').notEmpty().withMessage('Inspector name is required'),
    body('sampleSize').isNumeric().withMessage('Sample size must be numeric'),
    body('moistureContent').isNumeric().withMessage('Moisture content must be numeric'),
    body('defectCount').isInt().withMessage('Defect count must be an integer'),
    body('beanSize').notEmpty().withMessage('Bean size is required'),
    body('color').notEmpty().withMessage('Color is required'),
    body('odor').notEmpty().withMessage('Odor is required'),
    body('classification').notEmpty().withMessage('Classification is required'),
  ],
  validateRequest,
  async (req, res) => {
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
        body: bodyScore,
        balance,
        uniformity,
        cleanCup,
        sweetness,
        overall,
        classification,
        pesticideTest,
        heavyMetalTest,
        mycotoxinTest,
        remarks,
      } = req.body;

      const result = await fabricService.performInspection(
        inspectionID,
        inspectorID,
        inspectorName,
        sampleSize.toString(),
        moistureContent.toString(),
        defectCount.toString(),
        beanSize,
        color,
        odor,
        (fragrance || '8').toString(),
        (flavor || '8').toString(),
        (aftertaste || '8').toString(),
        (acidity || '8').toString(),
        (bodyScore || '8').toString(),
        (balance || '8').toString(),
        (uniformity || '10').toString(),
        (cleanCup || '10').toString(),
        (sweetness || '10').toString(),
        (overall || '8').toString(),
        classification,
        pesticideTest || 'NOT_TESTED',
        heavyMetalTest || 'NOT_TESTED',
        mycotoxinTest || 'NOT_TESTED',
        remarks || ''
      );

      if (result.success) {
        logger.info(`Quality inspection performed: ${inspectionID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PERFORM_FAILED',
            message: result.error || 'Failed to perform inspection',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error performing inspection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/quality/inspections/:inspectionID/approve - Approve inspection (quality only)
 */
router.post('/inspections/:inspectionID/approve',
  authMiddleware,
  [
    param('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('approvedBy').notEmpty().withMessage('Approved by is required'),
    body('certificateNo').notEmpty().withMessage('Certificate number is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { inspectionID } = req.params;
      const { approvedBy, certificateNo } = req.body;

      const result = await fabricService.approveInspection(
        inspectionID,
        approvedBy,
        certificateNo
      );

      if (result.success) {
        logger.info(`Quality inspection approved: ${inspectionID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'APPROVE_FAILED',
            message: result.error || 'Failed to approve inspection',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error approving inspection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/quality/inspections/:inspectionID/issue-permit - Issue export permit (after quality approval)
 */
router.post('/inspections/:inspectionID/issue-permit',
  authMiddleware,
  [
    param('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('exportPermitNo').notEmpty().withMessage('Export permit number is required'),
    body('issuedBy').notEmpty().withMessage('Issued by is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { inspectionID } = req.params;
      const { exportPermitNo, issuedBy } = req.body;

      const result = await fabricService.issueExportPermit(
        inspectionID,
        exportPermitNo,
        issuedBy
      );

      if (result.success) {
        logger.info(`Export permit issued: ${exportPermitNo} for inspection ${inspectionID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PERMIT_ISSUE_FAILED',
            message: result.error || 'Failed to issue export permit',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error issuing export permit:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/quality/inspections/:inspectionID/reject - Reject inspection
 */
router.post('/inspections/:inspectionID/reject',
  authMiddleware,
  [
    param('inspectionID').notEmpty().withMessage('Inspection ID is required'),
    body('rejectedBy').notEmpty().withMessage('Rejected by is required'),
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { inspectionID } = req.params;
      const { rejectedBy, rejectionReason } = req.body;

      const result = await fabricService.rejectInspection(
        inspectionID,
        rejectedBy,
        rejectionReason
      );

      if (result.success) {
        logger.info(`Quality inspection rejected: ${inspectionID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REJECT_FAILED',
            message: result.error || 'Failed to reject inspection',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error rejecting inspection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/quality/inspections - Get all inspections
 */
router.get('/inspections', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, exporterID, limit = 50, offset = 0 } = req.query;

    let result;
    if (status) {
      result = await fabricService.getInspectionsByStatus(status as string);
    } else if (exporterID) {
      result = await fabricService.getInspectionsByExporter(exporterID as string);
    } else {
      result = await fabricService.getAllInspections();
    }

    if (result.success) {
      let inspections = result.data || [];

      // Apply pagination
      const paginatedInspections = inspections.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: paginatedInspections,
        pagination: {
          total: inspections.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < inspections.length,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve inspections',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving inspections:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/quality/inspections/:inspectionID - Get inspection details
 */
router.get('/inspections/:inspectionID',
  authMiddleware,
  [param('inspectionID').notEmpty().withMessage('Inspection ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const result = await fabricService.getInspection(inspectionID);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error || 'Inspection not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving inspection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
