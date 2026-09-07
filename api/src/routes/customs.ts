import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();

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

/**
 * GET /api/v1/customs/declarations
 * Get all customs declarations (for checking which shipments have declarations)
 */
router.get('/declarations',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      logger.info('[CUSTOMS] Fetching all customs declarations');

      const declarations = await postgresDb.all(
        `SELECT 
          declaration_number, 
          shipment_id, 
          exporter_id,
          declaration_type,
          hs_code,
          quantity,
          customs_value_usd,
          currency,
          destination,
          port_of_exit,
          eudr_compliant,
          additional_notes,
          status,
          customs_officer,
          inspection_required,
          created_at,
          updated_at
        FROM customs_declarations 
        ORDER BY created_at DESC`
      );

      logger.info(`[CUSTOMS] Found ${declarations.length} declarations`);

      // Map to camelCase for frontend
      const mappedDeclarations = declarations.map((d: any) => ({
        declarationId: d.declaration_number,
        shipmentId: d.shipment_id,
        exporterId: d.exporter_id,
        declarationType: d.declaration_type,
        hsCode: d.hs_code,
        quantity: parseFloat(d.quantity || 0),
        value: parseFloat(d.customs_value_usd || 0),
        currency: d.currency,
        destination: d.destination,
        portOfExit: d.port_of_exit,
        eudrCompliant: d.eudr_compliant,
        additionalNotes: d.additional_notes,
        status: d.status,
        customsOfficer: d.customs_officer,
        inspectionRequired: d.inspection_required,
        submissionDate: d.created_at,
        updatedAt: d.updated_at
      }));

      res.json({
        success: true,
        data: mappedDeclarations,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error fetching declarations:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

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

      // ✅ Record risk assessment on blockchain
      try {
        const auditService = require('../services/auditService').default;
        await auditService.recordAudit({
          entityType: 'CUSTOMS_RISK_ASSESSMENT',
          entityId: assessmentID,
          actionType: 'ASSESS',
          actionBy: user.username,
          organizationMSP: 'CustomsMSP',
          details: {
            shipmentID,
            exporterID,
            riskLevel,
            riskFactors,
            inspectionRequired: inspectionRequired || false
          },
          timestamp: new Date()
        });
        logger.info(`✅ Risk assessment recorded on blockchain: ${assessmentID}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record risk assessment on blockchain (non-fatal):`, blockchainErr);
      }

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

      // ✅ Record clearance on blockchain
      try {
        const auditService = require('../services/auditService').default;
        const user = (req as any).user;
        await auditService.recordAudit({
          entityType: 'CUSTOMS_CLEARANCE',
          entityId: clearanceID,
          actionType: 'CREATE',
          actionBy: user?.username || clearedBy || 'customs',
          organizationMSP: 'CustomsMSP',
          details: {
            shipmentID,
            clearanceNumber,
            status: status || 'pending'
          },
          timestamp: new Date()
        });
        logger.info(`✅ Customs clearance recorded on blockchain: ${clearanceID}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record clearance on blockchain (non-fatal):`, blockchainErr);
      }

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
      
      // JOIN customs_clearances with customs_declarations to get complete data
      let query = `
        SELECT 
          cc.*,
          cd.declaration_number,
          cd.customs_value_usd,
          cd.quantity,
          cd.currency,
          cd.hs_code,
          cd.destination,
          cd.port_of_exit,
          cd.declaration_type,
          cd.eudr_compliant
        FROM customs_clearances cc
        LEFT JOIN customs_declarations cd ON cc.shipment_id = cd.shipment_id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (status) {
        query += ' AND cc.status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY cc.created_at DESC';
      const clearances = await postgresDb.all(query, params);

      res.json({ 
        success: true, 
        data: clearances,  // Return array with joined declaration data
        timestamp: new Date().toISOString() 
      });
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
          qi.inspection_id,
          qi.shipment_id,
          qi.exporter_id,
          qi.contract_id,
          qi.coffee_type,
          qi.quantity,
          qi.status,
          qi.passed,
          qi.grade,
          qi.certification_number,
          qi.requested_date,
          qi.inspection_date,
          qi.remarks,
          qi.created_at,
          qi.updated_at,
          cd.declaration_number
        FROM quality_inspections qi
        LEFT JOIN customs_declarations cd ON qi.shipment_id = cd.shipment_id
        WHERE qi.status = 'permit_issued'
          AND cd.declaration_number IS NULL
        ORDER BY qi.updated_at DESC, qi.created_at DESC
      `);
      
      logger.info(`[CUSTOMS] Found ${inspections.length} quality inspections with permit_issued status (excluding already declared)`);
      
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

/**
 * GET /api/v1/customs/declarations
 * Returns all customs declarations with their complete data
 */
router.get('/declarations',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      logger.info('[CUSTOMS] Fetching all customs declarations');

      const declarations = await postgresDb.all(
        `SELECT 
          declaration_number, 
          shipment_id, 
          exporter_id,
          declaration_type,
          hs_code,
          quantity,
          customs_value_usd,
          currency,
          destination,
          port_of_exit,
          eudr_compliant,
          additional_notes,
          status,
          customs_officer,
          inspection_required,
          created_at,
          updated_at
        FROM customs_declarations 
        ORDER BY created_at DESC`
      );

      logger.info(`[CUSTOMS] Found ${declarations.length} declarations`);

      // Map to camelCase for frontend
      const mappedDeclarations = declarations.map((d: any) => ({
        declarationId: d.declaration_number,
        shipmentId: d.shipment_id,
        exporterId: d.exporter_id,
        declarationType: d.declaration_type,
        hsCode: d.hs_code,
        quantity: parseFloat(d.quantity || 0),
        value: parseFloat(d.customs_value_usd || 0),
        currency: d.currency,
        destination: d.destination,
        portOfExit: d.port_of_exit,
        eudrCompliant: d.eudr_compliant,
        additionalNotes: d.additional_notes,
        status: d.status,
        customsOfficer: d.customs_officer,
        inspectionRequired: d.inspection_required,
        submissionDate: d.created_at,
        updatedAt: d.updated_at
      }));

      res.json({
        success: true,
        data: mappedDeclarations,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error fetching declarations:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/customs/declaration/submit
 * Submit a new customs declaration for a shipment with export permit
 */
router.post('/declaration/submit',
  authMiddleware,
  [
    body('declarationID').notEmpty(),
    body('shipmentID').notEmpty(),
    body('exporterID').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        declarationID,
        shipmentID,
        exporterID,
        declarationType,
        hsCode,
        quantity,
        value,
        currency,
        destination,
        portOfExit,
        eudrCompliant,
        additionalNotes
      } = req.body;

      logger.info(`[CUSTOMS] Submitting declaration ${declarationID} for shipment ${shipmentID}`);

      // Check if declaration already exists for this shipment
      const existingDeclaration = await postgresDb.get(
        `SELECT declaration_number FROM customs_declarations WHERE shipment_id = $1`,
        [shipmentID]
      );

      if (existingDeclaration) {
        logger.warn(`[CUSTOMS] Declaration for shipment ${shipmentID} already exists (${existingDeclaration.declaration_number})`);
        return res.status(400).json({
          success: false,
          error: { 
            code: 'DECLARATION_EXISTS', 
            message: 'A customs declaration has already been submitted for this shipment. Please contact customs if you need to update it.' 
          },
          timestamp: new Date().toISOString()
        });
      }

      // Store in customs_declarations table with full declaration data
      await postgresDb.run(
        `INSERT INTO customs_declarations (
          declaration_number, shipment_id, exporter_id, declaration_type, hs_code, 
          quantity, customs_value_usd, currency, destination, port_of_exit, 
          eudr_compliant, additional_notes, status, inspection_required, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          declarationID, 
          shipmentID, 
          exporterID, 
          declarationType || 'STANDARD',
          hsCode || '090111',
          quantity || 0,
          value || 0, 
          currency || 'USD',
          destination || 'Unknown',
          portOfExit || 'Djibouti Port',
          eudrCompliant || false,
          additionalNotes || '',
          'SUBMITTED',
          true
        ]
      );

      // ✅ Record customs declaration on blockchain
      try {
        const auditService = require('../services/auditService').default;
        await auditService.recordAudit({
          entityType: 'CUSTOMS_DECLARATION',
          entityId: declarationID,
          actionType: 'SUBMIT',
          actionBy: exporterID,
          organizationMSP: 'CustomsMSP',
          details: {
            shipmentID,
            exporterID,
            declarationType: declarationType || 'STANDARD',
            hsCode: hsCode || '090111',
            quantity: quantity || 0,
            customsValueUSD: value || 0,
            currency: currency || 'USD',
            destination: destination || 'Unknown',
            portOfExit: portOfExit || 'Djibouti Port',
            eudrCompliant: eudrCompliant || false
          },
          timestamp: new Date()
        });
        logger.info(`✅ Customs declaration recorded on blockchain: ${declarationID}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record declaration on blockchain (non-fatal):`, blockchainErr);
      }

      logger.info(`[CUSTOMS] Declaration ${declarationID} submitted successfully with status SUBMITTED`);

      res.json({
        success: true,
        data: {
          declarationID,
          shipmentID,
          status: 'SUBMITTED',
          message: 'Declaration submitted successfully and ready for customs officer review'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error submitting declaration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/customs/test-shipment-update/:shipmentId
 * Test endpoint to manually update shipment status to CUSTOMS_CLEARED
 */
router.post('/test-shipment-update/:shipmentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { shipmentId } = req.params;
      
      logger.info(`[CUSTOMS TEST] Checking shipment ${shipmentId}...`);
      
      // Check if shipment exists
      const shipment = await fabricService.getShipment(shipmentId);
      
      if (!shipment.success || !shipment.data) {
        return res.json({
          success: false,
          error: 'Shipment not found on blockchain',
          shipmentId
        });
      }
      
      const currentStatus = shipment.data.status || shipment.data.Status;
      logger.info(`[CUSTOMS TEST] Current status: ${currentStatus}`);
      
      // Update to CUSTOMS_CLEARED
      const result = await fabricService.invokeChaincode('UpdateShipmentStatus', [
        shipmentId,
        'CUSTOMS_CLEARED'
      ]);
      
      logger.info(`[CUSTOMS TEST] Update result:`, result);
      
      // Verify the update
      const updatedShipment = await fabricService.getShipment(shipmentId);
      const newStatus = updatedShipment.data?.status || updatedShipment.data?.Status;
      
      res.json({
        success: true,
        shipmentId,
        oldStatus: currentStatus,
        newStatus: newStatus,
        updateResult: result
      });
      
    } catch (error: any) {
      logger.error('[CUSTOMS TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }
);

export default router;


/**
 * POST /api/v1/customs/declaration/:declarationId/review
 * Schedule inspection and assign customs officer
 */
router.post('/declaration/:declarationId/review',
  authMiddleware,
  param('declarationId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { assignedInspector, scheduledDate, priorityLevel, location, inspectionType, inspectorNotes } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Scheduling inspection for declaration ${declarationId} by ${user.username}`);

      // Use the assigned inspector's username directly (no more mapping)
      const officerName = assignedInspector || user.username || 'Customs Officer';

      // Update declaration with assigned officer and status
      await postgresDb.run(
        `UPDATE customs_declarations 
         SET customs_officer = $1, status = $2, updated_at = NOW() 
         WHERE declaration_number = $3`,
        [officerName, 'UNDER_INSPECTION', declarationId]
      );

      logger.info(`[CUSTOMS] Declaration ${declarationId} updated: officer=${officerName}, status=UNDER_INSPECTION`);

      res.json({
        success: true,
        data: {
          declarationId,
          status: 'UNDER_INSPECTION',
          assignedOfficer: officerName,
          message: 'Inspection scheduled successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error scheduling inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Complete inspection and move declaration to UNDER_REVIEW status
 */
router.post('/declaration/:declarationId/complete-inspection',
  authMiddleware,
  param('declarationId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { inspectionResult, inspectorComments, completedDate } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Completing inspection for declaration ${declarationId} by ${user.username}`);

      // Update declaration status to UNDER_REVIEW after inspection
      await postgresDb.run(
        `UPDATE customs_declarations 
         SET status = $1, updated_at = NOW() 
         WHERE declaration_number = $2`,
        ['UNDER_REVIEW', declarationId]
      );

      logger.info(`[CUSTOMS] ✅ Declaration ${declarationId} inspection completed: status=UNDER_REVIEW`);

      res.json({
        success: true,
        data: {
          declarationId,
          status: 'UNDER_REVIEW',
          inspectionResult: inspectionResult || 'PASSED',
          message: 'Inspection completed successfully. Declaration moved to UNDER_REVIEW for final clearance.'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error completing inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);


/**
 * POST /api/v1/customs/declaration/:declarationId/clear
 * Clear a customs declaration (final approval)
 */
router.post('/declaration/:declarationId/clear',
  authMiddleware,
  param('declarationId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { 
        clearanceNumber, 
        clearedBy, 
        clearanceDate,
        clearanceType,
        exportDuty,
        vatAmount,
        exitPoint,
        validityPeriod,
        transportMode,
        finalDestinationPort,
        estimatedDepartureDate,
        containerNumber,
        sealNumber,
        shippingLine,
        clearanceRemarks,
        officerNotes
      } = req.body;
      
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Clearing declaration ${declarationId} by ${user.username}`);

      // Update declaration status to CLEARED
      await postgresDb.run(
        `UPDATE customs_declarations 
         SET status = $1, customs_officer = $2, updated_at = NOW() 
         WHERE declaration_number = $3`,
        ['CLEARED', clearedBy || user.username, declarationId]
      );

      // Get shipment ID from declaration
      const declaration = await postgresDb.get(
        `SELECT shipment_id FROM customs_declarations WHERE declaration_number = $1`,
        [declarationId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Declaration not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Store clearance record with duty and tax amounts
      const clearanceID = clearanceNumber || `CLR-${Date.now()}`;
      await postgresDb.run(
        `INSERT INTO customs_clearances (
          clearance_id, shipment_id, clearance_number, status, cleared_by, cleared_date,
          duty_amount, tax_amount, exit_point, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          clearanceID, 
          declaration.shipment_id, 
          clearanceNumber, 
          'CLEARED',
          clearedBy || user.username, 
          clearanceDate || new Date().toISOString(),
          exportDuty || 0,
          vatAmount || 0,
          exitPoint || null,
          clearanceRemarks || null
        ]
      );

      // ✅ Record clearance on blockchain
      try {
        const auditService = require('../services/auditService').default;
        await auditService.recordAudit({
          entityType: 'CUSTOMS_CLEARANCE',
          entityId: clearanceID,
          actionType: 'CLEAR',
          actionBy: user.username,
          organizationMSP: 'CustomsMSP',
          details: {
            declarationId,
            shipmentID: declaration.shipment_id,
            clearanceNumber,
            exportDuty: exportDuty || 0,
            vatAmount: vatAmount || 0,
            exitPoint: exitPoint || null
          },
          timestamp: new Date()
        });
        logger.info(`✅ Customs clearance recorded on blockchain: ${clearanceID}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record clearance on blockchain (non-fatal):`, blockchainErr);
      }

      logger.info(`[CUSTOMS] ✅ Declaration ${declarationId} cleared successfully with clearance ${clearanceNumber}`);

      // Update shipment status to CUSTOMS_CLEARED on blockchain
      if (declaration.shipment_id) {
        logger.info(`[CUSTOMS] 🚢 Updating shipment ${declaration.shipment_id} to CUSTOMS_CLEARED on blockchain`);
        
        try {
          // Connect as CustomsMSP to have authority to update shipment status
          await fabricService.connectAsOrg('CustomsMSP');
          logger.info(`[CUSTOMS] Connected as CustomsMSP`);
          
          // First verify the shipment exists on blockchain
          const shipmentCheck = await fabricService.queryChaincode('ReadShipment', [declaration.shipment_id]);
          
          if (!shipmentCheck.success || !shipmentCheck.data) {
            logger.error(`[CUSTOMS] ❌ Shipment ${declaration.shipment_id} not found on blockchain!`);
            logger.error(`[CUSTOMS] Shipment check result:`, JSON.stringify(shipmentCheck));
          } else {
            const currentStatus = shipmentCheck.data.status || shipmentCheck.data.Status;
            logger.info(`[CUSTOMS] Current blockchain status: ${currentStatus}`);
            
            // Use direct chaincode invocation to update status
            // CustomsMSP has authority to set CUSTOMS_CLEARED directly
            const result = await fabricService.invokeChaincode('UpdateShipmentStatus', [
              declaration.shipment_id,
              'CUSTOMS_CLEARED'
            ]);
            
            if (result.success) {
              logger.info(`[CUSTOMS] ✅ Shipment ${declaration.shipment_id} status updated to CUSTOMS_CLEARED on blockchain`);
              
              // Also record the full clearance details to blockchain for audit
              try {
                // Get full declaration data
                const fullDeclaration = await postgresDb.get(
                  `SELECT * FROM customs_declarations WHERE declaration_number = $1`,
                  [declarationId]
                );
                
                const clearanceData = {
                  clearanceID,
                  clearanceNumber: clearanceNumber || clearanceID,
                  declarationNumber: declarationId,
                  shipmentID: declaration.shipment_id,
                  status: 'CLEARED',
                  clearedBy: clearedBy || user.username,
                  clearedDate: clearanceDate || new Date().toISOString(),
                  customsValueUSD: fullDeclaration?.customs_value_usd || 0,
                  quantity: fullDeclaration?.quantity || 0,
                  currency: fullDeclaration?.currency || 'USD',
                  dutyAmount: exportDuty || 0,
                  taxAmount: vatAmount || 0,
                  totalFees: (exportDuty || 0) + (vatAmount || 0),
                  exitPoint: exitPoint || null,
                  transportMode: transportMode || null,
                  finalDestinationPort: finalDestinationPort || null,
                  remarks: clearanceRemarks || null,
                  timestamp: new Date().toISOString()
                };
                
                // Store clearance details on blockchain using a metadata update
                const metadataResult = await fabricService.invokeChaincode('UpdateShipmentMetadata', [
                  declaration.shipment_id,
                  JSON.stringify({
                    customsClearance: clearanceData
                  })
                ]);
                
                if (metadataResult.success) {
                  logger.info(`[CUSTOMS] ✅ Clearance details recorded to blockchain`);
                } else {
                  logger.warn(`[CUSTOMS] ⚠️ Could not record clearance details to blockchain:`, metadataResult.error);
                }
              } catch (metadataError: any) {
                logger.warn(`[CUSTOMS] ⚠️ Exception recording clearance details:`, metadataError.message);
                // Continue - main status update succeeded
              }
              
              // Verify the update worked
              const verifyCheck = await fabricService.queryChaincode('ReadShipment', [declaration.shipment_id]);
              const newStatus = verifyCheck.data?.status || verifyCheck.data?.Status;
              logger.info(`[CUSTOMS] ✅ Verified new blockchain status: ${newStatus}`);
            } else {
              logger.error(`[CUSTOMS] ❌ Failed to update shipment status:`, result.error);
            }
          }
        } catch (shipmentError: any) {
          logger.error(`[CUSTOMS] ❌ Exception updating shipment status:`, shipmentError);
          logger.error(`[CUSTOMS] Error stack:`, shipmentError.stack);
          // Continue even if blockchain update fails - clearance is recorded in DB
        }
      } else {
        logger.warn(`[CUSTOMS] ⚠️ No shipment_id found for declaration ${declarationId}`);
      }

      res.json({
        success: true,
        data: {
          declarationId,
          clearanceNumber,
          shipmentID: declaration.shipment_id,
          status: 'CLEARED',
          clearedBy: clearedBy || user.username,
          message: 'Declaration cleared successfully',
          debug: {
            shipmentIdFound: !!declaration.shipment_id,
            shipmentIdValue: declaration.shipment_id
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error clearing declaration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);
