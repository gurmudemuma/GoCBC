// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exchange Rates API Routes - NBE Currency Management

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
 * Get all exchange rates
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[EXCHANGE_RATES] Fetching all exchange rates...');
    
    // Try blockchain first
    try {
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
    } catch (blockchainError) {
      logger.warn('[EXCHANGE_RATES] Blockchain query failed, using fallback data');
    }
    
    // Fallback to default rates
    const defaultRates = [
      {
        currency: 'USD',
        buyingRate: 162.49,
        sellingRate: 165.30,
        middleRate: 163.90,
        effectiveDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true
      },
      {
        currency: 'EUR',
        buyingRate: 175.82,
        sellingRate: 178.90,
        middleRate: 177.36,
        effectiveDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true
      },
      {
        currency: 'GBP',
        buyingRate: 198.45,
        sellingRate: 201.80,
        middleRate: 200.13,
        effectiveDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true
      }
    ];
    
    res.json({
      success: true,
      data: defaultRates,
      count: defaultRates.length,
      source: 'default',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[EXCHANGE_RATES] Error fetching rates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch exchange rates'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/exchange-rates/:currency
 * Get exchange rate for specific currency
 */
router.get('/:currency', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    logger.info(`[EXCHANGE_RATES] Fetching rate for: ${currency}`);
    
    // Try blockchain first
    try {
      const result = await fabricService.queryChaincode('QueryExchangeRate', [currency.toUpperCase()]);
      if (result.success && result.data) {
        return res.json({
          success: true,
          data: result.data,
          source: 'blockchain',
          timestamp: new Date().toISOString()
        });
      }
    } catch (blockchainError) {
      logger.warn(`[EXCHANGE_RATES] Blockchain query failed for ${currency}, using fallback`);
    }
    
    // Fallback rates
    const rates: any = {
      USD: { currency: 'USD', buyingRate: 162.49, sellingRate: 165.30, middleRate: 163.90 },
      EUR: { currency: 'EUR', buyingRate: 175.82, sellingRate: 178.90, middleRate: 177.36 },
      GBP: { currency: 'GBP', buyingRate: 198.45, sellingRate: 201.80, middleRate: 200.13 }
    };
    
    const rate = rates[currency.toUpperCase()];
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CURRENCY_NOT_FOUND',
          message: `Exchange rate for ${currency} not found`
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        ...rate,
        effectiveDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true
      },
      source: 'default',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[EXCHANGE_RATES] Error fetching currency rate:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch currency rate'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/exchange-rates/history
 * Get exchange rate history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[EXCHANGE_RATES] Fetching rate history...');
    
    // Return sample historical data
    const history = [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        rate: 161.85
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        rate: 161.20
      },
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        rate: 160.50
      }
    ];
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[EXCHANGE_RATES] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch rate history'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
