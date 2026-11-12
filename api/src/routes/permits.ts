import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { ShipmentService } from '../services/shipmentService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import notificationService from '../services/notificationService';

const router = express.Router();
const fabricService = FabricService.getInstance();
const dbService = DatabaseService.getInstance();
const shipmentService = ShipmentService.getInstance();

// Mirror an issued permit into Postgres. Both issue handlers only wrote
// the chain, so the export_permits table (which the portals read) was
// never populated. Chaincode IssueCBEExportPermit sets ISSUED (permit.go).
// Best-effort: a mirror failure must never fail a committed issuance.
async function mirrorPermitPG(permitId: string, contractId: string, approvedBy: string): Promise<void> {
  try {
    await dbService.run(
      `INSERT INTO export_permits (permit_id, contract_id, status, approved_by)
       VALUES ($1, $2, 'ISSUED', $3)
       ON CONFLICT (permit_id) DO NOTHING`,
      [permitId, contractId || null, approvedBy || null]
    );
  } catch (err) {
    logger.warn(`[PERMITS] Could not mirror permit ${permitId} to Postgres:`, err);
  }
}

// Mirror the IssueCBEExportPermit cascade (permit.go:248) in Postgres:
// every shipment under the contract in CREATED or INSPECTION_COMPLETE
// moves to PERMIT_ISSUED on-chain. The eligibility guard matches the
// chaincode exactly, so a shipment that already moved on is never
// regressed. When no contract id was supplied the cascade had nothing to
// move under, so fall back to the single known shipment, guarded the same
// way. Best-effort: the shared helper never throws, so a mirror failure
// can never fail a committed issuance.
async function mirrorPermitCascadePG(contractId: string, shipmentId?: string): Promise<void> {
  if (contractId) {
    await shipmentService.mirrorShipmentStatusForContract(contractId, 'PERMIT_ISSUED', ['CREATED', 'INSPECTION_COMPLETE']);
  } else if (shipmentId) {
    await shipmentService.mirrorShipmentStatus(shipmentId, 'PERMIT_ISSUED', ['CREATED', 'INSPECTION_COMPLETE']);
  }
}


// Resolve the commercial terms of a permit from the contract — never
// invent them. The old handlers defaulted amount 85000, destination
// 'Germany', approver 'Bank Officer' (leg2 audit #1/#2): a permit could
// be issued for a shipment with no contract at all, and the permit.go
// cascade then found no shipment to move to PERMIT_ISSUED. A contractID
// is required, the contract must exist, and amount/currency/destination
// come from it (the request body may override a field the caller knows);
// an amount that cannot be resolved to a positive number is a 400, not
// a fabricated permit. Mirrors the ECTA issue-permit resolution in
// quality.ts.
async function resolvePermitCommercials(contractId: string, body: any): Promise<{
  error?: string;
  amount?: number;
  currency?: string;
  destination?: string;
  exporterId?: string;
}> {
  if (!contractId) {
    return { error: 'contractID is required to issue an export permit: the permit amount, currency and destination are taken from the approved contract' };
  }
  const contract = await dbService.get(
    'SELECT exporter_id, total_value, currency, buyer_country FROM contracts WHERE contract_id = $1',
    [contractId]
  );
  if (!contract) {
    return { error: `Contract ${contractId} not found: cannot issue an export permit without its commercial terms` };
  }
  const amount = body.amount != null ? Number(body.amount) : Number(contract.total_value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: `Cannot issue export permit: no positive permit amount could be resolved from contract ${contractId} or the request body` };
  }
  const destination = body.destination || contract.buyer_country || '';
  if (!destination) {
    return { error: `Cannot issue export permit: no destination could be resolved from contract ${contractId} or the request body` };
  }
  return {
    amount,
    currency: body.currency || contract.currency || 'USD',
    destination,
    exporterId: body.exporterID || body.exporterId || contract.exporter_id || '',
  };
}

function permitValidationError(res: any, message: string) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message },
    timestamp: new Date().toISOString()
  });
}


