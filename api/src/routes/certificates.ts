// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Certificate Management Routes - Phytosanitary and Certificate of Origin

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();

/**
 * GET /api/v1/certificates/phyto
 * Get all phytosanitary certificates
 */
router.get('/phyto', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    logger.info(`[CERTIFICATES] Fetching phytosanitary certificates${status ? ` with status: ${status}` : ''}...`);

    let query = `
      SELECT 
        pc.*,
        c.exporter_id,
        c.buyer_id,
        c.quantity,
        c.coffee_type
      FROM phytosanitary_certificates pc
      LEFT JOIN contracts c ON pc.contract_id = c.contract_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND pc.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY pc.created_at DESC`;

    const certificates = await dbService.all(query, params);

    const normalized = certificates.map((cert: any) => ({
      certificateId: cert.certificate_id,
      contractId: cert.contract_id,
      exporterId: cert.exporter_id,
      buyerId: cert.buyer_id,
      status: cert.status,
      issueDate: cert.issue_date,
      expiryDate: cert.expiry_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      treatmentType: cert.treatment_type || 'FUMIGATION',
      inspectionResult: cert.inspection_result || 'PASS',
      quantity: cert.quantity || 0,
      coffeeType: cert.coffee_type,
      issuingAuthority: 'ECTA',
      certifyingOfficer: cert.certifying_officer || 'ECTA Officer',
      createdAt: cert.created_at
    }));

    logger.info(`[CERTIFICATES] ✅ Retrieved ${normalized.length} phytosanitary certificates`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CERTIFICATES] Error fetching phyto certificates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch phytosanitary certificates'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/certificates/origin
 * Get all certificates of origin
 */
router.get('/origin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    logger.info(`[CERTIFICATES] Fetching certificates of origin${status ? ` with status: ${status}` : ''}...`);

    let query = `
      SELECT 
        coo.*,
        c.exporter_id,
        c.buyer_id,
        c.quantity,
        c.coffee_type,
        c.buyer_country
      FROM certificate_of_origin coo
      LEFT JOIN contracts c ON coo.contract_id = c.contract_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND coo.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY coo.created_at DESC`;

    const certificates = await dbService.all(query, params);

    const normalized = certificates.map((cert: any) => ({
      certificateId: cert.certificate_id,
      contractId: cert.contract_id,
      exporterId: cert.exporter_id,
      buyerId: cert.buyer_id,
      buyerCountry: cert.buyer_country,
      status: cert.status,
      issueDate: cert.issue_date,
      origin: cert.origin || 'ETHIOPIA',
      quantity: cert.quantity || 0,
      coffeeType: cert.coffee_type,
      certifyingAuthority: cert.certifying_authority || 'ECTA',
      certifyingOfficer: cert.certifying_officer || 'ECTA Officer',
      hsCode: cert.hs_code || '090111', // One HS code everywhere (leg2 #9/#18): 090111 green coffee
      createdAt: cert.created_at
    }));

    logger.info(`[CERTIFICATES] ✅ Retrieved ${normalized.length} certificates of origin`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CERTIFICATES] Error fetching COO certificates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch certificates of origin'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/certificates/phyto
 * Create phytosanitary certificate
 */
router.post('/phyto', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { certificateId, contractId, shipmentId, exporterId, status, treatmentType, inspectionResult } = req.body;

    logger.info(`[CERTIFICATES] Creating phytosanitary certificate: ${certificateId}`);

    // Leg2 #12: this route used to INSERT a Postgres row with
    // status 'ISSUED' and no chaincode call at all — a phantom
    // certificate no peer had ever seen. Ledger-first now: the
    // certificate must be requested on-chain (PENDING) before any PG
    // row is written, and the caller-supplied status is never trusted
    // (a fresh request is PENDING, never ISSUED). A shipment is
    // required: RequestPhytosanitaryCertificate refuses an unknown
    // shipment on-chain, so resolve it from the contract's shipments
    // when the caller only supplies a contract.
    let shipment = shipmentId || '';
    let exporter = exporterId || '';
    if (!shipment && contractId) {
      const row = await dbService.get(
        `SELECT shipment_id, exporter_id FROM shipments WHERE contract_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [contractId]
      );
      shipment = row?.shipment_id || '';
      exporter = row?.exporter_id || exporter;
    }
    if (!shipment) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'shipmentId is required (or a contractId with a shipment) to create a phytosanitary certificate on the ledger' },
        timestamp: new Date().toISOString()
      });
    }
    const chainResult = await fabricService.invokeChaincode('RequestPhytosanitaryCertificate', [
      certificateId,
      shipment,
      exporter,
      'Coffee beans (Coffea arabica)',
      '0',
      treatmentType || 'Fumigation',
      '', '', '', '', '', '', '',
    ]);
    if (!chainResult.success) {
      if (chainResult.error && chainResult.error.includes('not found in contract')) {
        return res.status(503).json({
          success: false,
          error: { code: 'CHAINCODE_UNAVAILABLE', message: `Phytosanitary certificate ${certificateId} could not be created: RequestPhytosanitaryCertificate is not deployed on the ledger. No certificate was recorded.` },
          timestamp: new Date().toISOString()
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'REQUEST_FAILED', message: chainResult.error || 'Failed to request phytosanitary certificate on the ledger' },
        timestamp: new Date().toISOString()
      });
    }

    await dbService.run(`
      INSERT INTO phytosanitary_certificates (
        certificate_id, contract_id, status, issue_date,
        treatment_type, inspection_result, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      certificateId,
      contractId,
      'PENDING',
      new Date().toISOString(),
      treatmentType || 'FUMIGATION',
      inspectionResult || 'PENDING',
      new Date().toISOString()
    ]);

    res.json({
      success: true,
      message: 'Phytosanitary certificate requested on the ledger successfully',
      certificateId,
      status: 'PENDING',
      txId: (chainResult as any)?.txId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CERTIFICATES] Error creating phyto certificate:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/certificates/coo/request
 * Request certificate of origin (alias)
 */
router.post('/coo/request', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { certificateID, shipmentID, exporterID, origin } = req.body;

    const certificateId = certificateID || req.body.certificateId || `COO-${Date.now()}`;

    logger.info(`[CERTIFICATES] Requesting certificate of origin: ${certificateId}`);

    // Get contract from shipment
    let contractId = '';
    if (shipmentID) {
      const shipment = await dbService.get(
        `SELECT contract_id FROM shipments WHERE shipment_id = $1`,
        [shipmentID]
      );
      contractId = shipment?.contract_id || '';
    }

    await dbService.run(`
      INSERT INTO certificate_of_origin (
        certificate_id, contract_id, status, issue_date,
        origin, certifying_authority, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (certificate_id) DO NOTHING
    `, [
      certificateId,
      contractId,
      'REQUESTED',
      new Date().toISOString(),
      origin || 'ETHIOPIA',
      'ECTA',
      new Date().toISOString()
    ]);

    res.json({
      success: true,
      message: 'Certificate of origin requested successfully',
      data: { certificateID: certificateId, certificate_id: certificateId },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CERTIFICATES] Error requesting COO certificate:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/certificates/origin
 * Create certificate of origin
 */
router.post('/origin', authMiddleware,
  requireRole('ECTA', 'ECTA_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { certificateId, contractId, status, origin, certifyingAuthority } = req.body;

    logger.info(`[CERTIFICATES] Creating certificate of origin: ${certificateId}`);

    await dbService.run(`
      INSERT INTO certificate_of_origin (
        certificate_id, contract_id, status, issue_date,
        origin, certifying_authority, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      certificateId,
      contractId,
      status || 'ISSUED',
      new Date().toISOString(),
      origin || 'ETHIOPIA',
      certifyingAuthority || 'ECTA',
      new Date().toISOString()
    ]);

    res.json({
      success: true,
      message: 'Certificate of origin created successfully',
      certificateId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[CERTIFICATES] Error creating COO certificate:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
