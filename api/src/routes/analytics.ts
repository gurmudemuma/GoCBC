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

export default router;
