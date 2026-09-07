// LC Amendment API Routes
import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Request LC amendment
router.post('/:lcId/amendments',
  authMiddleware,
  [
    param('lcId').notEmpty(),
    body('reason').notEmpty(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lcId } = req.params;
      const { reason, newAmount, newExpiryDate, newTerms } = req.body;
      const user = (req as any).user;

      const result = await fabricService.invokeChaincode(
        'AmendLC',
        [
          lcId,
          reason,
          newAmount?.toString() || '',
          newExpiryDate || '',
          newTerms || '',
          user.username,
        ]
      );

      if (result.success) {
        logger.info(`LC amended: ${lcId} by ${user.username}`);
      }

      res.json({
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error amending LC:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AMENDMENT_FAILED', message: 'Failed to amend LC' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Report LC discrepancy
router.post('/:lcId/discrepancies',
  authMiddleware,
  [
    param('lcId').notEmpty(),
    body('document').notEmpty(),
    body('issue').notEmpty(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lcId } = req.params;
      const { document, issue } = req.body;

      // Store discrepancy in PostgreSQL
      const db = DatabaseService.getInstance();
      await db.run(
        `INSERT INTO lc_discrepancies (lc_id, document, issue, status, reported_date)
         VALUES ($1, $2, $3, 'OPEN', CURRENT_TIMESTAMP)`,
        [lcId, document, issue]
      );

      // ✅ Record LC discrepancy on blockchain
      try {
        const auditService = require('../services/auditService').default;
        const user = (req as any).user;
        await auditService.recordAudit({
          entityType: 'LC_DISCREPANCY',
          entityId: `${lcId}_${Date.now()}`,
          actionType: 'REPORT',
          actionBy: user?.username || 'bank',
          organizationMSP: 'BanksMSP',
          details: {
            lcId,
            document,
            issue,
            status: 'OPEN',
            reportedDate: new Date().toISOString()
          },
          timestamp: new Date()
        });
        logger.info(`✅ LC discrepancy recorded on blockchain for LC: ${lcId}`);
      } catch (blockchainErr) {
        logger.warn(`⚠️ Failed to record LC discrepancy on blockchain (non-fatal):`, blockchainErr);
      }

      res.json({
        success: true,
        data: { lcId, document, issue, status: 'OPEN' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error reporting LC discrepancy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DISCREPANCY_FAILED' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
