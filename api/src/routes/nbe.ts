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
    // ConfirmForex enforces the caller MSP (NBE only), so connect as
    // NBEMSP first: the gateway is otherwise still on the org of the
    // previous call (BanksMSP after a forex request) and the chaincode
    // rejects with "only NBE can confirm forex (caller: BanksMSP)".
    let blockchainSynced = false;
    let blockchainWarning: string | null = null;
    try {
      await fabricService.connectAsOrg('NBEMSP');
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

/**
 * POST /api/v1/nbe/retention-accounts
 * Create or update retention account for an exporter
 * Retention accounts hold the mandatory forex percentage that exporters must retain
 */
router.post('/retention-accounts', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const {
      exporterId,
      accountNumber,
      accountType,
      currency,
      retentionPercentage,
      minimumBalance,
      holdsPolicy,
      notes
    } = req.body;
    
    // Validation
    if (!exporterId || !accountNumber || !currency) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'exporterId, accountNumber, and currency are required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const retentionPct = Number(retentionPercentage || 40);
    if (!Number.isFinite(retentionPct) || retentionPct < 0 || retentionPct > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'retentionPercentage must be between 0 and 100'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info(`[NBE] Creating/updating retention account for exporter: ${exporterId}`);
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    const user = (req as any).user;
    
    // Get user_id for created_by
    const userRecord = await db.get('SELECT id FROM users WHERE username = $1', [user?.username || 'nbe_admin']);
    const userId = userRecord?.id || null;
    
    // Check if account already exists
    const existingAccount = await db.get(
      'SELECT * FROM retention_accounts WHERE exporter_id = $1 AND account_number = $2',
      [exporterId, accountNumber]
    );
    
    let accountId: number;
    let operation: string;
    
    if (existingAccount) {
      // Update existing account
      await db.run(`
        UPDATE retention_accounts
        SET account_type = $1,
            currency = $2,
            retention_percentage = $3,
            minimum_balance = $4,
            holds_policy = $5,
            notes = $6,
            updated_by = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE exporter_id = $8 AND account_number = $9
      `, [
        accountType || existingAccount.account_type,
        currency,
        retentionPct,
        minimumBalance || existingAccount.minimum_balance,
        holdsPolicy || existingAccount.holds_policy,
        notes || existingAccount.notes,
        userId,
        exporterId,
        accountNumber
      ]);
      
      accountId = existingAccount.account_id;
      operation = 'updated';
      logger.info(`[NBE] ✅ Retention account updated: ${accountId}`);
    } else {
      // Create new account
      const result = await db.run(`
        INSERT INTO retention_accounts (
          exporter_id, account_number, account_type, currency,
          retention_percentage, current_balance, minimum_balance,
          holds_policy, status, notes, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING account_id
      `, [
        exporterId,
        accountNumber,
        accountType || 'FOREX_RETENTION',
        currency,
        retentionPct,
        0, // Initial balance
        minimumBalance || 0,
        holdsPolicy || 'STANDARD',
        'ACTIVE',
        notes,
        userId
      ]);
      
      accountId = result?.lastID || result?.account_id;
      operation = 'created';
      logger.info(`[NBE] ✅ Retention account created: ${accountId}`);
    }
    
    // Optional: Record on blockchain
    let blockchainSynced = false;
    let blockchainTxId: string | undefined;
    try {
      const chainResult = await fabricService.invokeChaincode('RecordRetentionAccount', [
        String(accountId),
        exporterId,
        accountNumber,
        currency,
        String(retentionPct),
        user?.username || 'NBE Officer',
        new Date().toISOString()
      ]);
      if (chainResult.success) {
        blockchainSynced = true;
        blockchainTxId = (chainResult as any)?.txId;
      }
    } catch (chainError: any) {
      logger.warn(`[NBE] Blockchain sync failed for retention account: ${chainError.message}`);
    }
    
    res.json({
      success: true,
      data: {
        accountId,
        exporterId,
        accountNumber,
        accountType: accountType || 'FOREX_RETENTION',
        currency,
        retentionPercentage: retentionPct,
        status: 'ACTIVE',
        operation,
        blockchainSynced,
        ...(blockchainTxId ? { blockchainTxId } : {})
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error managing retention account:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to manage retention account'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/nbe/retention-accounts/:accountId/calculate-penalty
 * Calculate penalty for non-compliance with retention requirements
 */
router.post('/retention-accounts/:accountId/calculate-penalty', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const {
      violationType,
      requiredAmount,
      actualAmount,
      violationStartDate,
      violationEndDate,
      notes
    } = req.body;
    
    // Validation
    if (!violationType || requiredAmount === undefined || actualAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'violationType, requiredAmount, and actualAmount are required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info(`[NBE] Calculating penalty for retention account: ${accountId}`);
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    const user = (req as any).user;
    
    // Get user_id for calculated_by
    const userRecord = await db.get('SELECT id FROM users WHERE username = $1', [user?.username || 'nbe_admin']);
    const userId = userRecord?.id || null;
    
    // Verify retention account exists
    const account = await db.get(
      'SELECT * FROM retention_accounts WHERE account_id = $1',
      [accountId]
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Retention account not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Calculate penalty based on violation type and NBE regulations
    const required = Number(requiredAmount);
    const actual = Number(actualAmount);
    const shortfall = Math.max(0, required - actual);
    
    // Penalty calculation logic (based on NBE regulations)
    let penaltyRate = 0;
    let penaltyDescription = '';
    
    switch (violationType) {
      case 'UNDER_RETENTION':
        // Penalty: 2% per month on the shortfall amount
        penaltyRate = 0.02; // 2% monthly
        penaltyDescription = 'Under-retention penalty: 2% per month on shortfall amount';
        break;
      case 'LATE_REPATRIATION':
        // Penalty: 1.5% per month on late amount
        penaltyRate = 0.015; // 1.5% monthly
        penaltyDescription = 'Late repatriation penalty: 1.5% per month';
        break;
      case 'UNAUTHORIZED_WITHDRAWAL':
        // Penalty: 5% of withdrawn amount
        penaltyRate = 0.05; // 5% one-time
        penaltyDescription = 'Unauthorized withdrawal penalty: 5% of amount';
        break;
      case 'POLICY_VIOLATION':
        // Penalty: 3% of violation amount
        penaltyRate = 0.03; // 3% one-time
        penaltyDescription = 'Policy violation penalty: 3% of amount';
        break;
      default:
        penaltyRate = 0.01; // 1% default
        penaltyDescription = 'General non-compliance penalty: 1%';
    }
    
    // Calculate number of months for time-based penalties
    let months = 1;
    if (violationStartDate && violationEndDate) {
      const start = new Date(violationStartDate);
      const end = new Date(violationEndDate);
      const daysDiff = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      months = Math.max(1, Math.round(daysDiff / 30)); // Use Math.round instead of Math.ceil for more accurate month calculation
    }
    
    const baseAmount = violationType === 'UNDER_RETENTION' ? shortfall : required;
    const penaltyAmount = +(baseAmount * penaltyRate * months).toFixed(2);
    const totalOwed = +(shortfall + penaltyAmount).toFixed(2);
    
    // Record penalty in database
    const result = await db.run(`
      INSERT INTO retention_penalties (
        account_id, violation_type, required_amount, actual_amount,
        shortfall_amount, penalty_rate, penalty_amount, total_owed,
        violation_start_date, violation_end_date, violation_duration_months,
        penalty_description, notes, calculated_by, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      RETURNING penalty_id
    `, [
      accountId,
      violationType,
      required,
      actual,
      shortfall,
      penaltyRate,
      penaltyAmount,
      totalOwed,
      violationStartDate || null,
      violationEndDate || null,
      months,
      penaltyDescription,
      notes,
      userId,
      'CALCULATED'
    ]);
    
    const penaltyId = result?.lastID || result?.penalty_id;
    
    logger.info(`[NBE] ✅ Penalty calculated: ${penaltyId}, Amount: ${penaltyAmount}`);
    
    // Optional: Record on blockchain
    let blockchainSynced = false;
    try {
      const chainResult = await fabricService.invokeChaincode('RecordRetentionPenalty', [
        String(penaltyId),
        String(accountId),
        account.exporter_id,
        violationType,
        String(penaltyAmount),
        account.currency,
        user?.username || 'NBE Officer',
        new Date().toISOString()
      ]);
      if (chainResult.success) {
        blockchainSynced = true;
      }
    } catch (chainError: any) {
      logger.warn(`[NBE] Blockchain sync failed for penalty: ${chainError.message}`);
    }
    
    res.json({
      success: true,
      data: {
        penaltyId,
        accountId,
        exporterId: account.exporter_id,
        violationType,
        requiredAmount: required,
        actualAmount: actual,
        shortfallAmount: shortfall,
        penaltyRate,
        penaltyAmount,
        totalOwed,
        violationDurationMonths: months,
        penaltyDescription,
        currency: account.currency,
        status: 'CALCULATED',
        blockchainSynced
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error calculating penalty:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to calculate penalty'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/nbe/waiver-requests
 * Submit a waiver request for penalty or retention requirement
 */
router.post('/waiver-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      requestType,
      exporterId,
      accountId,
      penaltyId,
      waiverAmount,
      justification,
      supportingDocuments
    } = req.body;
    
    // Validation
    if (!requestType || !exporterId || !justification) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestType, exporterId, and justification are required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['PENALTY_WAIVER', 'RETENTION_REDUCTION', 'COMPLIANCE_EXTENSION'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestType must be PENALTY_WAIVER, RETENTION_REDUCTION, or COMPLIANCE_EXTENSION'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info(`[NBE] Submitting waiver request for exporter: ${exporterId}`);
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    const user = (req as any).user;
    
    // Get user_id for requested_by
    const userRecord = await db.get('SELECT id FROM users WHERE username = $1', [user?.username]);
    const userId = userRecord?.id || null;
    
    // Verify exporter exists
    const exporter = await db.get(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [exporterId, 'EXPORTER']
    );
    
    if (!exporter) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Exporter not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // If penalty waiver, verify penalty exists
    if (requestType === 'PENALTY_WAIVER' && penaltyId) {
      const penalty = await db.get(
        'SELECT * FROM retention_penalties WHERE penalty_id = $1',
        [penaltyId]
      );
      
      if (!penalty) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Penalty not found'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Create waiver request
    const result = await db.run(`
      INSERT INTO retention_waivers (
        request_type, exporter_id, account_id, penalty_id,
        waiver_amount, justification, supporting_documents,
        requested_by, request_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING waiver_id
    `, [
      requestType,
      exporterId,
      accountId || null,
      penaltyId || null,
      waiverAmount || null,
      justification,
      supportingDocuments ? JSON.stringify(supportingDocuments) : null,
      userId,
      'PENDING'
    ]);
    
    const waiverId = result?.lastID || result?.waiver_id;
    
    logger.info(`[NBE] ✅ Waiver request submitted: ${waiverId}`);
    
    // Optional: Record on blockchain
    let blockchainSynced = false;
    try {
      const chainResult = await fabricService.invokeChaincode('RecordWaiverRequest', [
        String(waiverId),
        requestType,
        exporterId,
        justification.substring(0, 200), // Limit justification length for chain
        user?.username || 'Exporter',
        new Date().toISOString()
      ]);
      if (chainResult.success) {
        blockchainSynced = true;
      }
    } catch (chainError: any) {
      logger.warn(`[NBE] Blockchain sync failed for waiver request: ${chainError.message}`);
    }
    
    res.json({
      success: true,
      data: {
        waiverId,
        requestType,
        exporterId,
        accountId,
        penaltyId,
        waiverAmount,
        requestStatus: 'PENDING',
        submittedBy: user?.username,
        submittedAt: new Date().toISOString(),
        blockchainSynced
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error submitting waiver request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to submit waiver request'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/nbe/compliance-tracking
 * Track overall compliance with retention requirements across all exporters
 */
router.get('/compliance-tracking', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { exporterId, status, startDate, endDate } = req.query;
    
    logger.info('[NBE] Fetching compliance tracking data');
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Build compliance tracking query
    let query = `
      SELECT 
        ra.account_id,
        ra.exporter_id,
        u.username as exporter_name,
        u.full_name,
        ra.account_number,
        ra.currency,
        ra.retention_percentage,
        ra.current_balance,
        ra.minimum_balance,
        ra.status as account_status,
        COUNT(DISTINCT rp.penalty_id) as total_penalties,
        COALESCE(SUM(rp.penalty_amount), 0) as total_penalty_amount,
        COUNT(DISTINCT CASE WHEN rp.status = 'UNPAID' THEN rp.penalty_id END) as unpaid_penalties,
        COALESCE(SUM(CASE WHEN rp.status = 'UNPAID' THEN rp.penalty_amount ELSE 0 END), 0) as unpaid_penalty_amount,
        COUNT(DISTINCT rw.waiver_id) as total_waiver_requests,
        COUNT(DISTINCT CASE WHEN rw.request_status = 'PENDING' THEN rw.waiver_id END) as pending_waivers,
        CASE 
          WHEN ra.current_balance >= (ra.minimum_balance) THEN 'COMPLIANT'
          WHEN ra.current_balance >= (ra.minimum_balance * 0.8) THEN 'AT_RISK'
          ELSE 'NON_COMPLIANT'
        END as compliance_status,
        ra.created_at,
        ra.updated_at
      FROM retention_accounts ra
      LEFT JOIN users u ON ra.exporter_id = u.id
      LEFT JOIN retention_penalties rp ON ra.account_id = rp.account_id
      LEFT JOIN retention_waivers rw ON ra.account_id = rw.account_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (exporterId) {
      query += ` AND ra.exporter_id = $${paramIndex}`;
      params.push(exporterId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND ra.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND ra.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND ra.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += `
      GROUP BY ra.account_id, ra.exporter_id, u.username, u.full_name, 
               ra.account_number, ra.currency, ra.retention_percentage,
               ra.current_balance, ra.minimum_balance, ra.status,
               ra.created_at, ra.updated_at
      ORDER BY 
        CASE 
          WHEN ra.current_balance < ra.minimum_balance THEN 1
          WHEN ra.current_balance < (ra.minimum_balance * 0.8) THEN 2
          ELSE 3
        END,
        ra.updated_at DESC
    `;
    
    const complianceData = await db.all(query, params);
    
    // Calculate summary statistics
    const summary = {
      totalAccounts: complianceData.length,
      compliantAccounts: complianceData.filter((a: any) => a.compliance_status === 'COMPLIANT').length,
      atRiskAccounts: complianceData.filter((a: any) => a.compliance_status === 'AT_RISK').length,
      nonCompliantAccounts: complianceData.filter((a: any) => a.compliance_status === 'NON_COMPLIANT').length,
      totalPenalties: complianceData.reduce((sum: number, a: any) => sum + Number(a.total_penalties || 0), 0),
      totalPenaltyAmount: complianceData.reduce((sum: number, a: any) => sum + Number(a.total_penalty_amount || 0), 0),
      unpaidPenalties: complianceData.reduce((sum: number, a: any) => sum + Number(a.unpaid_penalties || 0), 0),
      unpaidPenaltyAmount: complianceData.reduce((sum: number, a: any) => sum + Number(a.unpaid_penalty_amount || 0), 0),
      pendingWaivers: complianceData.reduce((sum: number, a: any) => sum + Number(a.pending_waivers || 0), 0)
    };
    
    logger.info(`[NBE] ✅ Compliance tracking data fetched: ${complianceData.length} accounts`);
    
    res.json({
      success: true,
      data: {
        accounts: complianceData,
        summary
      },
      count: complianceData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error fetching compliance tracking data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch compliance tracking data'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
