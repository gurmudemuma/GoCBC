// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Market Analytics Routes - Coffee market prices and trends

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();

/**
 * GET /api/v1/market
 * Root endpoint - Return market prices summary (alias for /prices)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[MARKET] Fetching market summary...');
    
    // Return Ethiopian coffee grade prices
    res.json({
      success: true,
      data: {
        prices: [
          { grade: 'Grade 1', pricePerKg: 8.50, currency: 'USD', description: 'Specialty grade, 0-3 defects', date: new Date().toISOString() },
          { grade: 'Grade 2', pricePerKg: 7.80, currency: 'USD', description: 'Premium grade, 4-12 defects', date: new Date().toISOString() },
          { grade: 'Grade 3', pricePerKg: 7.20, currency: 'USD', description: 'Exchange grade, 13-25 defects', date: new Date().toISOString() },
          { grade: 'Grade 4', pricePerKg: 6.50, currency: 'USD', description: 'Standard grade, 26-45 defects', date: new Date().toISOString() },
          { grade: 'Grade 5', pricePerKg: 5.80, currency: 'USD', description: 'Local grade, 46+ defects', date: new Date().toISOString() }
        ],
        marketStatus: 'OPEN',
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[MARKET] Error fetching market summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch market summary'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/market/prices
 * Get current coffee market prices
 */
router.get('/prices', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[MARKET] Fetching market prices...');

    // Calculate average prices from recent contracts
    const prices = await dbService.all(`
      SELECT 
        coffee_type,
        COUNT(*) as contract_count,
        AVG(price_per_kg) as avg_price,
        MIN(price_per_kg) as min_price,
        MAX(price_per_kg) as max_price,
        SUM(quantity) as total_quantity,
        currency
      FROM contracts
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status IN ('APPROVED', 'QUALITY_CHECKED', 'COMPLETED')
      GROUP BY coffee_type, currency
      ORDER BY coffee_type
    `);

    const marketPrices = prices.map((price: any) => ({
      priceId: `PRICE-${price.coffee_type}-${Date.now()}`,
      coffeeType: price.coffee_type,
      coffeeGrade: 'GRADE_1',
      currency: price.currency || 'USD',
      avgPrice: parseFloat(price.avg_price || '0'),
      minPrice: parseFloat(price.min_price || '0'),
      maxPrice: parseFloat(price.max_price || '0'),
      contractCount: price.contract_count || 0,
      totalQuantity: price.total_quantity || 0,
      priceDate: new Date().toISOString(),
      marketStatus: 'ACTIVE',
      trend: 'STABLE', // Could be calculated from historical data
      changePercent: 0
    }));

    // Add default prices if no data exists
    if (marketPrices.length === 0) {
      marketPrices.push(
        {
          priceId: `PRICE-ARABICA-GRADE1-${Date.now()}`,
          coffeeType: 'ARABICA',
          coffeeGrade: 'GRADE_1',
          currency: 'USD',
          avgPrice: 5.50,
          minPrice: 5.00,
          maxPrice: 6.00,
          contractCount: 0,
          totalQuantity: 0,
          priceDate: new Date().toISOString(),
          marketStatus: 'ACTIVE',
          trend: 'STABLE',
          changePercent: 0
        },
        {
          priceId: `PRICE-ROBUSTA-GRADE2-${Date.now()}`,
          coffeeType: 'ROBUSTA',
          coffeeGrade: 'GRADE_2',
          currency: 'USD',
          avgPrice: 3.25,
          minPrice: 3.00,
          maxPrice: 3.50,
          contractCount: 0,
          totalQuantity: 0,
          priceDate: new Date().toISOString(),
          marketStatus: 'ACTIVE',
          trend: 'STABLE',
          changePercent: 0
        }
      );
    }

    logger.info(`[MARKET] ✅ Retrieved ${marketPrices.length} market prices`);

    res.json({
      success: true,
      data: marketPrices,
      count: marketPrices.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[MARKET] Error fetching market prices:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch market prices'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/market/trends
 * Get market price trends over time
 */
router.get('/trends', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[MARKET] Fetching market trends...');

    // Get price trends from last 90 days
    const trends = await dbService.all(`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        coffee_type,
        AVG(price_per_kg) as avg_price,
        COUNT(*) as contract_count,
        SUM(quantity) as total_quantity
      FROM contracts
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        AND status IN ('APPROVED', 'QUALITY_CHECKED', 'COMPLETED')
      GROUP BY DATE_TRUNC('week', created_at), coffee_type
      ORDER BY week DESC, coffee_type
    `);

    const marketTrends = trends.map((trend: any) => ({
      trendId: `TREND-${trend.coffee_type}-${new Date(trend.week).getTime()}`,
      week: trend.week,
      coffeeType: trend.coffee_type,
      coffeeGrade: 'GRADE_1',
      avgPrice: parseFloat(trend.avg_price || '0'),
      contractCount: trend.contract_count || 0,
      totalQuantity: trend.total_quantity || 0,
      trendDirection: 'STABLE',
      volatility: 'LOW'
    }));

    // Add sample data if empty
    if (marketTrends.length === 0) {
      const now = Date.now();
      marketTrends.push(
        {
          trendId: `TREND-ARABICA-GRADE1-${now}`,
          week: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
          coffeeType: 'ARABICA',
          coffeeGrade: 'GRADE_1',
          avgPrice: 5.50,
          contractCount: 5,
          totalQuantity: 5000,
          trendDirection: 'UP',
          volatility: 'LOW'
        },
        {
          trendId: `TREND-ARABICA-GRADE1-${now + 1}`,
          week: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
          coffeeType: 'ARABICA',
          coffeeGrade: 'GRADE_1',
          avgPrice: 5.40,
          contractCount: 4,
          totalQuantity: 4500,
          trendDirection: 'UP',
          volatility: 'LOW'
        }
      );
    }

    logger.info(`[MARKET] ✅ Retrieved ${marketTrends.length} market trend data points`);

    res.json({
      success: true,
      data: marketTrends,
      count: marketTrends.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[MARKET] Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch market trends'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
