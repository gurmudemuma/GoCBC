// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Certificate Management Routes - Phytosanitary and Certificate of Origin

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();

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
      hsCode: cert.hs_code || '0901.21',
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
router.post('/phyto', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { certificateId, contractId, status, treatmentType, inspectionResult } = req.body;

    logger.info(`[CERTIFICATES] Creating phytosanitary certificate: ${certificateId}`);

    await dbService.run(`
      INSERT INTO phytosanitary_certificates (
        certificate_id, contract_id, status, issue_date, 
        treatment_type, inspection_result, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      certificateId,
      contractId,
      status || 'ISSUED',
      new Date().toISOString(),
      treatmentType || 'FUMIGATION',
      inspectionResult || 'PASS',
      new Date().toISOString()
    ]);

    res.json({
      success: true,
      message: 'Phytosanitary certificate created successfully',
      certificateId,
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
 * POST /api/v1/certificates/origin
 * Create certificate of origin
 */
router.post('/origin', authMiddleware, async (req: Request, res: Response) => {
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
