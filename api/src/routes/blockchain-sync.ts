/**
 * Blockchain Sync Management Routes
 * 
 * Admin endpoints for monitoring and managing blockchain sync service
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { blockchainSyncService } from '../services/blockchainSyncService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/blockchain-sync/stats:
 *   get:
 *     summary: Get blockchain sync statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/stats',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const stats = await blockchainSyncService.getStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get sync stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'STATS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/blockchain-sync/trigger:
 *   post:
 *     summary: Manually trigger blockchain sync
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync triggered successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/trigger',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      logger.info(`🔄 Manual blockchain sync triggered by ${(req as any).user?.username}`);
      
      const stats = await blockchainSyncService.syncNow();
      
      res.json({
        success: true,
        message: 'Blockchain sync completed',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to trigger sync:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
