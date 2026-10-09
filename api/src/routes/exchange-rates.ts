// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exchange Rates Management API Routes

import express from 'express';
import { exchangeRateService } from '../services/exchangeRateService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/v1/exchange-rates/current - Get all current rates
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const rates = await exchangeRateService.getAllCurrentRates();
    
    res.json({
      success: true,
      data: rates,
      count: rates.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[EXCHANGE-RATES] Error fetching current rates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/exchange-rates/current/:currency - Get current rate for currency
router.get('/current/:currency', authMiddleware, async (req, res) => {
  try {
    const { currency } = req.params;
    const rate = await exchangeRateService.getCurrentRate(currency.toUpperCase());
    
    res.json({
      success: true,
      data: {
        currency: currency.toUpperCase(),
        rate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error(`[EXCHANGE-RATES] Error fetching rate for ${req.params.currency}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/exchange-rates/history/:currency - Get rate history
router.get('/history/:currency', authMiddleware, async (req, res) => {
  try {
    const { currency } = req.params;
    const history = await exchangeRateService.getRateHistory(currency.toUpperCase());
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      currency: currency.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`[EXCHANGE-RATES] Error fetching history for ${req.params.currency}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/exchange-rates/set - Set new exchange rate (NBE only)
router.post('/set', authMiddleware, async (req, res) => {
  try {
    const { currency, buyingRate, sellingRate } = req.body;
    
    if (!currency || !buyingRate || !sellingRate) {
      return res.status(400).json({
        success: false,
        error: 'Currency, buying rate, and selling rate are required'
      });
    }
    
    // Get user identity
    const user = (req as any).user;
    const setBy = user?.username || 'NBE Officer';
    
    const result = await exchangeRateService.setRate(
      currency.toUpperCase(),
      parseFloat(buyingRate),
      parseFloat(sellingRate),
      setBy,
      'NBE_OFFICIAL'
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: `Exchange rate set for ${currency.toUpperCase()}`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('[EXCHANGE-RATES] Error setting rate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/exchange-rates/initialize - Initialize default rates (Admin only)
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const setBy = user?.username || 'NBE System';
    
    await exchangeRateService.initializeDefaultRates(setBy);
    
    res.status(201).json({
      success: true,
      message: 'Default exchange rates initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[EXCHANGE-RATES] Error initializing rates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/exchange-rates/update-all - Update all rates (NBE only)
router.post('/update-all', authMiddleware, async (req, res) => {
  try {
    const { rates } = req.body;
    const user = (req as any).user;
    const setBy = user?.username || 'NBE Officer';
    
    if (!rates || typeof rates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Rates object is required'
      });
    }
    
    await exchangeRateService.updateToLatestRates(setBy, rates);
    
    res.json({
      success: true,
      message: 'All exchange rates updated',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[EXCHANGE-RATES] Error updating all rates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
