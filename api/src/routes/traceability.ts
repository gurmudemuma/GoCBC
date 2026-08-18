// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Complete End-to-End Traceability API Routes

import express, { Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { TraceabilityService } from '../services/traceabilityService';
import { logger } from '../utils/logger';

const router = express.Router();
const traceabilityService = TraceabilityService.getInstance();

/**
 * GET /traceability/exporter/:exporterId
 * Get complete end-to-end traceability for an exporter
 * Shows full lifecycle from application to active trading
 */
router.get('/exporter/:exporterId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { exporterId } = req.params;
    
    logger.info(`[TRACEABILITY] Fetching complete traceability for exporter ${exporterId}`);
    
    const traceability = await traceabilityService.getExporterTraceability(exporterId);
    
    res.json({
      success: true,
      data: traceability,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[TRACEABILITY] Error fetching exporter traceability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exporter traceability',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /traceability/contract/:contractId
 * Get complete traceability for a specific contract
 * Shows full journey from registration to delivery
 */
router.get('/contract/:contractId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId } = req.params;
    
    logger.info(`[TRACEABILITY] Fetching complete traceability for contract ${contractId}`);
    
    const traceability = await traceabilityService.getContractTraceability(contractId);
    
    res.json({
      success: true,
      data: traceability,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[TRACEABILITY] Error fetching contract traceability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch contract traceability',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /traceability/system/statistics
 * Get system-wide traceability statistics
 * Shows overview of all exporters, contracts, shipments, payments
 */
router.get('/system/statistics', authMiddleware, async (req: any, res: Response) => {
  try {
    logger.info('[TRACEABILITY] Fetching system-wide statistics');
    
    const statistics = await traceabilityService.getSystemStatistics();
    
    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[TRACEABILITY] Error fetching system statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch system statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
