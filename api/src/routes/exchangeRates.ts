// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exchange Rates API Routes - NBE Currency Management
//
// LEG 1 (F5e): these routes used to fall back to hardcoded rates
// (USD 162.49/165.30, EUR 175.82/178.90, GBP 198.45/201.80) with
// success:true whenever the ledger query failed, and /history was
// defined after /:currency so it 404'd as currency "history". Both are
// fixed: a failed ledger read is an honest 503, and /history is routed
// before /:currency. There is no exchange-rate history source in the
// system (no table, no chaincode query), so /history answers 501
// instead of inventing sample rows. No UI caller was found for this
// router; NBE uses GET /forex/rates, which already fails honestly.

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const fabricService = FabricService.getInstance();
const db = DatabaseService.getInstance();

/**
 * GET /api/v1/exchange-rates
 * Get all exchange rates from the ledger. No fallback: a hardcoded
 * rate served as success would let the UI price trades off a stale,
 * invented number.
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[EXCHANGE_RATES] Fetching all exchange rates...');

    const result = await fabricService.queryChaincode('QueryAllExchangeRates', []);
    if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
      return res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        source: 'blockchain',
        timestamp: new Date().toISOString()
      });
    }
    if (result.success) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'RATES_UNAVAILABLE',
          message: 'No exchange rates are recorded on the ledger'
        },
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      success: false,
      error: {
        code: 'RATES_UNAVAILABLE',
        message: `Exchange rates could not be read from the ledger: ${result.error || 'blockchain unavailable'}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[EXCHANGE_RATES] Error fetching rates:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'RATES_UNAVAILABLE',
        message: error.message || 'Failed to fetch exchange rates'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/exchange-rates/history
 * NOTE: defined BEFORE /:currency — Express matches in registration
 * order, and /:currency used to swallow "history" as a currency code
 * and answer 404 CURRENCY_NOT_FOUND.
 *
 * There is no history source (no PG table, no chaincode history
 * query), so this answers 501 instead of the invented 7/14/30-day
 * sample rows it used to return.
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  logger.info('[EXCHANGE_RATES] Rate history requested — no history source exists');
  res.status(501).json({
    success: false,
    error: {
      code: 'HISTORY_UNAVAILABLE',
      message: 'Exchange rate history is not recorded by the system'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/exchange-rates/:currency
 * Get exchange rate for specific currency from the ledger. No
 * hardcoded fallback (see the / route above).
 */
router.get('/:currency', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    logger.info(`[EXCHANGE_RATES] Fetching rate for: ${currency}`);

    const result = await fabricService.queryChaincode('QueryExchangeRate', [currency.toUpperCase()]);
    if (result.success && result.data) {
      return res.json({
        success: true,
        data: result.data,
        source: 'blockchain',
        timestamp: new Date().toISOString()
      });
    }
    if (result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CURRENCY_NOT_FOUND',
          message: `Exchange rate for ${currency} not found`
        },
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      success: false,
      error: {
        code: 'RATES_UNAVAILABLE',
        message: `Exchange rate for ${currency} could not be read from the ledger: ${result.error || 'blockchain unavailable'}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[EXCHANGE_RATES] Error fetching currency rate:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'RATES_UNAVAILABLE',
        message: error.message || 'Failed to fetch currency rate'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
