import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { CustomsService } from '../services/customsService';
import { ShipmentService } from '../services/shipmentService';
import { logger } from '../utils/logger';
import notificationService from '../services/notificationService';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();
const customsService = CustomsService.getInstance();
const shipmentService = ShipmentService.getInstance();

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
 * POST /api/v1/customs — Submit customs declaration (wrapper endpoint)
 */
router.post('/',
  authMiddleware,
  requireRole('EXPORTER', 'CUSTOMS', 'CUSTOMS_ADMIN', 'ECTA', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const {
        customsID,
        shipmentID,
        exporterID,
        hsCode,
        quantity,
        value,
        currency,
        destination,
        status
      } = req.body;

      logger.info(`[CUSTOMS] 📝 Submitting customs declaration: ${customsID}`);

      const declarationNumber = customsID || req.body.declarationNumber || `CD-${Date.now()}`;
      const shipmentId = shipmentID || req.body.shipmentId || '';
      const exporterId = exporterID || req.body.exporterId || '';
      const contractId = req.body.contractID || req.body.contractId || '';

      if (!declarationNumber || !shipmentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: customsID, shipmentID',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // ⚠️ WRITE TO COUCHDB DIRECTLY to bypass blockchain propagation delays
      logger.info(`[CUSTOMS] Writing declaration ${declarationNumber} directly to CouchDB`);
      
      const customsDoc = {
        _id: `customs:${declarationNumber}`,
        docType: 'customs',
        declarationNumber,
        shipmentID: shipmentId,
        contractID: contractId,
        exporterID: exporterId,
        hsCode: hsCode || '0901.21',
        quantity: quantity || 10000,
        value: value || 85000,
        currency: currency || 'USD',
        destination: destination || 'Germany',
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'SUBMITTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const couchDbUrl = process.env.COUCHDB_URL || 'http://couchdb.ecta:5984';
        const axios = require('axios');
        await axios.put(
          `${couchDbUrl}/coffeechannel_coffee/${customsDoc._id}`,
          customsDoc,
          {
            auth: { username: 'admin', password: 'adminpw' },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        logger.info(`✅ [CUSTOMS] Declaration ${declarationNumber} written to CouchDB`);
      } catch (couchError: any) {
        if (couchError.response?.status === 409) {
          logger.warn(`[CUSTOMS] Declaration ${declarationNumber} already exists in CouchDB (409 conflict)`);
        } else {
          throw couchError;
        }
      }

      // Insert to PostgreSQL
      await postgresDb.run(
        `INSERT INTO customs_declarations (
          declaration_id, declaration_number, shipment_id, contract_id, exporter_id,
          hs_code, quantity, declared_value, currency, destination, submitted_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (declaration_id) DO NOTHING`,
        [declarationNumber, declarationNumber, shipmentId, contractId, exporterId,
         hsCode || '0901.21', quantity || 10000, value || 85000, currency || 'USD',
         destination || 'Germany', new Date().toISOString().split('T')[0], 'SUBMITTED']
      );

      logger.info(`✅ [CUSTOMS] Declaration submitted: ${declarationNumber}`);
      res.status(201).json({
        success: true,
        message: 'Customs declaration submitted successfully',
        data: { customsID: declarationNumber, declarationNumber, status: 'SUBMITTED' },
        txId: null,
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
 * GET /api/v1/customs/declarations
 * Get all customs declarations (for checking which shipments have declarations)
 * Supports filtering by status query parameter
 */
router.get('/declarations',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      logger.info(`[CUSTOMS] Fetching customs declarations${status ? ` with status=${status}` : ''}`);

      // Build query with optional status filter
      let query = `SELECT 
          declaration_number, 
          shipment_id, 
          contract_id,
          exporter_id,
          declaration_type,
          hs_code,
          quantity,
          customs_value_usd,
          duty_amount,
          currency,
          destination,
          port_of_exit,
          eudr_compliant,
          additional_notes,
          status,
          customs_officer,
          inspection_required,
          duty_paid,
          clearance_date,
          blockchain_tx_id,
          created_at,
          updated_at
        FROM customs_declarations`;
      
      const params: any[] = [];
      if (status) {
        query += ` WHERE UPPER(status) = UPPER($1)`;
        params.push(status);
      }
      
      query += ` ORDER BY created_at DESC`;

      const declarations = await postgresDb.all(query, params);

      logger.info(`[CUSTOMS] Found ${declarations.length} declarations`);

      // Map to camelCase for frontend
      const mappedDeclarations = declarations.map((d: any) => ({
        declarationId: d.declaration_number,
        declarationNumber: d.declaration_number,
        shipmentId: d.shipment_id,
        shipmentID: d.shipment_id,
        contractId: d.contract_id,
        contractID: d.contract_id,
        exporterId: d.exporter_id,
        exporterID: d.exporter_id,
        declarationType: d.declaration_type,
        hsCode: d.hs_code,
        quantity: parseFloat(d.quantity || 0),
        value: parseFloat(d.customs_value_usd || 0),
        customsValueUSD: parseFloat(d.customs_value_usd || 0),
        dutyAmount: parseFloat(d.duty_amount || 0),
        currency: d.currency,
        destination: d.destination,
        portOfExit: d.port_of_exit,
        eudrCompliant: d.eudr_compliant,
        additionalNotes: d.additional_notes,
        status: d.status,
        customsOfficer: d.customs_officer,
        inspectionRequired: d.inspection_required,
        dutyPaid: d.duty_paid,
        clearanceDate: d.clearance_date,
        blockchainTxId: d.blockchain_tx_id,
        submissionDate: d.created_at,
        createdAt: d.created_at,
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
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
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

      logger.info(`✅ Risk assessment created: ${assessmentID} for shipment ${shipmentID}`);

      // Persist to database
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
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
  [body('shipmentID').notEmpty(), body('clearanceNumber').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentID, clearanceNumber, status, clearedBy, clearedDate } = req.body;
      const clearanceID = `CLR-${Date.now()}`;
      const user = (req as any).user;

      // ✅ Record clearance (skip audit for now - testing mode)
      logger.info(`✅ Customs clearance created: ${clearanceID} for shipment ${shipmentID}`);

      // Persist to database
      await postgresDb.run(
        `INSERT INTO customs_clearances (
          clearance_id, shipment_id, clearance_number, status, cleared_by, cleared_date
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [clearanceID, shipmentID, clearanceNumber, status || 'SUBMITTED',
         clearedBy || user?.username || 'system', clearedDate || new Date().toISOString()]
      );

      res.json({
        success: true,
        data: { 
          clearanceID, 
          clearanceNumber, 
          status: status || 'SUBMITTED',
          id: clearanceID
        },
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

      // Normalize field names for frontend
      const normalizedClearances = clearances.map((c: any) => ({
        clearanceID: c.clearance_id,
        clearanceId: c.clearance_id,
        clearanceNumber: c.clearance_number,
        shipmentID: c.shipment_id,
        shipmentId: c.shipment_id,
        declarationNumber: c.declaration_number,
        status: c.status,
        clearedBy: c.cleared_by,
        clearedDate: c.cleared_date,
        dutyAmount: c.duty_amount,
        taxAmount: c.tax_amount,
        exitPoint: c.exit_point,
        remarks: c.remarks,
        customsValueUSD: c.customs_value_usd,
        quantity: c.quantity,
        currency: c.currency,
        hsCode: c.hs_code,
        destination: c.destination,
        portOfExit: c.port_of_exit,
        declarationType: c.declaration_type,
        eudrCompliant: c.eudr_compliant,
        blockchainTxId: c.blockchain_tx_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));

      res.json({ 
        success: true, 
        data: normalizedClearances,
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

// Alias: GET /api/v1/customs/clearance (singular) - returns same as /clearances
router.get('/clearance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    // First check if customs_clearances table exists
    const tableCheck = await postgresDb.get(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customs_clearances'
      )`
    );
    
    if (!tableCheck?.exists) {
      return res.json({ 
        success: true, 
        data: [],
        message: 'Customs clearances table not initialized',
        timestamp: new Date().toISOString() 
      });
    }
    
    // Check which columns exist
    const columns = await postgresDb.all(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'customs_clearances'`
    );
    const columnNames = columns.map((c: any) => c.column_name);
    const hasVat = columnNames.includes('vat_amount');
    const hasDuty = columnNames.includes('duty_amount');
    
    let query = `
      SELECT 
        cc.clearance_id,
        cc.clearance_number,
        cc.shipment_id,
        cc.status,
        cc.cleared_by,
        cc.cleared_date,
        ${hasDuty ? 'cc.duty_amount,' : '0 as duty_amount,'}
        ${hasVat ? 'cc.vat_amount,' : '0 as vat_amount,'}
        cc.created_at,
        cd.declaration_number,
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

    const normalizedClearances = clearances.map((c: any) => ({
      clearanceID: c.clearance_id,
      clearanceId: c.clearance_id,
      clearanceNumber: c.clearance_number,
      shipmentID: c.shipment_id,
      shipmentId: c.shipment_id,
      status: c.status,
      clearedBy: c.cleared_by,
      clearedDate: c.cleared_date,
      dutyAmount: c.duty_amount,
      vatAmount: c.vat_amount,
      declarationNumber: c.declaration_number,
      declarationType: c.declaration_type,
      eudrCompliant: c.eudr_compliant,
      createdAt: c.created_at
    }));

    res.json({ 
      success: true, 
      data: normalizedClearances,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    logger.error('[CUSTOMS] Clearance query error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/customs/permit-ready
 * Returns all shipments that have received export permits from ECTA Quality Control
 * Status: permit_issued means ECTA has issued the export permit
 */
router.get('/permit-ready',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      logger.info('[CUSTOMS] Fetching permit-ready shipments (status=PERMIT_ISSUED)');
      
      // Fetch all inspections with status 'PERMIT_ISSUED'
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
        WHERE qi.status = 'PERMIT_ISSUED'
          AND cd.declaration_number IS NULL
        ORDER BY qi.updated_at DESC, qi.created_at DESC
      `);
      
      logger.info(`[CUSTOMS] Found ${inspections.length} quality inspections with PERMIT_ISSUED status (excluding already declared)`);
      
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
          contract_id,
          exporter_id,
          declaration_type,
          hs_code,
          quantity,
          customs_value_usd,
          duty_amount,
          currency,
          destination,
          port_of_exit,
          eudr_compliant,
          additional_notes,
          status,
          customs_officer,
          inspection_required,
          duty_paid,
          clearance_date,
          blockchain_tx_id,
          created_at,
          updated_at
        FROM customs_declarations 
        ORDER BY created_at DESC`
      );

      logger.info(`[CUSTOMS] Found ${declarations.length} declarations`);

      // Map to camelCase for frontend
      const mappedDeclarations = declarations.map((d: any) => ({
        declarationId: d.declaration_number,
        declarationNumber: d.declaration_number,
        shipmentId: d.shipment_id,
        shipmentID: d.shipment_id,
        contractId: d.contract_id,
        contractID: d.contract_id,
        exporterId: d.exporter_id,
        exporterID: d.exporter_id,
        declarationType: d.declaration_type,
        hsCode: d.hs_code,
        quantity: parseFloat(d.quantity || 0),
        value: parseFloat(d.customs_value_usd || 0),
        customsValueUSD: parseFloat(d.customs_value_usd || 0),
        dutyAmount: parseFloat(d.duty_amount || 0),
        currency: d.currency,
        destination: d.destination,
        portOfExit: d.port_of_exit,
        eudrCompliant: d.eudr_compliant,
        additionalNotes: d.additional_notes,
        status: d.status,
        customsOfficer: d.customs_officer,
        inspectionRequired: d.inspection_required,
        dutyPaid: d.duty_paid,
        clearanceDate: d.clearance_date,
        blockchainTxId: d.blockchain_tx_id,
        submissionDate: d.created_at,
        createdAt: d.created_at,
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
  requireRole('EXPORTER', 'CUSTOMS', 'CUSTOMS_ADMIN', 'ECTA', 'ECTA_ADMIN'),
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
        contractID: contractIdUpper,
        contractId: contractIdLower,
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

      // F-7: a REJECTED (or CANCELLED) declaration is terminal and no
      // longer blocks a fresh declaration for the same shipment — the
      // old behaviour blocked every re-submit with DECLARATION_EXISTS
      // and left the shipment stuck at CUSTOMS_REJECTED. Any live
      // declaration (SUBMITTED / UNDER_INSPECTION / UNDER_REVIEW /
      // CLEARED) still blocks, as before. The declaration_number match
      // is included so a resubmission that reuses an old ID fails fast
      // below instead of as a 503 from the chain call.
      const existingDeclarations = await postgresDb.all(
        `SELECT declaration_number, shipment_id, status FROM customs_declarations
         WHERE shipment_id = $1 OR declaration_number = $2
         ORDER BY created_at DESC`,
        [shipmentID, declarationID]
      );
      const shipmentDeclarations = existingDeclarations.filter((d: any) => d.shipment_id === shipmentID);
      const liveDeclaration = shipmentDeclarations.find((d: any) =>
        !['REJECTED', 'CANCELLED'].includes(String(d.status || '').toUpperCase())
      );

      if (liveDeclaration) {
        logger.warn(`[CUSTOMS] Declaration for shipment ${shipmentID} already exists (${liveDeclaration.declaration_number}, status ${liveDeclaration.status})`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'DECLARATION_EXISTS',
            message: 'A customs declaration has already been submitted for this shipment. Please contact customs if you need to update it.'
          },
          timestamp: new Date().toISOString()
        });
      }

      // The ledger keys declarations by DECL_<declarationID> and refuses
      // a reused ID, so a resubmission MUST use a new declaration ID —
      // fail fast with a 400 instead of letting the chain call fail
      // with a 503 (the f258dc0e chain-failure behaviour below is
      // preserved for genuine ledger refusals).
      if (existingDeclarations.some((d: any) => d.declaration_number === declarationID)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DECLARATION_ID_REUSED',
            message: `Declaration ID ${declarationID} was already used. Submit the corrected declaration with a new declaration ID.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // The resubmission supersedes this rejected declaration (its row
      // stays REJECTED for history).
      const supersededDeclaration = shipmentDeclarations.find((d: any) =>
        String(d.status || '').toUpperCase() === 'REJECTED'
      );
      const isResubmission = !!supersededDeclaration;

      // Chaincode sync is ledger-first, not best-effort: the Postgres
      // SUBMITTED row must only exist for a declaration the ledger
      // accepted. A failed chain call returns 503 and inserts nothing —
      // the old behaviour kept a PG SUBMITTED row and returned
      // success:true for a declaration that does not exist on-chain
      // (W2 run 3, step 5b), which then blocked any re-submit via the
      // DECLARATION_EXISTS guard. The guard above now admits a
      // resubmission when every prior declaration for the shipment is
      // REJECTED/CANCELLED; the chaincode admits it too (customs.go
      // SubmitCustomsDeclaration allows a CUSTOMS_REJECTED shipment).
      let blockchainResult: any = null;
      let blockchainError: string | null = null;
      try {
        blockchainResult = await fabricService.invokeChaincode(
          'SubmitCustomsDeclaration',
          [
            declarationID,
            shipmentID,
            exporterID,
            declarationType || 'STANDARD',
            hsCode || '090111',
            String(quantity || 0),
            String(value || 0),
            currency || 'USD',
            destination || 'Unknown',
            portOfExit || 'Djibouti Port',
            String(eudrCompliant || false)
          ]
        );
        if (!blockchainResult?.success) {
          blockchainError = blockchainResult?.error || 'Chaincode call did not succeed';
        }
      } catch (chainError: any) {
        blockchainError = chainError?.message || 'Chaincode call failed';
        blockchainResult = null;
      }
      const blockchainSynced = !blockchainError && blockchainResult?.success === true;
      // Only a ledger-confirmed txId may be stored or returned. A txId the
      // client generated for a proposal that was never endorsed is not one.
      const blockchain_tx_id = blockchainSynced ? (blockchainResult?.txId || null) : null;
      if (!blockchainSynced) {
        logger.warn(`[CUSTOMS] Declaration ${declarationID} NOT recorded on blockchain, no PG row written: ${blockchainError}`);
        return res.status(503).json({
          success: false,
          error: {
            code: 'CUSTOMS_SUBMIT_FAILED',
            message: `Customs declaration ${declarationID} could not be recorded on the ledger: ${blockchainError}. No status change was recorded.`
          },
          data: { declarationID, shipmentID, blockchainSynced: false, blockchainError },
          timestamp: new Date().toISOString()
        });
      }
      logger.info(`✅ Customs declaration recorded on blockchain: ${declarationID}, TX: ${blockchain_tx_id}`);

      // Now persist to database with blockchain TX ID
      await postgresDb.run(
        `INSERT INTO customs_declarations (
          declaration_id, declaration_number, shipment_id, contract_id, exporter_id,
          declaration_type, hs_code, quantity, customs_value_usd, currency,
          destination, port_of_exit, eudr_compliant, additional_notes, status,
          inspection_required, blockchain_tx_id, created_at
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
        [
          declarationID,
          shipmentID,
          contractIdUpper || contractIdLower || null,
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
          true,
          blockchain_tx_id
        ]
      );

      logger.info(`[CUSTOMS] Declaration ${declarationID} submitted successfully with status SUBMITTED`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'customs_submitted',
        title: `Customs declaration ${declarationID} submitted`,
        message: `Customs declaration ${declarationID} was submitted for shipment ${shipmentID}.`,
        entityType: 'customs_declaration', entityId: declarationID, severity: 'info',
        roles: ['CUSTOMS'], exporterId: exporterID,
        actionUrl: '/portals/exporter?tab=customs',
        actionUrls: { CUSTOMS: '/portals/customs?tab=customs' },
      });

      // F-7: the ledger cascade moves the shipment PERMIT_ISSUED (or
      // CUSTOMS_REJECTED on a resubmission) -> CUSTOMS_DECLARED on
      // submit (customs.go SubmitCustomsDeclaration); mirror it in
      // Postgres so the shipment leaves CUSTOMS_REJECTED in the portals
      // too. Best-effort: the declaration is already committed — a
      // mirror failure must not turn a successful submit into an error.
      try {
        await postgresDb.run(
          `UPDATE shipments SET status = 'CUSTOMS_DECLARED', updated_at = CURRENT_TIMESTAMP WHERE shipment_id = $1`,
          [shipmentID]
        );
      } catch (mirrorError) {
        logger.warn(`[CUSTOMS] Shipment ${shipmentID} PG mirror to CUSTOMS_DECLARED failed after declaration ${declarationID} committed:`, mirrorError);
      }

      res.json({
        success: true,
        data: {
          declarationID,
          shipmentID,
          status: 'SUBMITTED',
          resubmission: isResubmission,
          supersededDeclarationId: supersededDeclaration?.declaration_number || null,
          blockchain_tx_id,
          blockchainSynced,
          blockchainError,
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
  requireRole('ADMIN'),
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

      // O-1: mirror the chain status move in Postgres. Test endpoint or
      // not, the ledger status changed — the PG row must follow it.
      // Best-effort: the mirror never fails this request.
      if (result.success) {
        await shipmentService.mirrorShipmentStatus(shipmentId, 'CUSTOMS_CLEARED');
      }
      
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

/**
 * GET /customs/declarations/:declarationID
 * Get a specific customs declaration by ID
 * @access Authenticated
 */
router.get('/declarations/:declarationID',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { declarationID } = req.params;
      
      logger.info(`[CUSTOMS] Fetching declaration: ${declarationID}`);
      
      const declaration = await postgresDb.get(
        `SELECT cd.*, cc.clearance_number, cc.duty_amount, cc.cleared_by, cc.cleared_date
         FROM customs_declarations cd
         LEFT JOIN customs_clearances cc ON cd.shipment_id = cc.shipment_id
         WHERE cd.declaration_number = $1`,
        [declarationID]
      );
      
      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Declaration ${declarationID} not found` },
          timestamp: new Date().toISOString()
        });
      }
      
      // Normalize field names
      const normalized = {
        declarationID: declaration.declaration_number,
        declarationId: declaration.declaration_number,
        declarationNumber: declaration.declaration_number,
        shipmentID: declaration.shipment_id,
        contractID: declaration.contract_id,
        exporterID: declaration.exporter_id,
        declarationType: declaration.declaration_type,
        hsCode: declaration.hs_code,
        description: declaration.description,
        quantity: declaration.quantity,
        value: declaration.customs_value_usd,
        customsValueUSD: declaration.customs_value_usd,
        currency: declaration.currency,
        destination: declaration.destination,
        destinationCountry: declaration.destination_country || declaration.destination,
        portOfExit: declaration.port_of_exit,
        eudrCompliant: declaration.eudr_compliant,
        additionalNotes: declaration.additional_notes,
        status: declaration.status,
        clearanceNumber: declaration.clearance_number,
        dutiesAmount: declaration.duty_amount,
        dutyPaid: declaration.duty_paid,
        clearedBy: declaration.cleared_by,
        clearedDate: declaration.cleared_date,
        clearanceDate: declaration.clearance_date,
        customsOfficer: declaration.customs_officer,
        inspectionRequired: declaration.inspection_required,
        inspectionNotes: declaration.inspection_notes,
        createdAt: declaration.created_at,
        updatedAt: declaration.updated_at,
        blockchainTxId: declaration.blockchain_tx_id
      };
      
      res.json({
        success: true,
        data: normalized,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      logger.error('[CUSTOMS] Error fetching declaration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/customs/risk-rules
 * Get customs risk assessment rules configuration
 * Used by RiskRulesManager for displaying and managing risk assessment criteria
 */
router.get('/risk-rules', authMiddleware, async (req, res) => {
  try {
    logger.info('[CUSTOMS] 📋 Fetching risk assessment rules...');
    
    // Return risk assessment rules configuration
    // This can be stored in database or configuration file
    const riskRules = {
      highRiskCountries: [
        'Country with sanctions',
        'High-risk jurisdictions'
      ],
      valueThresholds: {
        automatic_inspection: 100000, // USD - trigger automatic inspection
        enhanced_scrutiny: 500000,    // USD - require enhanced due diligence
        senior_approval: 1000000      // USD - require senior officer approval
      },
      redFlags: [
        {
          id: 'rf001',
          category: 'Documentation',
          description: 'Missing or incomplete export documentation',
          riskLevel: 'HIGH',
          action: 'MANDATORY_INSPECTION'
        },
        {
          id: 'rf002',
          category: 'Compliance',
          description: 'Exporter history of non-compliance',
          riskLevel: 'HIGH',
          action: 'ENHANCED_REVIEW'
        },
        {
          id: 'rf003',
          category: 'Value',
          description: 'Declared value significantly differs from market rate',
          riskLevel: 'MEDIUM',
          action: 'VALUE_VERIFICATION'
        },
        {
          id: 'rf004',
          category: 'Origin',
          description: 'Questionable origin documentation',
          riskLevel: 'HIGH',
          action: 'ORIGIN_VERIFICATION'
        },
        {
          id: 'rf005',
          category: 'Quality',
          description: 'Quality certification missing or expired',
          riskLevel: 'MEDIUM',
          action: 'QUALITY_INSPECTION'
        }
      ],
      inspectionTriggers: {
        first_time_exporter: true,
        high_value_shipment: true,
        high_risk_destination: true,
        previous_discrepancies: true,
        random_selection: true, // 10% of all shipments
        random_selection_rate: 0.1
      },
      complianceChecks: [
        'Export license validation',
        'Phytosanitary certificate verification',
        'Quality inspection certificate',
        'Origin certificate',
        'Customs declaration completeness',
        'Payment documentation',
        'LC documentation (if applicable)'
      ]
    };
    
    logger.info('[CUSTOMS] ✅ Risk rules fetched successfully');
    
    res.json({
      success: true,
      data: riskRules,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[CUSTOMS] ❌ Error fetching risk rules:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== CUSTOMS EXTENDED OPERATIONS ====================

/**
 * PUT /api/v1/customs/declaration/:declarationId/amend
 * Amend customs declaration before clearance
 * Allows corrections to declarations that haven't been cleared yet
 */
router.put('/declaration/:declarationId/amend',
  authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN', 'EXPORTER'),
  [
    param('declarationId').notEmpty().withMessage('Declaration ID is required'),
    body('amendmentReason').notEmpty().withMessage('Amendment reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const {
        amendmentReason,
        newQuantity,
        newCustomsValueUSD,
        newHsCode,
        newDescription,
        newDestination,
        additionalDocuments
      } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Amending declaration: ${declarationId}`);

      // Get current declaration
      const currentDeclaration = await postgresDb.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
        [declarationId]
      );

      if (!currentDeclaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'DECLARATION_NOT_FOUND', message: 'Declaration not found' },
          timestamp: new Date().toISOString()
        });
      }

      // Check if declaration can be amended (not yet cleared)
      if (['CLEARED', 'REJECTED'].includes(currentDeclaration.status)) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'AMENDMENT_NOT_ALLOWED', 
            message: `Cannot amend declaration with status: ${currentDeclaration.status}` 
          },
          timestamp: new Date().toISOString()
        });
      }

      const amendmentId = `AMD-${declarationId}-${Date.now()}`;

      // Record amendment
      await postgresDb.run(`
        INSERT INTO declaration_amendments (
          amendment_id, declaration_id, amendment_reason, amended_by,
          old_quantity, new_quantity, old_value, new_value,
          old_hs_code, new_hs_code, old_description, new_description,
          old_destination, new_destination, additional_documents,
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      `, [
        amendmentId,
        currentDeclaration.declaration_id || declarationId,
        amendmentReason,
        user.username,
        currentDeclaration.quantity,
        newQuantity || currentDeclaration.quantity,
        currentDeclaration.customs_value_usd,
        newCustomsValueUSD || currentDeclaration.customs_value_usd,
        currentDeclaration.hs_code,
        newHsCode || currentDeclaration.hs_code,
        currentDeclaration.description,
        newDescription || currentDeclaration.description,
        currentDeclaration.destination,
        newDestination || currentDeclaration.destination,
        additionalDocuments || '',
        'APPROVED'
      ]);

      // Update declaration with amendments
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (newQuantity) {
        updates.push(`quantity = $${paramIndex++}`);
        values.push(newQuantity);
      }
      if (newCustomsValueUSD) {
        updates.push(`customs_value_usd = $${paramIndex++}`);
        values.push(newCustomsValueUSD);
      }
      if (newHsCode) {
        updates.push(`hs_code = $${paramIndex++}`);
        values.push(newHsCode);
      }
      if (newDescription) {
        updates.push(`description = $${paramIndex++}`);
        values.push(newDescription);
      }
      if (newDestination) {
        updates.push(`destination = $${paramIndex++}`);
        values.push(newDestination);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(currentDeclaration.declaration_id || declarationId);
        
        await postgresDb.run(
          `UPDATE customs_declarations SET ${updates.join(', ')} WHERE declaration_id = $${paramIndex} OR declaration_number = $${paramIndex}`,
          values
        );
      }

      logger.info(`✅ [CUSTOMS] Declaration amended: ${declarationId} - ${amendmentId}`);

      res.json({
        success: true,
        data: {
          amendmentId,
          declarationId: currentDeclaration.declaration_id || declarationId,
          amendmentReason,
          status: 'APPROVED',
          amendedFields: {
            quantity: newQuantity,
            customsValueUSD: newCustomsValueUSD,
            hsCode: newHsCode,
            description: newDescription,
            destination: newDestination
          }
        },
        message: 'Declaration amended successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[CUSTOMS] Error amending declaration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AMENDMENT_FAILED', message: 'Failed to amend declaration' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * DELETE /api/v1/customs/declaration/:declarationId/cancel
 * Cancel customs declaration before processing
 */
router.delete('/declaration/:declarationId/cancel',
  authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN', 'EXPORTER'),
  [
    param('declarationId').notEmpty().withMessage('Declaration ID is required'),
    body('cancellationReason').notEmpty().withMessage('Cancellation reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { cancellationReason, cancelledBy } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Cancelling declaration: ${declarationId}`);

      // Check if declaration exists and can be cancelled
      const declaration = await postgresDb.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
        [declarationId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'DECLARATION_NOT_FOUND', message: 'Declaration not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (['CLEARED', 'INSPECTION_COMPLETE'].includes(declaration.status)) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'CANCELLATION_NOT_ALLOWED', 
            message: `Cannot cancel declaration with status: ${declaration.status}` 
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update declaration status to CANCELLED
      await postgresDb.run(`
        UPDATE customs_declarations
        SET status = 'CANCELLED',
            cancellation_reason = $1,
            cancelled_by = $2,
            cancellation_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE declaration_id = $3 OR declaration_number = $3
      `, [
        cancellationReason,
        cancelledBy || user.username,
        declarationId
      ]);

      logger.info(`✅ [CUSTOMS] Declaration cancelled: ${declarationId}`);

      res.json({
        success: true,
        data: {
          declarationId: declaration.declaration_id || declarationId,
          status: 'CANCELLED',
          cancellationReason,
          cancelledBy: cancelledBy || user.username,
          cancellationDate: new Date().toISOString()
        },
        message: 'Declaration cancelled successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[CUSTOMS] Error cancelling declaration:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CANCELLATION_FAILED', message: 'Failed to cancel declaration' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/customs/declaration/:declarationId/calculate-duty
 * Calculate customs duty and taxes for declaration
 * Based on HS code, origin, value, and applicable rates
 */
router.post('/declaration/:declarationId/calculate-duty',
  authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
  [
    param('declarationId').notEmpty().withMessage('Declaration ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { 
        customsValueUSD, 
        hsCode, 
        origin, 
        destination,
        exchangeRate,
        applyPreferences 
      } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Calculating duty for declaration: ${declarationId}`);

      // The declaration row is always needed: duty_calculations.declaration_id
      // is a foreign key to customs_declarations(declaration_id), so the
      // stored declaration_id (not the request param, which may be a
      // declaration_number) must be used for the insert below.
      const declaration = await postgresDb.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
        [declarationId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'DECLARATION_NOT_FOUND', message: 'Declaration not found' },
          timestamp: new Date().toISOString()
        });
      }

      const declValue = customsValueUSD || declaration.customs_value_usd;
      const declHsCode = hsCode || declaration.hs_code;

      // Get duty rates from tariff table (or use default rates).
      // customs_tariffs stores rates as percentages (e.g. 10.00 = 10%), while
      // this handler calculates with fractions, so normalise anything > 1.
      const toFraction = (r: number) => (r > 1 ? r / 100 : r);
      const tariffRate = await postgresDb.get(
        'SELECT * FROM customs_tariffs WHERE hs_code = $1',
        [declHsCode]
      );

      // Default rates if not found in tariff table
      const dutyRate = toFraction(parseFloat(tariffRate?.duty_rate) || 0.10); // 10% default
      const vatRate = toFraction(parseFloat(tariffRate?.vat_rate) || 0.15); // 15% VAT
      const exciseRate = toFraction(parseFloat(tariffRate?.excise_rate) || 0);

      // Apply preferential rates if applicable (e.g., COMESA, AfCFTA).
      // NOTE: trade_preferences has no origin_country column (it keys on
      // country_group + hs_code), so the old origin lookup always errored.
      // Match on hs_code + active flag and take the lowest preferential rate.
      let effectiveDutyRate = dutyRate;
      let preference: any = null;
      if (applyPreferences) {
        preference = await postgresDb.get(
          `SELECT * FROM trade_preferences
            WHERE hs_code = $1 AND is_active = true
            ORDER BY preferential_rate ASC LIMIT 1`,
          [declHsCode]
        );
        if (preference) {
          effectiveDutyRate = toFraction(parseFloat(preference.preferential_rate) || dutyRate);
        }
      }

      // Calculate duties
      const valueInUSD = parseFloat(declValue);
      if (!Number.isFinite(valueInUSD) || valueInUSD <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_VALUE', message: 'A positive customs value is required to calculate duty' },
          timestamp: new Date().toISOString()
        });
      }
      const rate = exchangeRate || 125.50; // Default ETB/USD rate
      const valueInETB = valueInUSD * rate;

      const dutyAmount = valueInETB * effectiveDutyRate;
      const taxableValue = valueInETB + dutyAmount;
      const vatAmount = taxableValue * vatRate;
      const exciseAmount = valueInETB * exciseRate;
      const totalDuty = dutyAmount + vatAmount + exciseAmount;

      // Store calculation. Columns must match the table 068 creates
      // (068_add_customs_extended_tables.sql) — the old insert used the
      // columns of the deleted 060 .ts migration, which never ran, so it
      // failed with "column does not exist". calculated_by is INTEGER
      // REFERENCES users(id); req.user.userId is a string, parse it.
      const userIdInt = /^\d+$/.test(String(user?.userId || '')) ? parseInt(user.userId, 10) : null;
      const inserted = await postgresDb.run(`
        INSERT INTO duty_calculations (
          declaration_id, calculation_method, customs_value, currency,
          exchange_rate, basic_duty_rate, basic_duty_amount,
          vat_rate, vat_amount, excise_rate, excise_amount,
          total_duties, total_taxes, total_payable,
          preference_applied, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING calculation_id
      `, [
        declaration.declaration_id,
        preference ? 'preferential' : 'standard',
        valueInUSD,
        'USD',
        rate,
        effectiveDutyRate,
        dutyAmount,
        vatRate,
        vatAmount,
        exciseRate,
        exciseAmount,
        dutyAmount,
        vatAmount + exciseAmount,
        totalDuty,
        preference ? preference.agreement_name : null,
        userIdInt
      ]);
      const calculationId = inserted.rows[0].calculation_id;

      // Update declaration with calculated duty
      await postgresDb.run(`
        UPDATE customs_declarations
        SET duty_amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE declaration_id = $2
      `, [totalDuty, declaration.declaration_id]);

      logger.info(`✅ [CUSTOMS] Duty calculated: ${declarationId} - Total: ETB ${totalDuty.toFixed(2)}`);

      res.json({
        success: true,
        data: {
          calculationId,
          declarationId,
          customsValueUSD: valueInUSD,
          customsValueETB: valueInETB,
          exchangeRate: rate,
          hsCode: declHsCode,
          rates: {
            dutyRate: effectiveDutyRate,
            vatRate,
            exciseRate
          },
          amounts: {
            dutyAmount: Math.round(dutyAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            exciseAmount: Math.round(exciseAmount * 100) / 100,
            totalDuty: Math.round(totalDuty * 100) / 100
          },
          preferencesApplied: applyPreferences || false,
          calculationDate: new Date().toISOString()
        },
        message: 'Duty calculated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[CUSTOMS] Error calculating duty:', error);
      logger.error('[CUSTOMS] Error stack:', error.stack);
      logger.error('[CUSTOMS] Request params:', { declarationId: req.params.declarationId, body: req.body });
      res.status(500).json({
        success: false,
        error: { 
          code: 'CALCULATION_FAILED', 
          message: 'Failed to calculate duty',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/customs/declaration/:declarationId/valuation
 * Perform customs valuation adjustment
 * WTO Valuation Agreement - adjust declared value if needed
 */
router.post('/declaration/:declarationId/valuation',
  authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
  [
    param('declarationId').notEmpty().withMessage('Declaration ID is required'),
    body('valuationMethod').isIn(['TRANSACTION', 'IDENTICAL', 'SIMILAR', 'DEDUCTIVE', 'COMPUTED', 'FALLBACK']).withMessage('Invalid valuation method'),
    body('adjustedValue').isNumeric().withMessage('Adjusted value must be numeric'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const {
        valuationMethod,
        adjustedValue,
        adjustmentReason,
        basisOfValuation,
        comparableGoods,
        marketResearch,
        valuationOfficer,
        supportingDocuments
      } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Performing valuation for declaration: ${declarationId}`);

      // Get current declaration
      const declaration = await postgresDb.get(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
        [declarationId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'DECLARATION_NOT_FOUND', message: 'Declaration not found' },
          timestamp: new Date().toISOString()
        });
      }

      const declaredValue = parseFloat(declaration.customs_value_usd);
      if (!Number.isFinite(declaredValue) || declaredValue <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_VALUE', message: 'The declaration has no usable customs value to adjust' },
          timestamp: new Date().toISOString()
        });
      }
      const adjustedVal = parseFloat(adjustedValue);
      const adjustmentAmount = adjustedVal - declaredValue;
      const adjustmentPercentage = (adjustmentAmount / declaredValue) * 100;

      // Record valuation. Columns must match the table 068 creates
      // (068_add_customs_extended_tables.sql): valuation_id is a SERIAL
      // primary key, there is no declared_value / adjustment_amount /
      // basis_of_valuation / status column — the old insert failed with
      // "column does not exist". The extra request fields are preserved in
      // the adjustments JSONB and valuation_notes; valued_by is INTEGER
      // REFERENCES users(id), parsed from req.user.userId. approval_status
      // 'approved' is the 068 value for a completed valuation (the API
      // response still reports status 'COMPLETED' as before).
      const comparableNum = parseFloat(comparableGoods);
      const userIdInt = /^\d+$/.test(String(user?.userId || '')) ? parseInt(user.userId, 10) : null;
      const insertedValuation = await postgresDb.run(`
        INSERT INTO customs_valuations (
          declaration_id, valuation_method,
          invoice_value, invoice_currency,
          adjustments, adjusted_value, final_customs_value, valuation_currency,
          comparable_goods_value, comparable_goods_reference,
          supporting_documents, valuation_notes, valued_by, approval_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING valuation_id
      `, [
        declaration.declaration_id,
        valuationMethod,
        declaredValue,
        'USD',
        JSON.stringify([{ type: 'adjustment', amount: adjustmentAmount, percentage: adjustmentPercentage, reason: adjustmentReason || null, basis: basisOfValuation || null }]),
        adjustedVal,
        adjustedVal,
        'USD',
        Number.isFinite(comparableNum) && String(comparableGoods).trim() === String(comparableNum) ? comparableNum : null,
        Number.isFinite(comparableNum) && String(comparableGoods).trim() === String(comparableNum) ? null : (comparableGoods || null),
        JSON.stringify(Array.isArray(supportingDocuments) ? supportingDocuments : (supportingDocuments ? [{ reference: String(supportingDocuments) }] : [])),
        marketResearch || adjustmentReason || null,
        userIdInt,
        'approved'
      ]);
      const valuationId = insertedValuation.rows[0].valuation_id;

      // Update declaration with adjusted value
      await postgresDb.run(`
        UPDATE customs_declarations
        SET customs_value_usd = $1, updated_at = CURRENT_TIMESTAMP
        WHERE declaration_id = $2 OR declaration_number = $2
      `, [adjustedVal, declarationId]);

      logger.info(`✅ [CUSTOMS] Valuation completed: ${declarationId} - Adjusted from $${declaredValue} to $${adjustedVal}`);

      res.json({
        success: true,
        data: {
          valuationId,
          declarationId: declaration.declaration_id || declarationId,
          declaredValue,
          adjustedValue: adjustedVal,
          adjustmentAmount,
          adjustmentPercentage: Math.round(adjustmentPercentage * 100) / 100,
          valuationMethod,
          adjustmentReason,
          valuationOfficer: valuationOfficer || user.username,
          valuationDate: new Date().toISOString(),
          status: 'COMPLETED'
        },
        message: 'Customs valuation completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[CUSTOMS] Error performing valuation:', error);
      logger.error('[CUSTOMS] Error stack:', error.stack);
      logger.error('[CUSTOMS] Request params:', { declarationId: req.params.declarationId, body: req.body });
      res.status(500).json({
        success: false,
        error: { 
          code: 'VALUATION_FAILED', 
          message: 'Failed to perform valuation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        timestamp: new Date().toISOString()
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
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
  param('declarationId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { assignedInspector, scheduledDate, priorityLevel, location, inspectionType, inspectorNotes } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Scheduling inspection for declaration ${declarationId} by ${user.username}`);

      // Use the assigned inspector's username directly (no more mapping)
      const officerName = assignedInspector || user.username || 'Customs Officer';

      // The declaration must exist: the UPDATE below would otherwise
      // silently affect 0 rows and still return 200 for a phantom review.
      const existingDeclaration = await postgresDb.get(
        `SELECT declaration_number, status FROM customs_declarations WHERE declaration_number = $1`,
        [declarationId]
      );
      if (!existingDeclaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Declaration ${declarationId} not found` },
          timestamp: new Date().toISOString()
        });
      }

      // Ledger-first: the UNDER_INSPECTION progression is only recorded
      // when the chaincode accepted the review. The old best-effort
      // behaviour mirrored PG to UNDER_INSPECTION and returned
      // success:true with status UNDER_INSPECTION for a declaration that
      // does not exist on-chain (W2 run 3, step 5e).
      let blockchainResult: any = null;
      let blockchainError: string | null = null;
      try {
        blockchainResult = await fabricService.invokeChaincode(
          'ReviewCustomsDeclaration',
          [
            declarationId,
            officerName,
            inspectionType || 'STANDARD',
            inspectorNotes || 'Inspection scheduled'
          ]
        );
        if (!blockchainResult?.success) {
          blockchainError = blockchainResult?.error || 'Chaincode call did not succeed';
        }
      } catch (chainError: any) {
        blockchainError = chainError?.message || 'Chaincode call failed';
        blockchainResult = null;
      }
      const blockchainSynced = !blockchainError && blockchainResult?.success === true;
      const blockchain_tx_id = blockchainSynced ? (blockchainResult?.txId || null) : null;
      if (!blockchainSynced) {
        logger.warn(`[CUSTOMS] Declaration ${declarationId} review NOT recorded on blockchain, no PG change: ${blockchainError}`);
        return res.status(503).json({
          success: false,
          error: {
            code: 'CUSTOMS_REVIEW_FAILED',
            message: `Customs review of declaration ${declarationId} could not be recorded on the ledger: ${blockchainError}. No status change was recorded.`
          },
          data: { declarationId, blockchainSynced: false, blockchainError },
          timestamp: new Date().toISOString()
        });
      }
      logger.info(`✅ Customs review recorded on blockchain: ${declarationId}, TX: ${blockchain_tx_id}`);

      // Now update declaration with assigned officer and status
      await postgresDb.run(
        `UPDATE customs_declarations
         SET customs_officer = $1, status = $2, blockchain_tx_id = $3, updated_at = NOW()
         WHERE declaration_number = $4`,
        [officerName, 'UNDER_INSPECTION', blockchain_tx_id, declarationId]
      );

      logger.info(`[CUSTOMS] Declaration ${declarationId} updated: officer=${officerName}, status=UNDER_INSPECTION`);

      res.json({
        success: true,
        data: {
          declarationId,
          status: 'UNDER_INSPECTION',
          assignedOfficer: officerName,
          blockchain_tx_id,
          blockchainSynced,
          blockchainError,
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
 * POST /api/v1/customs/declarations/:id/inspect
 * Start customs inspection and move declaration to UNDER_INSPECTION status
 */
const inspectHandler = async (req: Request, res: Response) => {
    try {
      const { id, declarationId } = req.params;
      const declId = id || declarationId;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Starting inspection for declaration ${declId} by ${user.username}`);

      // Get database instance
      const { DatabaseService } = await import('../services/databaseService');
      const db = DatabaseService.getInstance();

      // Check if declaration exists
      const declaration = await db.get(
        `SELECT declaration_number, status FROM customs_declarations WHERE declaration_number = $1`,
        [declId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Declaration ${declId} not found` },
          timestamp: new Date().toISOString()
        });
      }

      // Update status to UNDER_INSPECTION (the chaincode review state; INSPECTING exists in no state machine)
      await db.run(
        `UPDATE customs_declarations 
         SET status = $1, customs_officer = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE declaration_number = $3`,
        ['UNDER_INSPECTION', user.username, declId]
      );

      // Also update CouchDB
      try {
        const couchDbUrl = process.env.COUCHDB_URL || 'http://couchdb.ecta:5984';
        const axios = require('axios');
        
        // Get current document
        const getResp = await axios.get(
          `${couchDbUrl}/coffeechannel_coffee/customs:${declId}`,
          { auth: { username: 'admin', password: 'adminpw' } }
        );
        
        const doc = getResp.data;
        doc.status = 'UNDER_INSPECTION';
        doc.customsOfficer = user.username;
        doc.updatedAt = new Date().toISOString();
        
        // Update document
        await axios.put(
          `${couchDbUrl}/coffeechannel_coffee/customs:${declId}`,
          doc,
          {
            auth: { username: 'admin', password: 'adminpw' },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        logger.info(`✅ [CUSTOMS] Declaration ${declId} updated in CouchDB: status=inspecting`);
      } catch (couchError: any) {
        logger.warn(`[CUSTOMS] CouchDB update failed (non-critical):`, couchError.message);
      }

      logger.info(`[CUSTOMS] ✅ Declaration ${declId} inspection started: status=UNDER_INSPECTION`);
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'customs_inspection_started',
        title: `Customs inspection started for declaration ${declId}`,
        message: `Customs inspection has started for declaration ${declId} (status UNDER_INSPECTION).`,
        entityType: 'customs_declaration', entityId: declId, severity: 'info',
        roles: ['CUSTOMS'],
        actionUrl: '/portals/exporter?tab=customs',
        actionUrls: { CUSTOMS: '/portals/customs?tab=customs' },
      });

      res.json({
        success: true,
        data: {
          declarationId: declId,
          status: 'UNDER_INSPECTION',
          customsOfficer: user.username,
          message: 'Inspection started successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CUSTOMS] Error starting inspection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
};

// Register both plural and singular routes
router.post('/declarations/:id/inspect', authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'), param('id').notEmpty(), inspectHandler);
router.post('/declaration/:declarationId/inspect', authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'), param('declarationId').notEmpty(), inspectHandler);

/**
 * POST /api/v1/customs/declarations/:id/clear
 * Clear customs declaration and move to CLEARED status
 */
// NOTE (TEST-STATUS-MATRIX §17 #14): the duplicate
// POST /declarations/:id/clear route was removed here. It had no
// callers (UI + tests use the singular /declaration/:id/clear below),
// cleared from any status with no guard, never called the chaincode,
// and wrote directly to CouchDB. The singular route below is the
// canonical clear: it goes through customsService.clearDeclaration
// (ClearCustomsDeclaration on-chain + PG update).
/**
 * Complete inspection and move declaration to UNDER_REVIEW status
 */
router.post('/declaration/:declarationId/complete-inspection',
  authMiddleware,
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
  param('declarationId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { declarationId } = req.params;
      const { inspectionResult, inspectorComments, completedDate } = req.body;
      const user = (req as any).user;

      logger.info(`[CUSTOMS] Completing inspection for declaration ${declarationId} by ${user.username}`);

      // The declaration must exist: the UPDATE below would otherwise
      // silently affect 0 rows and still return 200 for a phantom completion.
      const existingForCompletion = await postgresDb.get(
        `SELECT declaration_number, status FROM customs_declarations WHERE declaration_number = $1`,
        [declarationId]
      );
      if (!existingForCompletion) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Declaration ${declarationId} not found` },
          timestamp: new Date().toISOString()
        });
      }

      // Chaincode sync is best-effort (see submit above): the Postgres
      // UNDER_REVIEW progression is recorded either way, but a failed chain
      // call never yields a fabricated txId or a "recorded on blockchain"
      // log line, and never overwrites a stored txId with null.
      let blockchainResult: any = null;
      let blockchainError: string | null = null;
      try {
        blockchainResult = await fabricService.invokeChaincode(
          'CompleteInspection',
          [
            declarationId,
            inspectorComments || 'Inspection completed'
          ]
        );
        if (!blockchainResult?.success) {
          blockchainError = blockchainResult?.error || 'Chaincode call did not succeed';
        }
      } catch (chainError: any) {
        blockchainError = chainError?.message || 'Chaincode call failed';
        blockchainResult = null;
      }
      const blockchainSynced = !blockchainError && blockchainResult?.success === true;
      const blockchain_tx_id = blockchainSynced ? (blockchainResult?.txId || null) : null;
      if (blockchainSynced) {
        logger.info(`✅ Inspection completion recorded on blockchain: ${declarationId}, TX: ${blockchain_tx_id}`);
      } else {
        logger.warn(`[CUSTOMS] Declaration ${declarationId} inspection completion NOT recorded on blockchain (PG UNDER_REVIEW kept): ${blockchainError}`);
      }

      // Now update declaration status to UNDER_REVIEW after inspection
      if (blockchainSynced) {
        await postgresDb.run(
          `UPDATE customs_declarations
           SET status = $1, blockchain_tx_id = $2, updated_at = NOW()
           WHERE declaration_number = $3`,
          ['UNDER_REVIEW', blockchain_tx_id, declarationId]
        );
      } else {
        await postgresDb.run(
          `UPDATE customs_declarations
           SET status = $1, updated_at = NOW()
           WHERE declaration_number = $2`,
          ['UNDER_REVIEW', declarationId]
        );
      }

      logger.info(`[CUSTOMS] ✅ Declaration ${declarationId} inspection completed: status=UNDER_REVIEW`);

      res.json({
        success: true,
        data: {
          declarationId,
          status: 'UNDER_REVIEW',
          inspectionResult: inspectionResult || 'PASSED',
          blockchain_tx_id,
          blockchainSynced,
          blockchainError,
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
 * Reject a customs declaration on the consortium ledger and keep the
 * PostgreSQL read model aligned for portal lists and rejection details.
 */
router.post('/declaration/:declarationId/reject',
  authMiddleware,
  // Previously auth-only: any authenticated user could reject a customs
  // declaration. Only customs officers may do that.
  requireRole('CUSTOMS'),
  [
    param('declarationId').notEmpty(),
    body('rejectionReason').trim().notEmpty(),
    body('rejectedBy').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { declarationId } = req.params;
    const { rejectionReason, rejectedBy } = req.body;
    const user = (req as any).user;
    const officer = rejectedBy || user?.username || 'Customs Officer';

    try {
      const result = await fabricService.rejectCustomsDeclaration(
        declarationId,
        officer,
        rejectionReason,
        user.org || 'CustomsMSP'
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'REJECTION_FAILED', message: result.error || 'Failed to reject customs declaration' },
          timestamp: new Date().toISOString(),
        });
      }

      // O-1: RejectCustomsDeclaration moves the linked shipment to
      // CUSTOMS_REJECTED on-chain (customs.go:864/939); mirror it in
      // Postgres so the shipment leaves CUSTOMS_DECLARED in the portals
      // too. Best-effort and independent of the declaration mirror below:
      // a failure here never changes this response.
      try {
        const declRow: any = await postgresDb.get(
          `SELECT shipment_id FROM customs_declarations WHERE declaration_number = $1`,
          [declarationId]
        );
        if (declRow?.shipment_id) {
          await shipmentService.mirrorShipmentStatus(declRow.shipment_id, 'CUSTOMS_REJECTED');
        }
      } catch (mirrorLookupError) {
        logger.warn(`[CUSTOMS] Could not mirror CUSTOMS_REJECTED for declaration ${declarationId}:`, mirrorLookupError);
      }

      // In-app notification (persisted feed + live WS broadcast). The
      // ledger rejection has committed at this point, so one hook here
      // covers both the 200 and the 202 (mirror-failed) responses below.
      await notificationService.emitWorkflowEvent({
        type: 'customs_rejected',
        title: `Customs declaration ${declarationId} rejected`,
        message: `Customs declaration ${declarationId} was rejected. Reason: ${rejectionReason}`,
        entityType: 'customs_declaration', entityId: declarationId, severity: 'warning',
        roles: ['CUSTOMS'],
        actionUrl: '/portals/exporter?tab=customs',
        actionUrls: { CUSTOMS: '/portals/customs?tab=customs' },
      });
      try {
        await postgresDb.run(
          `UPDATE customs_declarations
           SET status = $1,
               customs_officer = $2,
               additional_notes = CASE
                 WHEN COALESCE(additional_notes, '') = '' THEN $3
                 ELSE additional_notes || E'\\n\\nRejection: ' || $3
               END,
               blockchain_tx_id = $4,
               updated_at = NOW()
           WHERE declaration_number = $5`,
          ['REJECTED', officer, rejectionReason, result.txId || null, declarationId]
        );
      } catch (syncError: any) {
        // The ledger commit is authoritative; expose the mirror condition so
        // operators can reconcile it without inviting a duplicate rejection.
        logger.error(`[CUSTOMS] Rejection committed but read-model sync failed for ${declarationId}:`, syncError);
        return res.status(202).json({
          success: true,
          data: { declarationId, status: 'REJECTED', rejectionReason, rejectedBy: officer },
          txId: result.txId,
          readModelSynchronized: false,
          warning: 'The ledger rejection committed, but the portal read model needs reconciliation.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        success: true,
        data: { declarationId, status: 'REJECTED', rejectionReason, rejectedBy: officer },
        txId: result.txId,
        readModelSynchronized: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(`[CUSTOMS] Error rejecting declaration ${declarationId}:`, error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to reject customs declaration' },
        timestamp: new Date().toISOString(),
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
  requireRole('CUSTOMS', 'CUSTOMS_ADMIN'),
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

      // Fetch declaration from database first
      const declaration = await postgresDb.get(
        `SELECT * FROM customs_declarations WHERE declaration_number = $1`,
        [declarationId]
      );

      if (!declaration) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DECLARATION_NOT_FOUND',
            message: `Declaration ${declarationId} not found`
          },
          timestamp: new Date().toISOString()
        });
      }

      // F-8: the ledger refuses to clear a declaration that is not
      // UNDER_REVIEW (customs.go ClearCustomsDeclaration) — a REJECTED
      // (or already CLEARED / CANCELLED) declaration is a client/state
      // error, not a server error. Fail fast with 409 instead of
      // letting the chaincode refusal surface as a 500 from the catch
      // below. (PG REJECTED is trustworthy here: rejectDeclaration
      // writes it only after the ledger reject commits.)
      const declarationStatus = String(declaration.status || '').toUpperCase();
      if (declarationStatus === 'REJECTED') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DECLARATION_REJECTED',
            message: `Declaration ${declarationId} was rejected and cannot be cleared. Submit a new declaration for shipment ${declaration.shipment_id || ''} instead.`
          },
          timestamp: new Date().toISOString()
        });
      }
      if (declarationStatus === 'CLEARED') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DECLARATION_ALREADY_CLEARED',
            message: `Declaration ${declarationId} is already cleared.`
          },
          timestamp: new Date().toISOString()
        });
      }
      if (declarationStatus === 'CANCELLED') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DECLARATION_CANCELLED',
            message: `Declaration ${declarationId} was cancelled and cannot be cleared.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Use CustomsService to clear declaration
      const result = await customsService.clearDeclaration({
        declarationID: declarationId,
        clearanceNumber: clearanceNumber || `CLR-${Date.now()}`,
        clearedBy: clearedBy || user.username,
        duties: exportDuty || 0,
        taxes: vatAmount || 0,
        clearanceNotes: clearanceRemarks,
        userId: user.username,
        userOrg: user.org || 'CustomsMSP'
      });

      if (result.blockchainSynced) {
        logger.info(`[CUSTOMS] ✅ Declaration ${declarationId} cleared successfully (on-chain TX: ${result.blockchainTxId})`);
      } else {
        logger.warn(`[CUSTOMS] Declaration ${declarationId} cleared in PG only (chain not synced): ${result.blockchainError}`);
      }

      // O-1: the linked shipment moves to CUSTOMS_CLEARED on-chain via
      // the ClearCustomsDeclaration cascade itself (customs.go:679/788) —
      // there is no separate chain shipment update to do here — but the
      // Postgres shipment row still needs mirroring, which nothing did.
      // Only when the ledger clear actually synced: clearDeclaration
      // throws on a chain failure, so reaching here means it synced, but
      // the guard stays explicit. Best-effort: the mirror never fails
      // this response.
      if (result.blockchainSynced && declaration.shipment_id) {
        await shipmentService.mirrorShipmentStatus(declaration.shipment_id, 'CUSTOMS_CLEARED');
      }

      // (The old comment here claimed UpdateShipmentStatus did not exist
      // in the chaincode; it does — main.go — but the cascade already
      // covers the chain move, and the shipment update must not be
      // attempted twice on-chain. The PG mirror above is the missing
      // half, not a second chain write.)
      if (!declaration.shipment_id) {
        logger.warn(`[CUSTOMS] ⚠️ No shipment_id found for declaration ${declarationId} — no shipment cascade to run`);
      }

      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'customs_cleared',
        title: `Customs declaration ${declarationId} cleared`,
        message: `Customs declaration ${declarationId} has been cleared (clearance ${clearanceNumber}).`,
        entityType: 'customs_declaration', entityId: declarationId, severity: 'success',
        roles: ['SHIPPING', 'BANKS'],
        actionUrl: '/portals/exporter?tab=customs',
        actionUrls: { SHIPPING: '/portals/shipping?tab=shipments', BANKS: '/portals/banks?tab=contracts' },
      });
      res.json({
        success: true,
        data: {
          declarationId,
          clearanceNumber,
          shipmentID: declaration.shipment_id,
          status: 'CLEARED',
          clearedBy: clearedBy || user.username,
          blockchain_tx_id: result.blockchainTxId || null,
          blockchainSynced: result.blockchainSynced,
          blockchainError: result.blockchainError,
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
      // F-8: a ledger state refusal (e.g. PG said UNDER_REVIEW but the
      // ledger holds REJECTED) is a 409, not a 500. Only the state
      // refusal is remapped — infrastructure failures keep the 500.
      if (/cannot be cleared, current status/i.test(error?.message || '')) {
        return res.status(409).json({
          success: false,
          error: { code: 'CLEAR_FAILED', message: error.message },
          timestamp: new Date().toISOString()
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/customs/assessments
 * Get customs duty and tax assessments
 */
router.get('/assessments', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[CUSTOMS] Fetching customs assessments...');

    const assessments = await postgresDb.all(`
      SELECT 
        ca.*,
        cd.contract_id,
        c.exporter_id,
        c.buyer_id
      FROM customs_assessments ca
      LEFT JOIN customs_declarations cd ON ca.declaration_number = cd.declaration_number
      LEFT JOIN contracts c ON cd.contract_id = c.contract_id
      ORDER BY ca.created_at DESC
    `);

    const normalized = assessments.map((assessment: any) => ({
      assessmentId: assessment.assessment_id,
      declarationNumber: assessment.declaration_number,
      contractId: assessment.contract_id,
      exporterId: assessment.exporter_id,
      buyerId: assessment.buyer_id,
      assessedValue: parseFloat(assessment.assessed_value || '0'),
      dutyAmount: parseFloat(assessment.duty_amount || '0'),
      taxAmount: parseFloat(assessment.tax_amount || '0'),
      totalAmount: parseFloat(assessment.total_amount || '0'),
      currency: assessment.currency || 'ETB',
      assessedBy: assessment.assessed_by,
      assessmentDate: assessment.assessment_date,
      status: assessment.status,
      createdAt: assessment.created_at
    }));

    logger.info(`[CUSTOMS] ✅ Retrieved ${normalized.length} customs assessments`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch customs assessments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/customs/document-verification
 * Get document verification queue
 */
router.get('/document-verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[CUSTOMS] Fetching document verification queue...');

    const documents = await postgresDb.all(`
      SELECT 
        d.*,
        cd.contract_id,
        c.exporter_id,
        c.buyer_id
      FROM documents d
      LEFT JOIN customs_declarations cd ON d.entity_id = cd.declaration_number
      LEFT JOIN contracts c ON cd.contract_id = c.contract_id
      WHERE d.entity_type = 'CUSTOMS_DECLARATION'
        AND d.status IN ('pending', 'under_review')
      ORDER BY d.uploaded_at DESC
    `);

    const normalized = documents.map((doc: any) => ({
      documentId: doc.document_id,
      declarationNumber: doc.entity_id,
      contractId: doc.contract_id,
      exporterId: doc.exporter_id,
      buyerId: doc.buyer_id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      filePath: doc.file_path,
      status: doc.status,
      uploadedAt: doc.uploaded_at,
      uploadedBy: doc.uploaded_by,
      verificationStatus: doc.status === 'pending' ? 'PENDING' : 'IN_REVIEW',
      priority: 'NORMAL'
    }));

    logger.info(`[CUSTOMS] ✅ Retrieved ${normalized.length} documents for verification`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching document verification queue:', error);
    // Return empty array instead of error to allow frontend to render empty state
    res.json({
      success: true,
      data: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/customs/risk-assessment
 * Get risk assessments for customs declarations
 */
router.get('/risk-assessment', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[CUSTOMS] Fetching risk assessments...');

    const declarations = await postgresDb.all(`
      SELECT 
        cd.*,
        c.exporter_id,
        c.buyer_id,
        c.buyer_country,
        c.total_value
      FROM customs_declarations cd
      LEFT JOIN contracts c ON cd.contract_id = c.contract_id
      ORDER BY cd.created_at DESC
      LIMIT 100
    `);

    const riskAssessments = declarations.map((decl: any) => {
      let riskScore = 0;
      let riskFactors: string[] = [];

      const declaredValue = parseFloat(decl.declared_value || '0');
      if (declaredValue > 100000) {
        riskScore += 3;
        riskFactors.push('HIGH_VALUE');
      }

      if (!decl.exporter_id || decl.exporter_id.startsWith('TEST')) {
        riskScore += 2;
        riskFactors.push('NEW_EXPORTER');
      }

      if (decl.status === 'SUBMITTED') {
        riskScore += 1;
        riskFactors.push('PENDING_REVIEW');
      }

      const riskLevel = riskScore >= 5 ? 'HIGH' : riskScore >= 3 ? 'MEDIUM' : 'LOW';

      return {
        assessmentId: `RISK-${decl.declaration_number}`,
        declarationNumber: decl.declaration_number,
        contractId: decl.contract_id,
        exporterId: decl.exporter_id,
        buyerId: decl.buyer_id,
        buyerCountry: decl.buyer_country,
        riskLevel,
        riskScore,
        riskFactors,
        declaredValue,
        recommendedAction: riskLevel === 'HIGH' ? 'PHYSICAL_INSPECTION' : riskLevel === 'MEDIUM' ? 'DOCUMENT_REVIEW' : 'STANDARD_PROCESSING',
        assessedAt: new Date().toISOString(),
        status: decl.status
      };
    });

    logger.info(`[CUSTOMS] ✅ Generated ${riskAssessments.length} risk assessments`);

    res.json({
      success: true,
      data: riskAssessments,
      count: riskAssessments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CUSTOMS] Error generating risk assessments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate risk assessments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/customs/history
 * Get customs clearance history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { exporterId, contractId } = req.query;
    logger.info('[CUSTOMS] Fetching customs clearance history...');

    let query = `
      SELECT 
        cd.*,
        c.exporter_id,
        c.buyer_id,
        c.buyer_country,
        c.coffee_type,
        c.quantity
      FROM customs_declarations cd
      LEFT JOIN contracts c ON cd.contract_id = c.contract_id
      WHERE cd.status IN ('CLEARED', 'RELEASED')
    `;

    const params: any[] = [];

    if (exporterId) {
      query += ` AND c.exporter_id = $${params.length + 1}`;
      params.push(exporterId);
    }

    if (contractId) {
      query += ` AND cd.contract_id = $${params.length + 1}`;
      params.push(contractId);
    }

    query += ` ORDER BY cd.clearance_date DESC`;

    const history = await postgresDb.all(query, params);

    const normalized = history.map((record: any) => ({
      declarationNumber: record.declaration_number,
      contractId: record.contract_id,
      exporterId: record.exporter_id,
      buyerId: record.buyer_id,
      buyerCountry: record.buyer_country,
      coffeeType: record.coffee_type,
      quantity: record.quantity || 0,
      declarationType: record.declaration_type,
      declaredValue: parseFloat(record.declared_value || '0'),
      currency: record.currency,
      status: record.status,
      submissionDate: record.submission_date,
      clearanceDate: record.clearance_date,
      clearedBy: record.cleared_by,
      hsCode: record.hs_code,
      processingTime: record.clearance_date && record.submission_date 
        ? Math.round((new Date(record.clearance_date).getTime() - new Date(record.submission_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

    logger.info(`[CUSTOMS] ✅ Retrieved ${normalized.length} clearance history records`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CUSTOMS] Error fetching clearance history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch clearance history'
      },
      timestamp: new Date().toISOString()
    });
  }
});