// POST /api/v1/permits/export — Issue export permit (alias)
router.post('/export', authMiddleware, requireRole('BANKS', 'BANK_ADMIN'), async (req, res) => {
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
    const lcId = req.body.lcID || req.body.lcId || '';
    const paymentMethod = req.body.paymentMethod || 'LC';
    // Commercial terms come from the contract (resolvePermitCommercials):
    // no 85000 / 'Germany' defaults — see the helper.
    const resolved = await resolvePermitCommercials(contractId, req.body);
    if (resolved.error) {
      return permitValidationError(res, resolved.error);
    }
    const amount = resolved.amount as number;
    const currency = resolved.currency as string;
    const destination = resolved.destination as string;
    const exporterId = exporterID || req.body.exporterId || resolved.exporterId || '';
    const description = `Export Permit for shipment ${shipmentID}`;
    const commercialInvoice = certificateID || 'CI-' + permitId;
    const bankBranch = req.body.bankBranch || 'CBE Main Branch';
    const approvedBy = (req as any).user?.username || 'Bank Officer';

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
      ],
      "BanksMSP"
    );

    if (result.success) {
      await mirrorPermitPG(permitId, contractId, approvedBy);
      await mirrorPermitCascadePG(contractId, shipmentID);
      // Auto-create the customs declaration when the inspection already
      // passed (literal order inspect → permit → customs). Best-effort:
      // the helper never throws and never duplicates.
      await shipmentService.maybeTriggerCustomsDeclarationAfterPermit(shipmentID, (req as any).user?.username || approvedBy);
      logger.info(`✅ [PERMITS] Export permit issued: ${permitId}`);
      res.status(201).json({ 
        success: true, 
        message: 'Export permit issued successfully',
        data: { permitID: permitId, permitId, status: 'ISSUED' },
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

// POST /api/v1/permits — Issue permit (wrapper for /issue endpoint)
// NOTE (TEST-STATUS-MATRIX §17 #10): the router is mounted behind
// authMiddleware in server.ts, so unauthenticated requests already 401 —
// but any authenticated role could issue permits. IssueCBEExportPermit is
// Banks-MSP-only on-chain (permit.go), so the mutating routes below are
// additionally gated to BANKS/BANK_ADMIN, mirroring banking.ts LC issue.
// Reads stay auth-only: any authenticated role may read a permit.
router.post('/', authMiddleware, requireRole('BANKS', 'BANK_ADMIN'), async (req, res) => {
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
    const lcId = req.body.lcID || req.body.lcId || '';
    const paymentMethod = req.body.paymentMethod || 'LC';
    // Commercial terms come from the contract (resolvePermitCommercials):
    // no 85000 / 'Germany' defaults — see the helper.
    const resolved = await resolvePermitCommercials(contractId, req.body);
    if (resolved.error) {
      return permitValidationError(res, resolved.error);
    }
    const amount = resolved.amount as number;
    const currency = resolved.currency as string;
    const destination = resolved.destination as string;
    const exporterId = exporterID || req.body.exporterId || resolved.exporterId || '';
    const description = `Export Permit for shipment ${shipmentID}`;
    const commercialInvoice = certificateID || 'CI-' + permitId;
    const bankBranch = req.body.bankBranch || 'CBE Main Branch';
    const approvedBy = (req as any).user?.username || 'Bank Officer';

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
      ],
      "BanksMSP"
    );

    if (result.success) {
      await mirrorPermitPG(permitId, contractId, approvedBy);
      await mirrorPermitCascadePG(contractId, shipmentID);
      // Auto-create the customs declaration when the inspection already
      // passed (literal order inspect → permit → customs). Best-effort:
      // the helper never throws and never duplicates.
      await shipmentService.maybeTriggerCustomsDeclarationAfterPermit(shipmentID, (req as any).user?.username || approvedBy);
      logger.info(`✅ [PERMITS] Export permit issued: ${permitId}`);
      res.status(201).json({ 
        success: true, 
        message: 'Export permit issued successfully',
        data: { permitID: permitId, permitId, status: 'ISSUED' },
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
router.post('/issue', authMiddleware, requireRole('BANKS', 'BANK_ADMIN'), async (req, res) => {
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
      ],
      "BanksMSP"
    );

    if (result.success) {
      await mirrorPermitPG(permitId, contractId, approvedBy);
      await mirrorPermitCascadePG(contractId);
      // Auto-create the customs declaration for every shipment under
      // this contract whose inspection already passed (literal order
      // inspect → permit → customs; no single shipmentID on this route).
      // Best-effort: the helper never throws and never duplicates.
      try {
        const shipments = await dbService.all(
          'SELECT shipment_id FROM shipments WHERE contract_id = $1',
          [contractId]
        );
        for (const s of shipments || []) {
          await shipmentService.maybeTriggerCustomsDeclarationAfterPermit(s.shipment_id, (req as any).user?.username || approvedBy);
        }
      } catch (triggerErr) {
        logger.warn('[PERMITS] Permit-issuance customs trigger failed (best-effort):', triggerErr);
      }
      // In-app notification (persisted feed + live WS broadcast).
      await notificationService.emitWorkflowEvent({
        type: 'permit_issued',
        title: `Export permit ${permitId} issued`,
        message: `Export permit ${permitId} was issued for contract ${contractId}.`,
        entityType: 'permit', entityId: permitId, severity: 'success',
        roles: ['ECTA', 'CUSTOMS'], exporterId, lcId,
        actionUrl: '/portals/exporter?tab=permits',
        actionUrls: { ECTA: '/portals/ecta?tab=permits', CUSTOMS: '/portals/customs?tab=permits' },
      });
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
router.post('/utilize', authMiddleware, requireRole('BANKS', 'BANK_ADMIN'), async (req, res) => {
  try {
    const { permitId } = req.body;

    const result = await fabricService.invokeChaincode('UtilizeExportPermit', [permitId], 'BanksMSP');

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
router.post('/settle', authMiddleware, requireRole('BANKS', 'BANK_ADMIN'), async (req, res) => {
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
router.get('/:permitId', authMiddleware, async (req, res) => {
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
router.get('/exporter/:exporterId', authMiddleware, async (req, res) => {
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
router.get('/outstanding/all', authMiddleware, async (req, res) => {
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
