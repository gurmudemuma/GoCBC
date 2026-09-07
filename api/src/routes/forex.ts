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

      // GET /api/v1/forex — all forex allocations
router.get('/', authMiddleware, async (req, res) => {
  try {
    let blockchainForex: any[] = [];
    let postgresForex: any[] = [];

    // Fetch from BLOCKCHAIN (Hyperledger Fabric)
    try {
      const result = await fabricService.queryAllForex();
      if (result.success) {
        blockchainForex = result.data || [];
        logger.info(`✅ Found ${blockchainForex.length} forex allocations from blockchain`);
      }
    } catch (err) {
      logger.warn('Could not fetch forex from blockchain:', err);
    }

    // Fetch from POSTGRESQL
    try {
      const pgResult = await postgresDb.all('SELECT * FROM forex_allocations ORDER BY created_at DESC', []);
      postgresForex = pgResult || [];
      logger.info(`✅ Found ${postgresForex.length} forex allocations from PostgreSQL`);
    } catch (err) {
      logger.warn('Could not fetch forex from PostgreSQL:', err);
    }

    // Combine and normalize
    const allForex = [...blockchainForex, ...postgresForex];
    const normalizedForex = allForex.map((fx: any) => ({
      forexId: fx?.forexId || fx?.ForexID || fx?.id || fx?.forex_id || '',
      contractId: fx?.contractId || fx?.ContractID || fx?.contractID || fx?.contract_id || '',
      exporterId: fx?.exporterId || fx?.ExporterID || fx?.exporterID || fx?.exporter_id || '',
      lcId: fx?.lcId || fx?.LCID || fx?.lcID || fx?.lc_id || '',
      amount: fx?.amount ?? fx?.Amount ?? 0,
      currency: fx?.currency || fx?.Currency || 'USD',
      status: fx?.status || fx?.Status || 'REQUESTED',
      requestedAmount: fx?.requestedAmount ?? fx?.RequestedAmount ?? fx?.requested_amount ?? 0,
      allocatedAmount: fx?.allocatedAmount ?? fx?.AllocatedAmount ?? fx?.allocated_amount ?? 0,
      exchangeRate: fx?.exchangeRate ?? fx?.ExchangeRate ?? fx?.exchange_rate ?? 0,
      retention: fx?.retention ?? fx?.Retention ?? 0,
      retentionRate: fx?.retentionRate ?? fx?.RetentionRate ?? fx?.retention_rate ?? 0,
      expiryDate: fx?.expiryDate || fx?.ExpiryDate || fx?.expiry_date || null,
      requestDate: fx?.requestDate || fx?.RequestDate || fx?.request_date || fx?.created_at || null,
      allocationDate: fx?.allocationDate || fx?.AllocationDate || fx?.allocation_date || null,
      utilizationDate: fx?.utilizationDate || fx?.UtilizationDate || fx?.utilization_date || null,
      nbeApprovalRef: fx?.nbeApprovalRef || fx?.NBEApprovalRef || fx?.NbeApprovalRef || fx?.nbeReference || fx?.nbe_approval_ref || '',
      nbeOfficer: fx?.nbeOfficer || fx?.NBEOfficer || fx?.nbe_officer || '',
    }));

    // Deduplicate by forexId
    const uniqueForex = dedupeById(normalizedForex, (fx: any) => fx.forexId);
    
    logger.info(`✅ Total unique forex allocations: ${uniqueForex.length} (Blockchain: ${blockchainForex.length}, PostgreSQL: ${postgresForex.length})`);
    
    res.json({ 
      success: true, 
      data: uniqueForex,
      sources: {
        blockchain: blockchainForex.length,
        postgres: postgresForex.length,
        total: uniqueForex.length
      },
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    logger.error('Error fetching forex allocations:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
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
          
          return res.status(201).json({ 
            success: true, 
            data: { forexId },
            autoMapped: {
              exporterId: finalExporterId,
              amount: finalAmount,
              currency: finalCurrency,
            },
            txId: result.txId, 
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
