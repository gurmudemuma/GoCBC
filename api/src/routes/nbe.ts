// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// National Bank of Ethiopia (NBE) Routes - Forex Management

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const postgresDb = DatabaseService.getInstance();

/**
 * GET /api/v1/nbe/forex
 * Get all forex allocations
 */
router.get('/forex', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM forex_allocations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const allocations = await postgresDb.all(query, params);
    
    res.json({
      success: true,
      data: allocations,
      count: allocations.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error fetching forex allocations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch forex allocations'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/nbe/forex/:forexId/approve
 * Approve forex allocation
 */
router.post('/forex/:forexId/approve', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { forexId } = req.params;
    const { approvalNotes } = req.body;
    const user = (req as any).user;
    
    logger.info(`[NBE] Approving forex allocation: ${forexId}`);
    
    // Get database instance
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Get user_id for approved_by (it's an INTEGER column)
    const userRecord = await db.get('SELECT id FROM users WHERE username = $1', [user?.username || 'nbe_admin']);
    const userId = userRecord?.id || null;
    
    // Update forex allocation status to approved
    await db.run(`
      UPDATE forex_allocations
      SET status = 'APPROVED',
          approved_by = $1,
          approval_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE allocation_id = $2 OR CAST(id AS TEXT) = $2
    `, [userId, forexId]);
    
    logger.info(`[NBE] ✅ Forex allocation approved: ${forexId}`);
    
    res.json({
      success: true,
      data: {
        forexId,
        status: 'APPROVED',
        approvedBy: user?.username || 'NBE Officer',
        approvalNotes
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error approving forex allocation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to approve forex allocation'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/nbe/forex/:forexId/repatriation
 * Record forex repatriation
 */
router.post('/forex/:forexId/repatriation', authMiddleware, requireRole('NBE'), async (req: Request, res: Response) => {
  try {
    const { forexId } = req.params;
    const { repatriationAmount, repatriationDate, bankReference, repatriationMethod } = req.body;
    
    logger.info(`[NBE] Recording forex repatriation for: ${forexId}`);
    
    // Get database instance
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Check if forex_repatriations table exists, if not use forex_allocations
    try {
      // Try to insert into forex_repatriations table
      await db.run(`
        INSERT INTO forex_repatriations (
          forex_allocation_id, repatriation_amount, repatriation_date,
          bank_reference, repatriation_method, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'COMPLETED', CURRENT_TIMESTAMP)
      `, [
        forexId,
        repatriationAmount,
        repatriationDate || new Date().toISOString().split('T')[0],
        bankReference,
        repatriationMethod || 'Wire Transfer'
      ]);
    } catch (tableError: any) {
      // If table doesn't exist, update forex_allocations table
      if (tableError.message?.includes('does not exist')) {
        logger.info('[NBE] forex_repatriations table not found, updating forex_allocations');
        await db.run(`
          UPDATE forex_allocations
          SET status = 'REPATRIATED',
              repatriation_date = $1,
              repatriation_amount = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE allocation_id = $3 OR CAST(id AS TEXT) = $3
        `, [
          repatriationDate || new Date().toISOString().split('T')[0],
          repatriationAmount,
          forexId
        ]);
      } else {
        throw tableError;
      }
    }
    
    logger.info(`[NBE] ✅ Forex repatriation recorded: ${forexId}, Amount: ${repatriationAmount}`);
    
    res.json({
      success: true,
      data: {
        forexId,
        repatriationAmount,
        repatriationDate,
        bankReference,
        repatriationMethod,
        status: 'COMPLETED'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error recording forex repatriation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record forex repatriation'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/nbe/lc-monitoring
 * Monitor all LCs for NBE oversight
 */
router.get('/lc-monitoring', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[NBE] Fetching LC monitoring data');
    
    const lcs = await postgresDb.all(`
      SELECT * FROM letter_of_credits
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: lcs,
      count: lcs.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('[NBE] Error fetching LC monitoring data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch LC monitoring data'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
