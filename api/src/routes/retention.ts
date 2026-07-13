// NBE Retention Policy API Routes
import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Calculate and enforce retention
router.post('/:forexId/retention',
  authMiddleware,
  [
    param('forexId').notEmpty(),
    body('fcyAccountNumber').notEmpty(),
    body('retentionPercentage').isFloat({ min: 0, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { forexId } = req.params;
      const { fcyAccountNumber, retentionPercentage } = req.body;

      // Get forex allocation
      const forexResult = await fabricService.queryChaincode('ReadForexAllocation', forexId);
      if (!forexResult.success || !forexResult.data) {
        return res.status(404).json({
          success: false,
          error: { code: 'FOREX_NOT_FOUND' },
          timestamp: new Date().toISOString(),
        });
      }

      const forex = forexResult.data;
      const retentionAmount = (forex.allocatedAmount * retentionPercentage) / 100;

      // Update forex with retention info (store in database for now, chaincode update can be added later)
      const db = fabricService['db'];
      if (db) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE forex_allocations 
             SET retention_percentage = ?, retention_amount_usd = ?, fcy_account_number = ?, 
                 retention_status = 'COMPLIED', retention_date = datetime('now')
             WHERE forex_id = ?`,
            [retentionPercentage, retentionAmount, fcyAccountNumber, forexId],
            (err: any) => (err ? reject(err) : resolve(true))
          );
        });
      }

      logger.info(`Retention enforced: ${forexId}, ${retentionPercentage}%, ${retentionAmount} USD`);

      res.json({
        success: true,
        data: {
          forexId,
          retentionPercentage,
          retentionAmount,
          fcyAccountNumber,
          status: 'COMPLIED',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error enforcing retention:', error);
      res.status(500).json({
        success: false,
        error: { code: 'RETENTION_FAILED', message: 'Failed to enforce retention' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Get retention compliance status
router.get('/:forexId/retention',
  authMiddleware,
  async (req, res) => {
    try {
      const { forexId } = req.params;

      const result = await fabricService.queryChaincode('ReadForexAllocation', [forexId]);
      if (!result.success || !result.data) {
        return res.status(404).json({
          success: false,
          error: { code: 'FOREX_NOT_FOUND' },
          timestamp: new Date().toISOString(),
        });
      }

      const forex = result.data;
      const retentionInfo = {
        forexId,
        allocatedAmount: forex.allocatedAmount,
        retentionPercentage: forex.retentionPercentage || 0,
        retentionAmount: forex.retentionAmountUSD || 0,
        fcyAccountNumber: forex.fcyAccountNumber,
        status: forex.retentionStatus || 'PENDING',
        compliantWithNBE: (forex.retentionPercentage >= 30 && forex.retentionPercentage <= 40),
      };

      res.json({
        success: true,
        data: retentionInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting retention status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
