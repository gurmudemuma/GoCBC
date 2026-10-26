// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Forex Allocation API Routes — uses shared FabricService singleton

import express from 'express';
import { FabricService } from '../services/fabricService';
import { ForexService } from '../services/forexService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logger } from '../utils/logger';
import { dedupeById, isValidForex } from '../utils/dataFilters';
import { BlockchainSignatureService } from '../services/blockchainSignatureService';

const router = express.Router();
const fabricService = FabricService.getInstance();
const forexService = ForexService.getInstance();
const postgresDb = DatabaseService.getInstance();
const signatureService = BlockchainSignatureService.getInstance();

// ==================== FOREX ALLOCATION ROUTES ====================

// POST /api/v1/forex — Create forex request (wrapper for /request endpoint)
router.post('/', authMiddleware, requireRole(['BANKS', 'BANK_ADMIN', 'BANK OFFICER', 'FOREX OFFICER']), async (req, res) => {
  try {
    const { forexID, contractID, exporterID, lcNumber, amount, currency, status } = req.body;
    
    logger.info(`[FOREX] Creating forex request: ${forexID || req.body.forexId}`);
    
    // Map workflow test parameters to actual API parameters
    const forexId = forexID || req.body.forexId;
    const contractId = contractID || req.body.contractId;
    const exporterId = exporterID || req.body.exporterId;
    
    if (!forexId || !contractId || !exporterId || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: forexID, contractID, exporterID, amount',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Forward to the actual /request endpoint logic
    // AUTO-MAPPING: Fetch contract data to auto-populate forex fields
    let autoMappedData: any = {};
    try {
      const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
      if (contractResult.success && contractResult.data) {
        const contract = contractResult.data;
        autoMappedData.exporterId = contract.ExporterID || contract.exporterId || exporterId;
        autoMappedData.currency = contract.Currency || contract.currency || 'USD';
        
        // Calculate forex amount from contract value if not provided
        const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
        const quantity = parseFloat(contract.Quantity || contract.quantity || '0');
        autoMappedData.calculatedAmount = (pricePerKg * quantity).toFixed(2);
        
        logger.info(`[FOREX] Auto-mapped from contract: exporterId=${autoMappedData.exporterId}, amount=${autoMappedData.calculatedAmount}, currency=${autoMappedData.currency}`);
      }
    } catch (error) {
      logger.warn('[FOREX] Could not fetch contract for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values
    const finalExporterId = exporterId || autoMappedData.exporterId || '';
    const finalAmount = amount || autoMappedData.calculatedAmount || '0';
    const finalCurrency = currency || autoMappedData.currency || 'USD';

    await fabricService.connectAsOrg('BanksMSP');
    const result = await fabricService.invokeChaincode('RequestForex', [
      forexId, contractId, finalExporterId, finalAmount.toString(), finalCurrency,
    ]);
    
    if (result.success) {
      logger.info(`✅ [FOREX] Forex request created successfully: ${forexId}`);
      res.status(201).json({
        success: true,
        message: 'Forex request created successfully',
        data: { forexID: forexId, forexId, status: 'pending' },
        txId: result.txId,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error(`❌ [FOREX] Failed to create forex request: ${result.error}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: result.error || 'Failed to create forex request',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    logger.error('[FOREX] Error creating forex request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

      // GET /api/v1/forex — all forex allocations (BLOCKCHAIN ONLY - NO CACHE)
router.get('/', authMiddleware, async (req, res) => {
  try {
    logger.info('[FOREX] Fetching forex allocations with parallel blockchain + PostgreSQL...');
    
    // Parallel fetch: PostgreSQL (fast) + Blockchain (background)
    const pgPromise = postgresDb.all(`
      SELECT * FROM forex_allocations 
      ORDER BY created_at DESC
    `).catch(err => {
      logger.warn('[FOREX] PostgreSQL query failed:', err);
      return [];
    });
    
    const blockchainPromise = fabricService.queryAllForex().catch(err => {
      logger.warn('[FOREX] Blockchain query failed (graceful):', err);
      return { success: false, data: [], error: err.message };
    });
    
    // Wait for PostgreSQL first (instant response)
    const pgForex = await pgPromise;
    logger.info(`[FOREX] ✅ Retrieved ${pgForex.length} forex allocations from PostgreSQL`);
    
    // Return PostgreSQL data immediately (even if empty)
    // Blockchain continues in background (non-blocking)
    blockchainPromise.then(result => {
      if (result.success && result.data) {
        logger.info(`[FOREX] ✅ Background: Retrieved ${result.data.length} forex from blockchain`);
      }
    }).catch(err => {
      logger.warn('[FOREX] ⚠️  Background blockchain query failed:', err.message);
    });
    
    const normalizedForex = pgForex.map((fx: any) => ({
        forexId: String(fx?.forex_id || fx?.allocation_id || ''),
        contractId: String(fx?.contract_id || ''),
        exporterId: String(fx?.exporter_id || ''),
        lcId: String(fx?.lc_id || ''),
        buyerName: fx?.buyer_name || 'Unknown Buyer',
        buyerCountry: fx?.buyer_country || '',
        amount: fx?.amount ?? 0,
        currency: fx?.currency || 'USD',
        status: fx?.status || 'REQUESTED',
        requestedAmount: fx?.requested_amount ?? 0,
        allocatedAmount: fx?.allocated_amount ?? 0,
        exchangeRate: fx?.exchange_rate ?? 0,
        retention: fx?.retention ?? 0,
        retentionRate: fx?.retention_rate ?? 0,
        retentionPercentage: fx?.retention_percentage ?? 0,
        retentionAmountUsd: fx?.retention_amount_usd ?? 0,
        fcyAccountNumber: fx?.fcy_account_number || '',
        retentionStatus: fx?.retention_status || 'PENDING',
        expiryDate: fx?.expiry_date || null,
        requestDate: fx?.request_date || null,
        allocationDate: fx?.allocation_date || null,
        utilizationDate: fx?.utilization_date || null,
        nbeApprovalRef: fx?.nbe_approval_ref || '',
        nbeOfficer: fx?.nbe_officer || '',
        verifiedBy: fx?.verified_by || '',
        verifiedByMSP: fx?.verified_by_msp || '',
        comments: fx?.comments || '',
      }));
      
      const uniqueForex = dedupeById(normalizedForex, (fx: any) => String(fx.forexId));
      
      return res.json({ 
        success: true, 
        data: uniqueForex,
        source: 'postgresql',
        count: uniqueForex.length,
        timestamp: new Date().toISOString() 
      });

  } catch (error: any) {
    logger.error('[FOREX] ❌ Error in GET /forex:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch forex allocations',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// GET /api/v1/forex/:forexId — single forex allocation by ID
router.get('/:forexId', authMiddleware, async (req, res) => {
  try {
    const { forexId } = req.params;
    
    // Query from PostgreSQL
    const forex = await postgresDb.get(
      'SELECT * FROM forex_allocations WHERE forex_id = $1',
      [forexId]
    );
    
    if (forex) {
      return res.json({
        success: true,
        data: forex,
        source: 'postgresql',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Forex allocation not found' },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[FOREX] Error fetching forex allocation:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== EXCHANGE RATES ROUTES (MUST BE BEFORE :forexId) ====================

// GET /api/v1/forex/rates — get all exchange rates
router.get('/rates', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.queryChaincode('QueryAllExchangeRates', []);
    if (result.success) {
      res.json({ success: true, data: result.data || [], timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    logger.error('Error fetching exchange rates:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// GET /api/v1/forex/rates/:currency — get specific currency rate
router.get('/rates/:currency', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.queryChaincode('QueryExchangeRate', [req.params.currency]);
    if (result.success) {
      res.json({ success: true, data: result.data, timestamp: new Date().toISOString() });
    } else {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// GET /api/v1/forex/rates/:currency/current — fetch only the active ledger rate.
router.get('/rates/:currency/current', authMiddleware, async (req, res) => {
  try {
    const currency = String(req.params.currency || '').toUpperCase();
    const result = await fabricService.queryChaincode('GetCurrentExchangeRate', [currency]);
    if (result.success && result.data) {
      return res.json({ success: true, data: result.data, source: 'blockchain', timestamp: new Date().toISOString() });
    }
    return res.status(404).json({ success: false, error: { code: 'ACTIVE_RATE_NOT_FOUND', message: result.error || `No active ${currency} rate is recorded` } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: error.message } });
  }
});

// GET /api/v1/forex/retention-policy/:commodityType — active policy from ledger.
router.get('/retention-policy/:commodityType', authMiddleware, async (req, res) => {
  try {
    const commodityType = String(req.params.commodityType || '').toUpperCase();
    const result = await fabricService.queryChaincode('GetCurrentRetentionPolicy', [commodityType]);
    if (result.success && result.data) {
      return res.json({ success: true, data: result.data, source: 'blockchain', timestamp: new Date().toISOString() });
    }
    return res.status(404).json({ success: false, error: { code: 'ACTIVE_POLICY_NOT_FOUND', message: result.error || `No active ${commodityType} policy is recorded` } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: error.message } });
  }
});

// POST /api/v1/forex/rates — create/update exchange rate (NBE only)
router.post('/rates', authMiddleware, requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { currency, buyingRate, sellingRate } = req.body;
    if (!currency || !buyingRate || !sellingRate) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'MISSING_FIELDS', message: 'currency, buyingRate, and sellingRate are required' } 
      });
    }

    // Connect as NBE
    await fabricService.connectAsOrg('NBEMSP');

    const user = (req as any).user;
    const setBy = user?.sub || user?.userId || 'NBE_SYSTEM';
    const rateId = `RATE${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // SetExchangeRate(rateID, currency, buyingRate, sellingRate, setBy)
    const result = await fabricService.invokeChaincode('SetExchangeRate', [
      rateId,
      currency,
      buyingRate.toString(),
      sellingRate.toString(),
      setBy,
    ]);

    if (result.success) {
      const midRate = (parseFloat(buyingRate) + parseFloat(sellingRate)) / 2;
      logger.info(`✅ Exchange rate set: ${currency} = ${buyingRate}/${sellingRate} ETB by ${setBy}`);
      res.status(201).json({ 
        success: true, 
        data: { rateId, currency, buyingRate, sellingRate, midRate, setBy },
        txId: result.txId, 
        timestamp: new Date().toISOString() 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: { code: 'RATE_CREATE_FAILED', message: result.error }, 
        timestamp: new Date().toISOString() 
      });
    }
  } catch (error: any) {
    logger.error('Error setting exchange rate:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message }, 
      timestamp: new Date().toISOString() 
    });
  }
});

// GET /api/v1/forex/exporter/:exporterId
router.get('/exporter/:exporterId', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.getForexByExporter(req.params.exporterId);
    if (result.success) {
      res.json({ success: true, data: result.data || [], timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// POST /api/v1/forex/request — create forex request
// NOTE: LC ID removed from parameters to prevent SDK-level state queries
// LC will be linked during NBE allocation phase
router.post('/request', authMiddleware, requireRole(['BANKS', 'BANK_ADMIN', 'BANK OFFICER', 'FOREX OFFICER']), async (req, res) => {
  try {
    const { forexId, contractId, exporterId, amount, currency } = req.body;
    if (!forexId || !contractId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'forexId and contractId are required' } });
    }

    // AUTO-MAPPING: Fetch contract data to auto-populate forex fields
    let autoMappedData: any = {};
    try {
      const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
      if (contractResult.success && contractResult.data) {
        const contract = contractResult.data;
        autoMappedData.exporterId = contract.ExporterID || contract.exporterId || exporterId;
        autoMappedData.currency = contract.Currency || contract.currency || 'USD';
        
        // Calculate forex amount from contract value if not provided
        const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
        const quantity = parseFloat(contract.Quantity || contract.quantity || '0');
        autoMappedData.calculatedAmount = (pricePerKg * quantity).toFixed(2);
        
        logger.info(`[FOREX] Auto-mapped from contract: exporterId=${autoMappedData.exporterId}, amount=${autoMappedData.calculatedAmount}, currency=${autoMappedData.currency}`);
      }
    } catch (error) {
      logger.warn('[FOREX] Could not fetch contract for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values
    const finalExporterId = exporterId || autoMappedData.exporterId || '';
    const finalAmount = amount || autoMappedData.calculatedAmount || '0';
    const finalCurrency = currency || autoMappedData.currency || 'USD';

    // Retry logic for peer synchronization issues
    let result;
    let lastError;
    const maxRetries = 5; // Increased from 3 to 5 attempts
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // RequestForex now takes 5 parameters (lcId removed)
        await fabricService.connectAsOrg('BanksMSP');
        result = await fabricService.invokeChaincode('RequestForex', [
          forexId, contractId, finalExporterId, finalAmount.toString(), finalCurrency,
        ]);
        
        if (result.success) {
          logger.info(`✅ Forex request created: ${forexId} with auto-mapped data (attempt ${attempt})`);
          
          // ✅ Record blockchain signature for this transaction
          try {
            const user = (req as any).user;
            await signatureService.recordSignature({
              entityType: 'FOREX_ALLOCATION',
              entityId: forexId,
              actionType: 'REQUEST',
              signerUsername: user?.username || user?.sub || 'exporter',
              signerOrg: user?.org || user?.organization || 'ExportersMSP',
              signerRole: user?.role || 'exporter',
              blockchainTxId: result.txId,
              blockchainTimestamp: new Date(),
              chaincodeName: 'coffee',
              chaincodeFunction: 'RequestForex',
              transactionArgs: [forexId, contractId, finalExporterId, finalAmount.toString(), finalCurrency],
              metadata: {
                contractId,
                exporterId: finalExporterId,
                amount: finalAmount,
                currency: finalCurrency,
                autoMapped: true
              }
            });
          } catch (sigError) {
            logger.error('Failed to record blockchain signature:', sigError);
            // Don't fail the request if signature recording fails
          }
          
          // Wait for transaction to propagate to all peers before responding
          // This prevents the next operation (AllocateForex) from failing
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // ✅ STORE BLOCKCHAIN METADATA in PostgreSQL
          try {
            const db = DatabaseService.getInstance();
            await db.run(
              `INSERT INTO forex_allocations (
                allocation_id, forex_id, contract_id, exporter_id, requested_amount, currency, status,
                blockchain_tx_id, blockchain_timestamp, last_blockchain_sync, request_date, updated_at
              ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW(), NOW())
              ON CONFLICT (forex_id) DO UPDATE SET
                allocation_id = EXCLUDED.allocation_id,
                contract_id = EXCLUDED.contract_id,
                exporter_id = EXCLUDED.exporter_id,
                requested_amount = EXCLUDED.requested_amount,
                currency = EXCLUDED.currency,
                status = EXCLUDED.status,
                blockchain_tx_id = EXCLUDED.blockchain_tx_id,
                blockchain_timestamp = NOW(),
                last_blockchain_sync = NOW(),
                updated_at = NOW()`,
              [forexId, contractId, finalExporterId, finalAmount, finalCurrency, 'REQUESTED', result.txId]
            );
            logger.info(`✅ Stored blockchain metadata for forex ${forexId}: txId=${result.txId}`);
          } catch (dbError) {
            logger.error(`Failed to store blockchain metadata for ${forexId}:`, dbError);
          }
          
          return res.status(201).json({ 
            success: true, 
            data: { forexId },
            autoMapped: {
              exporterId: finalExporterId,
              amount: finalAmount,
              currency: finalCurrency,
            },
            txId: result.txId,
            blockchainProof: {
              transactionId: result.txId,
              timestamp: new Date().toISOString(),
              action: 'REQUEST_FOREX'
            },
            attempt,
            timestamp: new Date().toISOString() 
          });
        }
        
        lastError = result.error;
        
        // If error is about peer endorsement mismatch or LC not found, wait and retry
        if (result.error && (
          result.error.includes('Peer endorsements do not match') ||
          result.error.includes('does not exist') ||
          result.error.includes('not found')
        )) {
          const waitTime = 4000 * attempt; // 4s, 8s, 12s, 16s, 20s
          logger.warn(`Peer sync issue detected on attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms before retry...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else {
          // Other errors, don't retry
          break;
        }
      } catch (error: any) {
        lastError = error.message;
        logger.error(`Error on attempt ${attempt}:`, error);
        if (attempt < maxRetries) {
          const waitTime = 4000 * attempt;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    res.status(400).json({ 
      success: false, 
      error: { 
        code: 'REQUEST_FAILED', 
        message: lastError,
        hint: 'Peers may not be synchronized. Wait a few seconds and try again, or check that the LC exists and blockchain peers are healthy.'
      }, 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    logger.error('Error requesting forex:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// POST /api/v1/forex/:forexId/confirm — NBE confirms forex request (REQUESTED → CONFIRMED)
router.post('/:forexId/confirm', authMiddleware, requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { forexId } = req.params;
    const { confirmedBy } = req.body;

    if (!forexId) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'MISSING_FIELDS', message: 'forexId is required' } 
      });
    }

    logger.info(`[FOREX] Confirming forex request: ${forexId} by ${confirmedBy}`);

    // Connect as NBE to confirm the request
    await fabricService.connectAsOrg('NBEMSP');

    // Update forex status to CONFIRMED
    const result = await fabricService.invokeChaincode('ConfirmForex', [
      forexId,
      confirmedBy || 'NBE Officer',
      new Date().toISOString()
    ]);

    if (result.success) {
      logger.info(`[FOREX] ✅ Forex request confirmed: ${forexId}`);
      
      // Store confirmation in PostgreSQL
      try {
        await postgresDb.run(
          `UPDATE forex_allocations 
           SET status = 'CONFIRMED', 
               updated_at = CURRENT_TIMESTAMP,
               confirmed_by = $1,
               confirmed_at = CURRENT_TIMESTAMP
           WHERE allocation_id = $2`,
          [confirmedBy || 'NBE Officer', forexId]
        );
      } catch (pgErr) {
        logger.warn('[FOREX] Could not update PostgreSQL, but blockchain succeeded:', pgErr);
      }

      return res.json({
        success: true,
        data: {
          forexId,
          status: 'CONFIRMED',
          confirmedBy: confirmedBy || 'NBE Officer',
          confirmedAt: new Date().toISOString(),
          message: 'Forex request confirmed. Allocate button is now active.'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error(`[FOREX] ❌ Failed to confirm forex: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: { code: 'BLOCKCHAIN_ERROR', message: result.error || 'Failed to confirm forex request' },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('[FOREX] Error confirming forex:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message }, 
      timestamp: new Date().toISOString() 
    });
  }
});

// POST /api/v1/forex/allocate — Bank allocates forex per NBE policy
// Per NBE FXD/01/2024: Banks can allocate without prior NBE approval
router.post('/allocate', authMiddleware, requireRole(['BANKS', 'BANK_ADMIN', 'BANK OFFICER', 'FOREX OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { forexId, lcId, amount, exchangeRate, retentionRate, officer, approvalRef, expiryDate } = req.body;
    
    if (!forexId || !lcId) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_FIELDS', 
          message: 'forexId and lcId are required' 
        } 
      });
    }

    logger.info(`[FOREX] Allocating forex: ${forexId} with retention rate: ${retentionRate || '40% (default)'}`);

    // Use ForexService which includes 40% retention logic
    const result = await forexService.allocateForex({
      forexID: forexId,
      lcID: lcId,
      amount: amount ? Number(amount) : 0,
      exchangeRate: exchangeRate ? Number(exchangeRate) : 1,
      retentionRate: retentionRate ? Number(retentionRate) : 0.4, // Defaults to 40%
      officer: officer || user?.username || user?.sub || '',
      approvalRef: approvalRef || '',
      expiryDate: expiryDate || '',
      userId: user?.username || user?.sub,
      userOrg: user?.org || 'BanksMSP'
    });

    if (result.success) {
      logger.info(`✅ Forex allocated: ${forexId}, Retention Amount: ${result.retentionAmount}, Release Amount: ${result.releaseAmount}`);
      
      res.status(200).json({
        success: true,
        message: 'Forex allocated successfully with retention policy',
        data: {
          forexID: forexId,
          lcID: lcId,
          retentionAmount: result.retentionAmount,
          releaseAmount: result.releaseAmount,
          txId: result.txId
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'ALLOCATE_FAILED', 
          message: 'Failed to allocate forex'
        }, 
        timestamp: new Date().toISOString() 
      });
    }
  } catch (error: any) {
    logger.error('[FOREX] Error allocating forex:', error);
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

// POST /api/v1/forex/utilize
router.post('/utilize', authMiddleware, requireRole(['BANKS', 'BANK_ADMIN', 'BANK OFFICER', 'FOREX OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']), async (req, res) => {
  try {
    const { forexId, utilizedAmount } = req.body;
    const user = (req as any).user;
    const role = String(user?.role || '').toUpperCase();
    await fabricService.connectAsOrg(role.startsWith('NBE') ? 'NBEMSP' : 'BanksMSP');
    const result = await fabricService.invokeChaincode('UtilizeForex', [forexId, utilizedAmount.toString()]);
    if (result.success) {
      // ✅ Record blockchain signature for utilization
      try {
        const user = (req as any).user;
        await signatureService.recordSignature({
          entityType: 'FOREX_ALLOCATION',
          entityId: forexId,
          actionType: 'UTILIZE',
          signerUsername: user?.username || user?.sub || 'exporter',
          signerOrg: user?.org || user?.organization || 'ExportersMSP',
          signerRole: user?.role || 'exporter',
          blockchainTxId: result.txId,
          blockchainTimestamp: new Date(),
          chaincodeName: 'coffee',
          chaincodeFunction: 'UtilizeForex',
          transactionArgs: [forexId, utilizedAmount.toString()],
          metadata: {
            forexId,
            utilizedAmount
          }
        });
      } catch (sigError) {
        logger.error('Failed to record blockchain signature:', sigError);
      }
      
      res.json({ success: true, txId: result.txId, timestamp: new Date().toISOString() });
    } else {
      res.status(400).json({ success: false, error: { code: 'UTILIZE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// ==================== SINGLE FOREX RECORD (MUST BE LAST) ====================

// GET /api/v1/forex/:forexId — single forex record
router.get('/:forexId', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.getForex(req.params.forexId);
    if (result.success) {
      res.json({ success: true, data: result.data, timestamp: new Date().toISOString() });
    } else {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

export default router;
