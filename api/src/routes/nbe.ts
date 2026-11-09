// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// National Bank of Ethiopia (NBE) Routes - Forex Management

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();

/** Repatriation IDs must pass the chaincode ValidateID rule (alphanumerics, '-' and '_' only, max 100 chars). */
function sanitizeChainId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return (cleaned || 'REP').slice(0, 100);
}

/**
 * GET /api/v1/nbe/forex
 * Get all forex allocations
 */
router.get('/forex', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM forex_allocations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const allocations = await postgresDb.all(query, params);
    
    res.json({
      success: true,
      data: allocations,
      count: allocations.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error fetching forex allocations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch forex allocations'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/nbe/forex/:forexId/approve
 * Approve forex allocation
 */
router.post('/forex/:forexId/approve', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { forexId } = req.params;
    const { approvalNotes } = req.body;
    const user = (req as any).user;
    
    logger.info(`[NBE] Approving forex allocation: ${forexId}`);
    
    // Get database instance
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Get user_id for approved_by (it's an INTEGER column)
    const userRecord = await db.get('SELECT id FROM users WHERE username = $1', [user?.username || 'nbe_admin']);
    const userId = userRecord?.id || null;

    // The allocation must exist. This handler previously UPDATE'd
    // unconditionally and returned 200 APPROVED for a forexId with no
    // matching row (0 rows updated, phantom success).
    // Callers pass whichever identifier they hold: the allocation_id,
    // the forex_id, or the numeric row id. allocation_id and forex_id
    // are both UNIQUE on forex_allocations, so matching all three
    // cannot match two different rows.
    const allocation = await db.get(
      `SELECT id, status FROM forex_allocations
       WHERE allocation_id = $1 OR forex_id = $1 OR CAST(id AS TEXT) = $1`,
      [forexId]
    );
    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Forex allocation not found' },
        timestamp: new Date().toISOString()
      });
    }
    // The chaincode state machine (forex.go) has no APPROVED state: a
    // forex request is confirmed by NBE (REQUESTED → CONFIRMED via
    // ConfirmForex) and then allocated. The old handler wrote a Postgres-
    // only 'APPROVED' that the chaincode, the statusManager FOREX table
    // and the confirm route never produce, so the same allocation read
    // as APPROVED in Postgres and REQUESTED on the ledger. Reject if it
    // is already past the confirm step (CONFIRMED/ALLOCATED/UTILIZED/
    // REPATRIATED, plus APPROVED rows written by the old handler).
    if (['CONFIRMED', 'ALLOCATED', 'UTILIZED', 'REPATRIATED', 'APPROVED'].includes(String(allocation.status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot approve forex allocation. Current status: ${allocation.status}.`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Best-effort chain confirmation: ConfirmForex (REQUESTED → CONFIRMED,
    // NBE only). A chain failure must not fail the approval — the Postgres
    // record is what the portal reads — but it is reported honestly.
    let blockchainSynced = false;
    let blockchainWarning: string | null = null;
    try {
      const chainResult = await fabricService.invokeChaincode('ConfirmForex', [
        forexId,
        user?.username || 'NBE Officer',
        new Date().toISOString()
      ]);
      if (chainResult.success) {
        blockchainSynced = true;
      } else {
        blockchainWarning = `Chaincode ConfirmForex did not confirm ${forexId}: ${chainResult.error || 'unknown error'}`;
        logger.warn(`[NBE] ${blockchainWarning}`);
      }
    } catch (chainError: any) {
      blockchainWarning = `Could not confirm ${forexId} on the ledger (no Fabric here?): ${chainError.message}`;
      logger.warn(`[NBE] ${blockchainWarning}`);
    }
    
    // Update forex allocation status to confirmed (the chaincode state)
    await db.run(`
      UPDATE forex_allocations
      SET status = 'CONFIRMED',
          approved_by = $1,
          approval_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE allocation_id = $2 OR forex_id = $2 OR CAST(id AS TEXT) = $2
    `, [userId, forexId]);
    
    logger.info(`[NBE] ✅ Forex allocation confirmed: ${forexId} (blockchainSynced: ${blockchainSynced})`);
    
    res.json({
      success: true,
      data: {
        forexId,
        status: 'CONFIRMED',
        approvedBy: user?.username || 'NBE Officer',
        approvalNotes,
        blockchainSynced,
        blockchainWarning
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error approving forex allocation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to approve forex allocation'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Mirror a Postgres repatriation onto the ledger.
 *
 * GET /repatriation/ reads the chain only, while this route used to write
 * Postgres only — so repatriations never appeared in the NBE portal's
 * repatriation list. This best-effort sync derives every chain input from
 * the database and never invents an id or an amount:
 *   - InitiateRepatriation needs a SETTLED on-chain payment matching the
 *     allocation's contract/exporter/currency, plus the ledger shipment's
 *     departure / bill-of-lading date and an active COFFEE retention
 *     policy. An existing on-chain repatriation for the payment is reused.
 *   - RecordRepatriation then records the split (retention % retained in
 *     forex, the rest converted) at the active ledger exchange rate,
 *     which the chaincode requires to match exactly.
 * Both chaincode calls must be submitted as BanksMSP: the request runs
 * under the NBE officer's JWT (NBEMSP), so connectAsOrg('BanksMSP')
 * would refuse — invokeChaincode(fn, args, 'BanksMSP') overrides the
 * request MSP instead. Any failure leaves the Postgres record intact
 * and is reported as blockchainSynced: false with a reason; it never
 * fails the request.
 */
async function syncRepatriationToChain(
  db: DatabaseService,
  allocation: any,
  input: { forexId: string; repatriationAmount: number; bankReference?: string }
): Promise<{ synced: boolean; repatriationId?: string; txId?: string; warning?: string }> {
  const fail = (warning: string): { synced: boolean; warning: string } => ({ synced: false, warning });
  try {
    const contractId: string | undefined = allocation.contract_id;
    const exporterId: string | undefined = allocation.exporter_id;
    const shipmentId: string | undefined = allocation.shipment_id;
    if (!contractId || !exporterId || !shipmentId) {
      return fail('Allocation has no linked contract, exporter or shipment, so the chain write was skipped (InitiateRepatriation needs all three)');
    }

    // Find the payment for this shipment / LC in Postgres, then verify it
    // is SETTLED on the ledger — the chaincode refuses anything else.
    const payment = await db.get(
      `SELECT payment_id, amount, currency FROM payments
       WHERE shipment_id = $1 OR lc_number = $2
       ORDER BY created_at DESC LIMIT 1`,
      [shipmentId, allocation.lc_number || null]
    );
    if (!payment?.payment_id) {
      return fail('No payment found for this shipment/LC, so the chain write was skipped (InitiateRepatriation requires a settled payment)');
    }
    const currency = String(allocation.currency || payment.currency || 'USD').toUpperCase();

    let ledgerPayment: any;
    try {
      const read = await fabricService.evaluateTransaction('ReadPayment', payment.payment_id);
      ledgerPayment = read?.data;
    } catch (readError: any) {
      return fail(`Ledger payment ${payment.payment_id} could not be read (${readError.message}); chain write skipped`);
    }
    if (!ledgerPayment) {
      return fail(`Ledger payment ${payment.payment_id} does not exist; chain write skipped`);
    }
    if (String(ledgerPayment.status).toUpperCase() !== 'SETTLED') {
      return fail(`Ledger payment ${payment.payment_id} is ${ledgerPayment.status}, not SETTLED; chain write skipped (InitiateRepatriation requires a settled payment)`);
    }
    if (ledgerPayment.contractId !== contractId || ledgerPayment.exporterId !== exporterId || String(ledgerPayment.currency || '').toUpperCase() !== currency) {
      return fail('Ledger payment does not match this allocation (contract/exporter/currency); chain write skipped');
    }

    const exportAmount = Number(allocation.allocated_amount ?? allocation.amount_usd ?? allocation.amount ?? input.repatriationAmount);
    if (!Number.isFinite(exportAmount) || exportAmount <= 0) {
      return fail('No usable export amount on the allocation; chain write skipped');
    }
    const amount = Number(input.repatriationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail('No usable repatriation amount; chain write skipped');
    }

    // Reuse an existing on-chain repatriation for this payment if there is one.
    let repatriationId: string | null = null;
    try {
      const existing = await fabricService.evaluateTransaction('QueryRepatriationsByPayment', payment.payment_id);
      const list = Array.isArray(existing?.data) ? existing.data : [];
      if (list.length > 0) {
        repatriationId = String(list[0].repatriationId || list[0].repatriationID || '');
      }
    } catch {
      // No existing repatriation found — initiate a new one below.
    }

    if (!repatriationId) {
      // InitiateRepatriation requires the shipment date to equal the ledger
      // shipment's departureFromAddis or billOfLadingDate.
      let shipmentDate = '';
      try {
        const chainShipment = await fabricService.evaluateTransaction('ReadShipment', shipmentId);
        const ship = chainShipment?.data;
        shipmentDate = String(ship?.departureFromAddis || ship?.billOfLadingDate || '').slice(0, 10);
      } catch (shipmentError: any) {
        return fail(`Ledger shipment ${shipmentId} could not be read (${shipmentError.message}); chain write skipped`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(shipmentDate)) {
        return fail('Ledger shipment has no departure or bill-of-lading date; chain write skipped (InitiateRepatriation requires the ledger shipment date)');
      }
      repatriationId = sanitizeChainId(`REP-${input.forexId}`);
      const initiate = await fabricService.invokeChaincode('InitiateRepatriation', [
        repatriationId,
        payment.payment_id,
        contractId,
        shipmentId,
        exporterId,
        String(exportAmount),
        currency,
        String(allocation.fcy_account_number || ''),
        '', // fcyBank — not stored on the allocation
        '', // fcyBankBIC — not stored on the allocation
        shipmentDate,
      ], 'BanksMSP');
      if (!initiate?.success) {
        return fail(`InitiateRepatriation was rejected on-chain: ${initiate?.error || 'unknown error'}`);
      }
    }

    // Record the split at the active ledger exchange rate — the chaincode
    // requires the submitted rate to match GetCurrentExchangeRate exactly.
    const retentionPctRaw = Number(allocation.retention_percentage ?? allocation.retention_rate ?? 40);
    const retentionPct = Number.isFinite(retentionPctRaw) && retentionPctRaw > 0 && retentionPctRaw < 100 ? retentionPctRaw : 40;
    const repatriatedAmount = +(amount * retentionPct / 100).toFixed(2);
    const convertedAmount = +(amount * (100 - retentionPct) / 100).toFixed(2);
    let rate = Number(allocation.exchange_rate);
    try {
      const liveRate = await fabricService.evaluateTransaction('GetCurrentExchangeRate', currency);
      const mid = Number(liveRate?.data?.midRate ?? liveRate?.data?.sellingRate ?? liveRate?.data?.buyingRate);
      if (Number.isFinite(mid) && mid > 0) rate = mid;
    } catch {
      // Keep the allocation's rate.
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      return fail('No usable exchange rate for the ledger; chain write skipped after initiate');
    }
    const record = await fabricService.invokeChaincode('RecordRepatriation', [
      repatriationId,
      String(repatriatedAmount),
      String(convertedAmount),
      String(rate),
      String(input.bankReference || ''),
      '', // bankCertificate — not collected by this endpoint
    ], 'BanksMSP');
    if (!record?.success) {
      return {
        synced: false,
        repatriationId,
        warning: `Repatriation ${repatriationId} was initiated on-chain but RecordRepatriation was rejected: ${record?.error || 'unknown error'}`,
      };
    }
    return { synced: true, repatriationId, txId: (record as any)?.txId };
  } catch (error: any) {
    return fail(`Chain write failed: ${error.message}`);
  }
}

/**
 * POST /api/v1/nbe/forex/:forexId/repatriation
 * Record forex repatriation
 */
router.post('/forex/:forexId/repatriation', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { forexId } = req.params;
    const { repatriationAmount, repatriationDate, bankReference, repatriationMethod } = req.body;
    
    logger.info(`[NBE] Recording forex repatriation for: ${forexId}`);
    
    // Get database instance
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();

    // The allocation must exist: without this check the handler
    // returned 200 COMPLETED for a forexId with no matching row
    // (phantom success, same class as the approve handler above).
    // Fetch the full row: the chain sync below needs the linked
    // contract/exporter/shipment, amounts and retention columns.
    const allocation = await db.get(
      `SELECT * FROM forex_allocations
       WHERE allocation_id = $1 OR forex_id = $1 OR CAST(id AS TEXT) = $1`,
      [forexId]
    );
    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Forex allocation not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if forex_repatriations table exists, if not use forex_allocations
    try {
      // Try to insert into forex_repatriations table
      await db.run(`
        INSERT INTO forex_repatriations (
          forex_allocation_id, repatriation_amount, repatriation_date,
          bank_reference, repatriation_method, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'COMPLETED', CURRENT_TIMESTAMP)
      `, [
        forexId,
        repatriationAmount,
        repatriationDate || new Date().toISOString().split('T')[0],
        bankReference,
        repatriationMethod || 'Wire Transfer'
      ]);
    } catch (tableError: any) {
      // If table doesn't exist, update forex_allocations table
      if (tableError.message?.includes('does not exist')) {
        logger.info('[NBE] forex_repatriations table not found, updating forex_allocations');
        await db.run(`
          UPDATE forex_allocations
          SET status = 'REPATRIATED',
              repatriation_date = $1,
              repatriation_amount = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE allocation_id = $3 OR forex_id = $3 OR CAST(id AS TEXT) = $3
        `, [
          repatriationDate || new Date().toISOString().split('T')[0],
          repatriationAmount,
          forexId
        ]);
      } else {
        throw tableError;
      }
    }
    
    logger.info(`[NBE] ✅ Forex repatriation recorded: ${forexId}, Amount: ${repatriationAmount}`);

    // Mirror the repatriation onto the ledger: GET /repatriation/ reads
    // the chain only, so without this the NBE portal never showed it.
    // Best-effort — a skipped chain write never fails the request and
    // the Postgres record stays visible in the portal.
    const chainSync = await syncRepatriationToChain(db, allocation, {
      forexId,
      repatriationAmount: Number(repatriationAmount),
      bankReference,
    });
    if (chainSync.synced) {
      logger.info(`[NBE] ✅ Repatriation ${chainSync.repatriationId} synced to chain for ${forexId}`);
    } else {
      logger.warn(`[NBE] Repatriation ${forexId} recorded in Postgres only: ${chainSync.warning}`);
    }

    res.json({
      success: true,
      data: {
        forexId,
        repatriationAmount,
        repatriationDate,
        bankReference,
        repatriationMethod,
        status: 'COMPLETED',
        repatriationId: chainSync.repatriationId,
        blockchainSynced: chainSync.synced,
        ...(chainSync.txId ? { blockchainTxId: chainSync.txId } : {}),
        ...(chainSync.warning ? { blockchainWarning: chainSync.warning } : {})
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error recording forex repatriation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record forex repatriation'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/nbe/lc-monitoring
 * Monitor all LCs for NBE oversight
 */
router.get('/lc-monitoring', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[NBE] Fetching LC monitoring data');
    
    const lcs = await postgresDb.all(`
      SELECT * FROM letters_of_credit
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: lcs,
      count: lcs.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error fetching LC monitoring data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch LC monitoring data'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
