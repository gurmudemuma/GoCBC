import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();

// POST /api/v1/permits — Issue permit (wrapper for /issue endpoint)
router.post('/', async (req, res) => {
  try {
    const {
      permitID,
      shipmentID,
      exporterID,
      quantity,
      certificateID,
      status
    } = req.body;

    logger.info(`[PERMITS] 📝 Issuing export permit: ${permitID}`);

    const permitId = permitID || req.body.permitId || `PERMIT-${Date.now()}`;
    const permitNumber = `EP${Date.now()}`;
    const contractId = req.body.contractID || req.body.contractId || '';
    const exporterId = exporterID || req.body.exporterId || '';
    const lcId = req.body.lcID || req.body.lcId || '';
    const paymentMethod = req.body.paymentMethod || 'LC';
    const amount = req.body.amount || 85000;
    const currency = req.body.currency || 'USD';
    const description = `Export Permit for shipment ${shipmentID}`;
    const destination = req.body.destination || 'Germany';
    const commercialInvoice = certificateID || 'CI-' + permitId;
    const bankBranch = 'CBE Main Branch';
    const approvedBy = 'Bank Officer';

    if (!permitId || !shipmentID) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: permitID, shipmentID',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Export permits are issued by Banks (Commercial Bank of Ethiopia)
    await fabricService.connectAsOrg('BanksMSP');

    const result = await fabricService.invokeChaincode(
      'IssueCBEExportPermit',
      [
        permitId,
        permitNumber,
        contractId,
        exporterId,
        lcId,
        paymentMethod,
        amount.toString(),
        currency,
        description,
        destination,
        commercialInvoice,
        bankBranch,
        approvedBy
      ]
    );

    if (result.success) {
      logger.info(`✅ [PERMITS] Export permit issued: ${permitId}`);
      res.status(201).json({ 
        success: true, 
        message: 'Export permit issued successfully',
        data: { permitID: permitId, permitId, status: 'issued' },
        txId: result.txId,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error(`❌ [PERMITS] Failed to issue: ${result.error}`);
      res.status(400).json({ 
        success: false, 
        error: { message: result.error || 'Failed to issue permit' },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('[PERMITS] Issue permit error:', error);
    res.status(500).json({ 
      success: false,
      error: { message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// Issue export permit
router.post('/issue', async (req, res) => {
  try {
    const {
      permitId,
      permitNumber,
      contractId,
      exporterId,
      lcId,
      paymentMethod,
      amount,
      currency,
      description,
      destination,
      commercialInvoice,
      bankBranch,
      approvedBy
    } = req.body;

    // Export permits are issued by Banks (Commercial Bank of Ethiopia)
    await fabricService.connectAsOrg('BanksMSP');

    const result = await fabricService.invokeChaincode(
      'IssueCBEExportPermit',
      [
        permitId,
        permitNumber,
        contractId,
        exporterId,
        lcId,
        paymentMethod,
        amount.toString(),
        currency,
        description,
        destination,
        commercialInvoice,
        bankBranch,
        approvedBy
      ]
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Export permit issued successfully',
        data: result.data,
        txId: result.txId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: { message: result.error || 'Failed to issue permit' }
      });
    }
  } catch (error: any) {
    logger.error('Issue permit error:', error);
    res.status(500).json({ 
      success: false,
      error: { message: error.message }
    });
  }
});

// Utilize export permit
router.post('/utilize', async (req, res) => {
  try {
    const { permitId } = req.body;

    const result = await fabricService.invokeChaincode('UtilizeExportPermit', [permitId]);

    if (result.success) {
      res.json({ success: true, message: 'Export permit utilized successfully' });
    } else {
      res.status(400).json({ success: false, error: { message: result.error } });
    }
  } catch (error: any) {
    logger.error('Utilize permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settle export permit
router.post('/settle', async (req, res) => {
  try {
    const { permitId, repatriatedAmount } = req.body;

    const result = await fabricService.invokeChaincode(
      'SettleExportPermit',
      [permitId, repatriatedAmount.toString()]
    );

    if (result.success) {
      res.json({ success: true, message: 'Export permit settled successfully' });
    } else {
      res.status(400).json({ success: false, error: { message: result.error } });
    }
  } catch (error: any) {
    logger.error('Settle permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get permit by ID
router.get('/:permitId', async (req, res) => {
  try {
    const { permitId } = req.params;
    const result = await fabricService.queryChaincode('ReadExportPermit', [permitId]);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error: any) {
    logger.error('Read permit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query permits by exporter
router.get('/exporter/:exporterId', async (req, res) => {
  try {
    const { exporterId } = req.params;
    const result = await fabricService.queryChaincode('QueryPermitsByExporter', [exporterId]);
    
    if (result.success) {
      res.json(result.data || []);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    logger.error('Query permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query outstanding permits
router.get('/outstanding/all', async (req, res) => {
  try {
    const result = await fabricService.queryChaincode('QueryOutstandingPermits', []);
    
    if (result.success) {
      res.json(result.data || []);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    logger.error('Query outstanding permits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query all permits
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    logger.info(`[PERMITS] Fetching permits${status ? ` with status: ${status}` : ''}...`);

    // Try PostgreSQL first (faster)
    let query = `
      SELECT 
        p.*,
        c.exporter_id,
        c.buyer_id,
        c.quantity,
        c.coffee_type
      FROM export_permits p
      LEFT JOIN contracts c ON p.contract_id = c.contract_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND p.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC`;

    const dbService = DatabaseService.getInstance();
    const permits = await dbService.all(query, params);

    const normalized = permits.map((permit: any) => ({
      permitId: permit.permit_id,
      contractId: permit.contract_id,
      exporterId: permit.exporter_id,
      buyerId: permit.buyer_id,
      permitType: permit.permit_type || 'EXPORT',
      status: permit.status,
      issueDate: permit.issue_date,
      expiryDate: permit.expiry_date,
      quantity: permit.quantity || 0,
      coffeeType: permit.coffee_type,
      approvedBy: permit.approved_by,
      createdAt: permit.created_at
    }));

    logger.info(`[PERMITS] ✅ Retrieved ${normalized.length} permits from PostgreSQL`);

    res.json({
      success: true,
      data: normalized,
      count: normalized.length,
      source: 'postgresql',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[PERMITS] Query all permits error:', error);
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
