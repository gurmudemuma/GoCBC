// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Audit Trail and Cryptographic Signature API Routes

import express, { Request, Response } from 'express';
import FabricService from '../services/fabricService';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const fabricService = new FabricService();

// Initialize fabric connection
(async () => {
  try {
    await fabricService.connect();
    logger.info('✅ Fabric service connected for audit routes');
  } catch (error) {
    logger.error('Failed to connect Fabric service for audit routes:', error);
  }
})();

/**
 * GET /api/audit/log/:logId
 * Get specific audit log entry
 */
router.get('/log/:logId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const result = await fabricService.queryChaincode('GetAuditLog', [logId]);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Audit log not found',
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get all audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const result = await fabricService.queryChaincode('QueryAuditLogsByEntity', [
      entityType.toUpperCase(),
      entityId,
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to query audit logs',
      });
    }

    return res.json({
      success: true,
      data: result.data || [],
      count: Array.isArray(result.data) ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('Error fetching entity audit logs:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/audit/actor/:certHash
 * Get all actions performed by a specific identity
 */
router.get('/actor/:certHash', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { certHash } = req.params;
    const result = await fabricService.queryChaincode('QueryAuditLogsByActor', [certHash]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to query audit logs by actor',
      });
    }

    return res.json({
      success: true,
      data: result.data || [],
      count: Array.isArray(result.data) ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('Error fetching actor audit logs:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/audit/statistics
 * Get system-wide audit statistics
 */
router.get('/statistics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const startTime = req.query.startTime as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = req.query.endTime as string || new Date().toISOString();

    const result = await fabricService.queryChaincode('QueryAuditLogsByTimeRange', [startTime, endTime]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit statistics',
      });
    }

    const logs = result.data || [];
    const statistics = {
      timeRange: { start: startTime, end: endTime },
      totalActions: logs.length,
    };

    return res.json({
      success: true,
      statistics: statistics,
    });
  } catch (error) {
    logger.error('Error fetching audit statistics:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
