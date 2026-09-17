// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Forex Allocation API Routes — uses shared FabricService singleton

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { dedupeById, isValidForex } from '../utils/dataFilters';
import { BlockchainSignatureService } from '../services/blockchainSignatureService';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();
const signatureService = BlockchainSignatureService.getInstance();

// ==================== FOREX ALLOCATION ROUTES ====================

      // GET /api/v1/forex — all forex allocations (BLOCKCHAIN ONLY - NO CACHE)
router.get('/', authMiddleware, async (req, res) => {
  try {
    logger.info('[FOREX] 🔗 Querying all forex DIRECTLY from Hyperledger Fabric blockchain...');
    
    // Query blockchain directly - NO timeout, NO fallback, NO cache
    const result = await fabricService.queryAllForex();
    
    if (!result.success) {
      logger.error(`[FOREX] ❌ Blockchain query failed: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: { 
          code: 'BLOCKCHAIN_QUERY_FAILED', 
          message: result.error || 'Failed to query blockchain' 
        },
        source: 'blockchain',
        timestamp: new Date().toISOString() 
      });
    }

    let blockchainForex = result.data || [];
    logger.info(`[FOREX] ✅ Retrieved ${blockchainForex.length} forex allocations from blockchain`);

    // ✅ ENRICH with buyer data from PostgreSQL
    try {
      const { default: dataEnrichmentService } = await import('../services/dataEnrichmentService');
      blockchainForex = await dataEnrichmentService.enrichForexAllocations(blockchainForex);
      logger.info(`[FOREX] ✅ Enriched ${blockchainForex.length} forex allocations with buyer data`);
    } catch (enrichError) {
      logger.warn('[FOREX] ⚠️  Could not enrich forex with buyer data:', enrichError);
    }

    // Normalize blockchain data with enriched buyer info
    const normalizedForex = blockchainForex.map((fx: any) => ({
      forexId: String(fx?.forexId || fx?.ForexID || ''),
      contractId: String(fx?.contractId || fx?.ContractID || ''),
      exporterId: String(fx?.exporterId || fx?.ExporterID || ''),
      lcId: String(fx?.lcId || fx?.LCID || fx?.lcID || ''),
      buyerName: fx?.buyerName || fx?.BuyerName || 'Unknown Buyer', // ✅ ENRICHED or fallback
      buyerCountry: fx?.buyerCountry || '', // ✅ ENRICHED
      amount: fx?.amount ?? fx?.Amount ?? 0,
      currency: fx?.currency || fx?.Currency || 'USD',
      status: fx?.status || fx?.Status || 'REQUESTED',
      requestedAmount: fx?.requestedAmount ?? fx?.RequestedAmount ?? 0,
      allocatedAmount: fx?.allocatedAmount ?? fx?.AllocatedAmount ?? 0,
      exchangeRate: fx?.exchangeRate ?? fx?.ExchangeRate ?? 0,
      retention: fx?.retention ?? fx?.Retention ?? 0,
      retentionRate: fx?.retentionRate ?? fx?.RetentionRate ?? 0.4,
      expiryDate: fx?.expiryDate || fx?.ExpiryDate || null,
      requestDate: fx?.requestDate || fx?.RequestDate || null,
      allocationDate: fx?.allocationDate || fx?.AllocationDate || null,
      utilizationDate: fx?.utilizationDate || fx?.UtilizationDate || null,
      nbeApprovalRef: fx?.nbeApprovalRef || fx?.NBEApprovalRef || fx?.NbeApprovalRef || '',
      nbeOfficer: fx?.nbeOfficer || fx?.NBEOfficer || '',
      verifiedBy: fx?.verifiedBy || fx?.VerifiedBy || '', // Who confirmed
      verifiedByMSP: fx?.verifiedByMSP || fx?.VerifiedByMSP || '', // Confirmer MSP
      comments: fx?.comments || fx?.Comments || '',
    }));

    // Filter valid forex (must have forexId)
    const validForex = normalizedForex.filter((fx: any) => fx.forexId && String(fx.forexId).trim().length > 0);
    const uniqueForex = dedupeById(validForex, (fx: any) => String(fx.forexId));
    
    logger.info(`[FOREX] ✅ Returning ${uniqueForex.length} unique forex allocations (SOURCE: Blockchain + PostgreSQL enrichment)`);
    
    res.json({ 
      success: true, 
      data: uniqueForex,
      source: 'blockchain', // ALWAYS blockchain
      blockchainPowered: true, // Flag for UI to show blockchain badge
      count: uniqueForex.length,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    logger.error('[FOREX] ❌ Error querying blockchain:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'BLOCKCHAIN_ERROR', 
        message: error.message 
      },
      source: 'blockchain',
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

// POST /api/v1/forex/rates — create/update exchange rate (NBE only)
router.post('/rates', authMiddleware, async (req, res) => {
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
router.post('/request', authMiddleware, async (req, res) => {
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
                forex_id, contract_id, exporter_id, requested_amount, currency, status,
                blockchain_tx_id, blockchain_timestamp, last_blockchain_sync
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
              ON CONFLICT (forex_id) DO UPDATE SET
                blockchain_tx_id = EXCLUDED.blockchain_tx_id,
                blockchain_timestamp = NOW(),
                last_blockchain_sync = NOW()`,
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
router.post('/:forexId/confirm', authMiddleware, async (req, res) => {
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
router.post('/allocate', authMiddleware, async (req, res) => {
  try {
    const { forexId, lcId, amount, exchangeRate, retentionRate, officer, approvalRef, expiryDate } = req.body;
    if (!forexId || !lcId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'forexId and lcId are required' } });
    }

    // Connect as Banks to allocate forex
    // NBE sets policy (50% retention), banks execute
    await fabricService.connectAsOrg('BanksMSP');

    // AUTO-MAPPING: Fetch forex request and LC data to auto-populate allocation fields
    let autoMappedData: any = {};
    try {
      // Get forex request details
      const forexResult = await fabricService.queryChaincode('ReadForexAllocation', [forexId]);
      if (forexResult.success && forexResult.data) {
        const forex = forexResult.data;
        autoMappedData.requestedAmount = forex.RequestedAmount || forex.requestedAmount || '0';
        autoMappedData.currency = forex.Currency || forex.currency || 'USD';
        logger.info(`[FOREX] Auto-mapped from forex request: requestedAmount=${autoMappedData.requestedAmount}`);
      }
      
      // Get LC details for validation
      const lcResult = await fabricService.queryChaincode('ReadLC', [lcId]);
      if (lcResult.success && lcResult.data) {
        const lc = lcResult.data;
        autoMappedData.lcAmount = lc.Amount || lc.amount || '0';
        logger.info(`[FOREX] Auto-mapped from LC: lcAmount=${autoMappedData.lcAmount}`);
      }
    } catch (error) {
      logger.warn('[FOREX] Could not fetch forex/LC for auto-mapping:', error);
    }

    // Use provided values or auto-mapped values with smart defaults
    const finalAmount = amount || autoMappedData.requestedAmount || autoMappedData.lcAmount || '0';
    const finalExchangeRate = exchangeRate || 115.5; // Default ETB/USD rate
    const finalRetentionRate = retentionRate || 50; // NBE policy: 50% retention
    const finalOfficer = officer || 'Bank Officer';
    const finalApprovalRef = approvalRef || `NBE-${Date.now()}`;
    const finalExpiryDate = expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now

    // Retry logic for peer synchronization issues
    let result;
    let lastError;
    const maxRetries = 5;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // AllocateForex: forexID, lcID, amount, exchangeRate, retentionRate, officer, approvalRef, expiryDate
        result = await fabricService.invokeChaincode('AllocateForex', [
          forexId,
          lcId,
          finalAmount.toString(),
          finalExchangeRate.toString(),
          finalRetentionRate.toString(),
          finalOfficer,
          finalApprovalRef,
          finalExpiryDate,
        ]);
        
        if (result.success) {
          logger.info(`✅ Forex allocated: ${forexId} by ${finalOfficer} with auto-mapped data (attempt ${attempt})`);
          
          // ✅ Record blockchain signature for allocation
          try {
            const user = (req as any).user;
            await signatureService.recordSignature({
              entityType: 'FOREX_ALLOCATION',
              entityId: forexId,
              actionType: 'ALLOCATE',
              signerUsername: user?.username || user?.sub || finalOfficer,
              signerOrg: user?.org || user?.organization || 'BanksMSP',
              signerRole: user?.role || 'bank_officer',
              blockchainTxId: result.txId,
              blockchainTimestamp: new Date(),
              chaincodeName: 'coffee',
              chaincodeFunction: 'AllocateForex',
              transactionArgs: [
                forexId, lcId, finalAmount.toString(), finalExchangeRate.toString(),
                finalRetentionRate.toString(), finalOfficer, finalApprovalRef, finalExpiryDate
              ],
              metadata: {
                forexId,
                lcId,
                amount: finalAmount,
                exchangeRate: finalExchangeRate,
                retentionRate: finalRetentionRate,
                officer: finalOfficer,
                approvalRef: finalApprovalRef,
                expiryDate: finalExpiryDate,
                autoMapped: true
              }
            });
          } catch (sigError) {
            logger.error('Failed to record blockchain signature:', sigError);
            // Don't fail the request if signature recording fails
          }
          
          // Wait for transaction to propagate before responding
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // ✅ Sync to PostgreSQL for fast queries with blockchain metadata
          try {
            // Get LC and contract data to populate related fields
            const lcData = await fabricService.getLC(lcId);
            const contractId = lcData.success ? (lcData.data?.contractId || lcData.data?.ContractID || '') : '';
            const exporterId = lcData.success ? (lcData.data?.exporterId || lcData.data?.ExporterID || '') : '';
            
            await postgresDb.run(
              `INSERT INTO forex_allocations (
                allocation_id, lc_number, contract_id, exporter_id, 
                amount_usd, exchange_rate, amount_etb, allocation_date, 
                approved_by, status, blockchain_tx_id, blockchain_timestamp, last_blockchain_sync,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW(), NOW())
              ON CONFLICT (allocation_id) DO UPDATE SET
                lc_number = EXCLUDED.lc_number,
                contract_id = EXCLUDED.contract_id,
                exporter_id = EXCLUDED.exporter_id,
                amount_usd = EXCLUDED.amount_usd,
                exchange_rate = EXCLUDED.exchange_rate,
                blockchain_tx_id = EXCLUDED.blockchain_tx_id,
                blockchain_timestamp = NOW(),
                last_blockchain_sync = NOW(),
                amount_etb = EXCLUDED.amount_etb,
                allocation_date = EXCLUDED.allocation_date,
                approved_by = EXCLUDED.approved_by,
                status = EXCLUDED.status,
                updated_at = NOW()`,
              [
                forexId, lcId, contractId, exporterId,
                finalAmount, finalExchangeRate, 
                finalAmount * finalExchangeRate, // amount_etb
                finalExpiryDate || new Date().toISOString(),
                finalOfficer, 'allocated', result.txId
              ]
            );
            logger.info(`✅ Forex ${forexId} synced to PostgreSQL with blockchain txId: ${result.txId}`);
          } catch (syncErr) {
            logger.warn(`⚠️  Failed to sync forex to PostgreSQL:`, syncErr);
          }
          
          return res.json({ 
            success: true, 
            data: { forexId },
            autoMapped: {
              amount: finalAmount,
              exchangeRate: finalExchangeRate,
              retentionRate: finalRetentionRate,
              officer: finalOfficer,
              approvalRef: finalApprovalRef,
              expiryDate: finalExpiryDate,
            },
            txId: result.txId,
            blockchainProof: {
              transactionId: result.txId,
              timestamp: new Date().toISOString(),
              action: 'ALLOCATE_FOREX'
            },
            attempt,
            timestamp: new Date().toISOString() 
          });
        }
        
        lastError = result.error;
        
        // If error is about forex not existing or peer mismatch, wait and retry
        if (result.error && (
          result.error.includes('does not exist') ||
          result.error.includes('Peer endorsements do not match') ||
          result.error.includes('not found')
        )) {
          const waitTime = 5000 * attempt;
          logger.warn(`Forex not synced or peer mismatch on attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
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
          const waitTime = 5000 * attempt;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    res.status(400).json({ 
      success: false, 
      error: { 
        code: 'ALLOCATE_FAILED', 
        message: lastError,
        hint: 'Forex request may not be synchronized across peers yet. Wait a few seconds and try again.'
      }, 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    logger.error('Error allocating forex:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

// POST /api/v1/forex/utilize
router.post('/utilize', authMiddleware, async (req, res) => {
  try {
    const { forexId, utilizedAmount } = req.body;
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
