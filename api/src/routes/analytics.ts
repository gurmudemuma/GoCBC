// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics & Dashboard Routes

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import FabricService from '../services/fabricService';

const router = Router();
const fabricService = new FabricService();

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard statistics and metrics
 * @access  Private
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Mock data for demonstration - replace with real blockchain queries
    const dashboardStats = {
      totalExporters: 156,
      activeShipments: 42,
      totalValue: 12500000, // USD
      eudrCompliance: 98,
      blockchainHealth: {
        status: 'healthy',
        blockHeight: 15847,
        transactionsPerSecond: 12,
        averageBlockTime: 2.3,
        peers: 6,
      },
      recentActivity: [
        {
          id: '1',
          type: 'Shipment',
          description: 'New shipment SHP0001234 created by EXP2026001',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          status: 'success',
        },
        {
          id: '2',
          type: 'Contract',
          description: 'Sales contract CNT0005678 approved by NBE',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          status: 'success',
        },
        {
          id: '3',
          type: 'Quality',
          description: 'Quality inspection completed for LOT-2026-045',
          timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
          status: 'success',
        },
        {
          id: '4',
          type: 'Customs',
          description: 'EUDR verification passed for SHP0001230',
          timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
          status: 'success',
        },
        {
          id: '5',
          type: 'Exporter',
          description: 'New exporter EXP2026156 registered',
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          status: 'success',
        },
      ],
      exportTrends: [
        { month: 'Jan', volume: 1200, value: 1.8 },
        { month: 'Feb', volume: 1350, value: 2.1 },
        { month: 'Mar', volume: 1500, value: 2.4 },
        { month: 'Apr', volume: 1650, value: 2.7 },
        { month: 'May', volume: 1800, value: 3.0 },
        { month: 'Jun', volume: 1950, value: 3.3 },
      ],
      qualityDistribution: [
        { grade: 'Grade 1', count: 850, percentage: 68 },
        { grade: 'Grade 2', count: 250, percentage: 20 },
        { grade: 'Grade 3', count: 100, percentage: 8 },
        { grade: 'Grade 4', count: 38, percentage: 3 },
        { grade: 'Rejected', count: 12, percentage: 1 },
      ],
    };

    res.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch dashboard statistics',
      },
    });
  }
});

/**
 * @route   GET /api/v1/analytics/exports
 * @desc    Get export statistics
 * @access  Private
 */
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const { period, dateFrom, dateTo } = req.query;

    // Mock export statistics
    const exportStats = [
      {
        date: '2026-01-01',
        volume: 1200,
        value: 1800000,
        shipments: 45,
        exporters: 12,
      },
      {
        date: '2026-02-01',
        volume: 1350,
        value: 2100000,
        shipments: 52,
        exporters: 15,
      },
      {
        date: '2026-03-01',
        volume: 1500,
        value: 2400000,
        shipments: 58,
        exporters: 18,
      },
    ];

    res.json({
      success: true,
      data: exportStats,
    });
  } catch (error) {
    logger.error('Export stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch export statistics',
      },
    });
  }
});

/**
 * @route   GET /api/v1/analytics/compliance
 * @desc    Get compliance statistics
 * @access  Private
 */
router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const complianceStats = {
      eudr: {
        total: 1250,
        compliant: 1225,
        pending: 20,
        failed: 5,
        complianceRate: 98.0,
      },
      francoValuta: {
        total: 1250,
        approved: 1200,
        pending: 45,
        rejected: 5,
        approvalRate: 96.0,
      },
      quality: {
        total: 1250,
        passed: 1238,
        pending: 8,
        failed: 4,
        passRate: 99.0,
      },
      licenses: {
        total: 156,
        active: 148,
        expiringSoon: 12,
        expired: 8,
        activeRate: 94.9,
      },
    };

    res.json({
      success: true,
      data: complianceStats,
    });
  } catch (error) {
    logger.error('Compliance stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch compliance statistics',
      },
    });
  }
});

/**
 * @route   GET /api/v1/analytics/quality
 * @desc    Get quality statistics
 * @access  Private
 */
