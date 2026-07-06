// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Forex Allocation API Routes — uses shared FabricService singleton

import express from 'express';
import { FabricService } from '../services/fabricService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();

// ==================== FOREX ALLOCATION ROUTES ====================

// GET /api/v1/forex — all forex allocations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await fabricService.queryAllForex();
    if (result.success) {
      res.json({ success: true, data: result.data || [], timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    logger.error('Error fetching forex allocations:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

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
    if (!forexId || !contractId || !exporterId || !amount) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'forexId, contractId, exporterId, amount are required' } });
    }

    // NOTE: Auto-mapping removed to prevent "Peer endorsements do not match" errors
    // In multi-peer networks, querying recently-created contracts during endorsement causes inconsistency
    // All required fields must be provided in the request body

    const finalCurrency = currency || 'USD';

    // Retry logic for peer synchronization issues
    let result;
    let lastError;
    const maxRetries = 5; // Increased from 3 to 5 attempts
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // RequestForex now takes 5 parameters (lcId removed)
        result = await fabricService.invokeChaincode('RequestForex', [
          forexId, contractId, exporterId, amount.toString(), finalCurrency,
        ]);
        
        if (result.success) {
          logger.info(`✅ Forex request created: ${forexId} (attempt ${attempt})`);
          
          // Wait for transaction to propagate to all peers before responding
          // This prevents the next operation (AllocateForex) from failing
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          return res.status(201).json({ 
            success: true, 
            data: { forexId },
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

// POST /api/v1/forex/allocate — NBE allocates forex (NBEMSP enforced on-chain)
// NOTE: LC ID now provided during allocation instead of request to prevent peer mismatch
router.post('/allocate', authMiddleware, async (req, res) => {
  try {
    const { forexId, lcId, amount, exchangeRate, retentionRate, nbeOfficer, nbeApprovalRef, expiryDate } = req.body;
    if (!forexId || !lcId || !amount || !exchangeRate || !retentionRate || !nbeOfficer || !nbeApprovalRef || !expiryDate) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'All fields required: forexId, lcId, amount, exchangeRate, retentionRate, nbeOfficer, nbeApprovalRef, expiryDate' } });
    }

    // Connect as NBE since AllocateForex requires NBEMSP
    await fabricService.connectAsOrg('NBEMSP');

    // Retry logic for peer synchronization issues
    let result;
    let lastError;
    const maxRetries = 5; // Increased from 3 to 5 attempts
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // AllocateForex now takes 8 parameters (lcId added as second parameter)
        result = await fabricService.invokeChaincode('AllocateForex', [
          forexId,
          lcId,
          amount.toString(),
          exchangeRate.toString(),
          retentionRate.toString(),
          nbeOfficer,
          nbeApprovalRef,
          expiryDate,
        ]);
        
        if (result.success) {
          logger.info(`Forex allocated: ${forexId} by ${nbeOfficer} (attempt ${attempt})`);
          
          // Wait for transaction to propagate before responding
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          return res.json({ 
            success: true, 
            data: { forexId }, 
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
          const waitTime = 5000 * attempt; // 5s, 10s, 15s, 20s, 25s
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
      res.json({ success: true, txId: result.txId, timestamp: new Date().toISOString() });
    } else {
      res.status(400).json({ success: false, error: { code: 'UTILIZE_FAILED', message: result.error }, timestamp: new Date().toISOString() });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, timestamp: new Date().toISOString() });
  }
});

export default router;
