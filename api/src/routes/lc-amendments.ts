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
      const user = (req as any).user;
      const discrepancyId = `${lcId}_${Date.now()}`;

      // ✅ BLOCKCHAIN-FIRST: Record LC discrepancy on blockchain BEFORE DB insert
      const auditService = require('../services/auditService').default;
      await auditService.log({
        entityType: 'LC_DISCREPANCY',
        entityId: discrepancyId,
        action: 'REPORT',
        performedBy: user?.username || 'bank',
        organization: 'BanksMSP',
        performedByOrg: 'BanksMSP',
        oldValue: '',
        newValue: 'OPEN',
        reason: `LC discrepancy reported: ${issue}`,
        metadata: {
          lcId,
          document,
          issue,
          reportedDate: new Date().toISOString()
        },
        ipAddress: req.ip
      });
      logger.info(`✅ LC discrepancy recorded on blockchain for LC: ${lcId}`);

      // Now store discrepancy in PostgreSQL
      const db = DatabaseService.getInstance();
      await db.run(
        `INSERT INTO lc_discrepancies (lc_id, document, issue, status, reported_date)
         VALUES ($1, $2, $3, 'OPEN', CURRENT_TIMESTAMP)`,
        [lcId, document, issue]
      );

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

/**
 * GET /api/v1/lc/discrepancies/pending
 * Get all pending LC discrepancies that need resolution
 */
router.get('/discrepancies/pending',
  authMiddleware,
  async (req, res) => {
    try {
      logger.info('[LC] 📋 Fetching pending LC discrepancies...');
      
      const db = DatabaseService.getInstance();
      
      // Query pending discrepancies (status = OPEN or UNDER_REVIEW)
      const discrepancies = await db.all(
        `SELECT 
          ld.*,
          lc.lc_number,
          lc.contract_id,
          lc.exporter_id,
          lc.amount,
          lc.currency
         FROM lc_discrepancies ld
         LEFT JOIN letters_of_credit lc ON ld.lc_id = lc.lc_id
         WHERE ld.status IN ('OPEN', 'UNDER_REVIEW')
         ORDER BY ld.reported_date DESC`
      );
      
      logger.info(`[LC] ✅ Found ${discrepancies.length} pending discrepancies`);
      
      res.json({
        success: true,
        data: discrepancies.map((d: any) => ({
          discrepancyId: d.discrepancy_id,
          lcId: d.lc_id,
          lcNumber: d.lc_number,
          contractId: d.contract_id,
          exporterId: d.exporter_id,
          document: d.document,
          issue: d.issue,
          status: d.status,
          reportedDate: d.reported_date,
          resolvedDate: d.resolved_date,
          resolutionNotes: d.resolution_notes,
          amount: d.amount,
          currency: d.currency,
        })),
        count: discrepancies.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[LC] ❌ Error fetching pending discrepancies:', error);
      res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