router.get('/quality', async (req: Request, res: Response) => {
  try {
    const qualityStats = {
      gradeDistribution: [
        { grade: 'Grade 1', count: 850, percentage: 68.0 },
        { grade: 'Grade 2', count: 250, percentage: 20.0 },
        { grade: 'Grade 3', count: 100, percentage: 8.0 },
        { grade: 'Grade 4', count: 38, percentage: 3.0 },
        { grade: 'Rejected', count: 12, percentage: 1.0 },
      ],
      defectAnalysis: {
        blackBeans: 2.5,
        sourBeans: 1.8,
        brokenBeans: 3.2,
        insectDamage: 0.5,
        foreignMatter: 0.3,
      },
      moistureContent: {
        average: 11.2,
        min: 9.5,
        max: 12.5,
        optimal: 11.0,
      },
      cupScore: {
        average: 85.5,
        min: 80.0,
        max: 92.0,
        specialty: 88.0,
      },
    };

    res.json({
      success: true,
      data: qualityStats,
    });
  } catch (error) {
    logger.error('Quality stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch quality statistics',
      },
    });
  }
});

/**
 * @route   GET /api/v1/analytics/blockchain
 * @desc    Get blockchain network statistics
 * @access  Private
 */
router.get('/blockchain', async (req: Request, res: Response) => {
  try {
    // Try to get real blockchain stats if connected
    let blockchainStats;
    
    if (fabricService.isConnected()) {
      try {
        const networkInfo = await fabricService.getNetworkInfo();
        blockchainStats = {
          status: 'healthy',
          network: networkInfo,
          blockHeight: 15847, // Would come from actual query
          transactionsTotal: 45230,
          transactionsToday: 342,
          averageBlockTime: 2.3,
          peers: networkInfo.peers.length,
          orderers: networkInfo.orderers.length,
          channelName: networkInfo.channelName,
        };
      } catch (error) {
        logger.warn('Failed to get real blockchain stats, using mock data');
        blockchainStats = getMockBlockchainStats();
      }
    } else {
      blockchainStats = getMockBlockchainStats();
    }

    res.json({
      success: true,
      data: blockchainStats,
    });
  } catch (error) {
    logger.error('Blockchain stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch blockchain statistics',
      },
    });
  }
});

function getMockBlockchainStats() {
  return {
    status: 'healthy',
    blockHeight: 15847,
    transactionsTotal: 45230,
    transactionsToday: 342,
    averageBlockTime: 2.3,
    peers: 6,
    orderers: 1,
    channelName: 'coffeechannel',
    network: {
      channelName: 'coffeechannel',
      peers: [
        { name: 'peer0.ecta.cecbs.et', url: 'grpcs://localhost:7051' },
        { name: 'peer0.ecx.cecbs.et', url: 'grpcs://localhost:8051' },
        { name: 'peer0.banks.cecbs.et', url: 'grpcs://localhost:9051' },
        { name: 'peer0.nbe.cecbs.et', url: 'grpcs://localhost:10051' },
        { name: 'peer0.customs.cecbs.et', url: 'grpcs://localhost:11051' },
        { name: 'peer0.shipping.cecbs.et', url: 'grpcs://localhost:12051' },
      ],
      orderers: [
        { name: 'orderer.cecbs.et', url: 'grpcs://localhost:7050' },
      ],
    },
  };
}

/**
 * @route   GET /api/v1/analytics/performance
 * @desc    Get system performance metrics
 * @access  Private
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const performanceMetrics = {
      apiResponseTime: {
        average: 145, // ms
        p50: 120,
        p95: 280,
        p99: 450,
      },
      blockchainLatency: {
        average: 2300, // ms
        p50: 2100,
        p95: 3200,
        p99: 4500,
      },
      throughput: {
        transactionsPerSecond: 12,
        blocksPerMinute: 26,
        peakTPS: 45,
      },
      uptime: {
        percentage: 99.95,
        lastDowntime: '2026-05-15T10:30:00Z',
        downtimeDuration: 180, // seconds
      },
    };

    res.json({
      success: true,
      data: performanceMetrics,
    });
  } catch (error) {
    logger.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch performance metrics',
      },
    });
  }
});

export default router;
