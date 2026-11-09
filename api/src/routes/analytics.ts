// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics API Routes - Business Intelligence & Reporting

import express from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const analyticsService = AnalyticsService.getInstance();

/**
 * GET /api/v1/analytics/dashboard
 * Get dashboard KPIs for current user's organization
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { dateFrom, dateTo } = req.query;
    
    const organization = user.org || user.organization || 'SYSTEM';
    
    const kpis = await analyticsService.getDashboardKPIs(
      organization,
      dateFrom as string,
      dateTo as string
    );
    
    res.json({
      success: true,
      data: kpis,
      organization,
      period: {
        from: dateFrom || 'all',
        to: dateTo || 'now'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/analytics/timeseries/:metric
 * Get time series data for specific metric
 */
router.get('/timeseries/:metric', authMiddleware, async (req, res) => {
  try {
    const { metric } = req.params;
    const { period = 'day', dateFrom, dateTo } = req.query;
    
    if (!['contracts', 'shipments', 'payments'].includes(metric)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_METRIC', message: 'Invalid metric. Must be: contracts, shipments, or payments' },
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['day', 'week', 'month'].includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PERIOD', message: 'Invalid period. Must be: day, week, or month' },
        timestamp: new Date().toISOString()
      });
    }
    
    const data = await analyticsService.getTimeSeriesData(
      metric,
      period as 'day' | 'week' | 'month',
      dateFrom as string,
      dateTo as string
    );
    
    res.json({
      success: true,
      data,
      metric,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching time series data:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/analytics/blockchain
 * Get blockchain network statistics and health metrics
 */
router.get('/blockchain', authMiddleware, async (req, res) => {
  try {
    logger.info('[ANALYTICS] 📊 Fetching blockchain network statistics...');
    
    const fabricService = require('../services/fabricService').FabricService.getInstance();
    
    // Query blockchain network info
    const networkInfo = await fabricService.getNetworkInfo();
    
    res.json({
      success: true,
      data: {
        network: {
          name: 'CECBS Hyperledger Fabric',
          channelName: process.env.CHANNEL_NAME || 'coffee-channel',
          chaincodeName: 'coffee-export',
          status: networkInfo.success ? 'HEALTHY' : 'DEGRADED'
        },
        ledger: {
          totalBlocks: networkInfo.blockHeight || 0,
          currentBlockHeight: networkInfo.blockHeight || 0,
          totalTransactions: networkInfo.totalTransactions || 0
        },
        peers: {
          total: 7, // ECTA, NBE, Banks, Customs, Shipping, ECX, Exporter
          active: networkInfo.success ? 7 : 0,
          organizations: ['ECTA', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'ECX', 'EXPORTER']
        },
        performance: {
          averageBlockTime: '2-3 seconds',
          transactionsPerSecond: networkInfo.tps || 0,
          lastBlockTimestamp: networkInfo.lastBlockTime || new Date().toISOString()
        },
        health: {
          status: networkInfo.success ? 'HEALTHY' : 'DEGRADED',
          uptime: '99.9%',
          lastHealthCheck: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[ANALYTICS] ❌ Error fetching blockchain stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BLOCKCHAIN_STATS_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/analytics/export-report
 * Generate comprehensive export report
 */
router.get('/export-report', authMiddleware, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;
    const user = (req as any).user;
    const organization = user.org || 'SYSTEM';
    
    const kpis = await analyticsService.getDashboardKPIs(
      organization,
      dateFrom as string,
      dateTo as string
    );
    
    if (format === 'csv') {
      // CSV export
      const csv = generateCSVReport(kpis, organization);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=export-report-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // JSON export
      res.json({
        success: true,
        data: kpis,
        organization,
        period: { from: dateFrom || 'all', to: dateTo || 'now' },
        generatedAt: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Error generating export report:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REPORT_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to generate CSV from KPIs
function generateCSVReport(kpis: any, organization: string): string {
  const rows = [
    ['Ethiopian Coffee Export Report'],
    ['Organization', organization],
    ['Generated', new Date().toISOString()],
    [''],
    ['Metric', 'Value']
  ];
  
  // Flatten KPIs into CSV rows
  Object.entries(kpis).forEach(([category, data]: [string, any]) => {
    rows.push([`=== ${category.toUpperCase()} ===`, '']);
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        rows.push([`  ${key}`, JSON.stringify(value)]);
      } else {
        rows.push([`  ${key}`, String(value)]);
      }
    });
    rows.push(['', '']);
  });
  
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * GET /api/v1/analytics/breakdown
 * Get detailed breakdown analytics by various dimensions
 */
router.get('/breakdown', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { dimension, dateFrom, dateTo } = req.query;
    
    const organization = user.org || user.organization || 'SYSTEM';
    
    // Validate dimension parameter
    const validDimensions = ['exporter', 'region', 'product', 'status', 'bank', 'destination'];
    if (dimension && !validDimensions.includes(dimension as string)) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_DIMENSION', 
          message: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` 
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get breakdown data based on dimension
    const breakdownData = await analyticsService.getBreakdownAnalytics(
      organization,
      (dimension as string) || 'exporter',
      dateFrom as string,
      dateTo as string
    );
    
    res.json({
      success: true,
      data: breakdownData,
      organization,
      dimension: dimension || 'exporter',
      period: {
        from: dateFrom || 'all',
        to: dateTo || 'now'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching breakdown analytics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
