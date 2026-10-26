/**
 * Cache Management Routes
 * 
 * Admin endpoints for managing blockchain query cache
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { blockchainCache } from '../services/blockchainCacheService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/stats',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const stats = blockchainCache.getStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          hitRateFormatted: `${stats.hitRate.toFixed(2)}%`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get cache stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CACHE_STATS_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/cache/clear:
 *   post:
 *     summary: Clear all cache entries
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/clear',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      logger.info(`🗑️ Cache clear requested by ${(req as any).user?.username}`);
      
      blockchainCache.clear();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to clear cache:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CACHE_CLEAR_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/cache/invalidate:
 *   post:
 *     summary: Invalidate cache entries matching a pattern
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Pattern to match (e.g., "contract:", "shipment:")
 *     responses:
 *       200:
 *         description: Cache entries invalidated
 */
router.post('/invalidate',
  authMiddleware,
  requireRole('ADMIN', 'ECTA_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PATTERN', message: 'Pattern is required' },
          timestamp: new Date().toISOString(),
        });
      }
      
      logger.info(`🗑️ Cache invalidation requested by ${(req as any).user?.username} for pattern: ${pattern}`);
      
      const count = blockchainCache.invalidatePattern(pattern);
      
      res.json({
        success: true,
        message: `Invalidated ${count} cache entries`,
        data: { count, pattern },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to invalidate cache:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CACHE_INVALIDATE_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
