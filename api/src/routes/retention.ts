// NBE Retention Policy API Routes
import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Calculate and enforce retention
router.post('/:forexId/retention',
  authMiddleware,
  requireRole(['BANKS', 'BANK_ADMIN', 'BANK OFFICER', 'FOREX OFFICER', 'NBE', 'NBE_ADMIN', 'NBE OFFICER']),
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
      const forexResult = await fabricService.queryChaincode('ReadForex', [forexId]);
      if (!forexResult.success || !forexResult.data) {
        return res.status(404).json({
          success: false,
          error: { code: 'FOREX_NOT_FOUND' },
          timestamp: new Date().toISOString(),
        });
      }

      const forex = forexResult.data;
      const role = String((req as any).user?.role || '').toUpperCase();
      await fabricService.connectAsOrg(role.startsWith('NBE') ? 'NBEMSP' : 'BanksMSP');
      const result = await fabricService.invokeChaincode('RecordForexRetention', [
        forexId,
        String(retentionPercentage),
        String(fcyAccountNumber).trim(),
      ]);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'RETENTION_RECORD_FAILED', message: result.error || 'Failed to record retention on the ledger' },
          timestamp: new Date().toISOString(),
        });
      }

      const ledgerResult = await fabricService.queryChaincode('ReadForex', [forexId]);
      if (!ledgerResult.success || !ledgerResult.data) {
        return res.status(502).json({
          success: false,
          error: { code: 'LEDGER_READ_FAILED', message: 'Retention was committed but its ledger state could not be re-read' },
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      }
      const updatedForex = ledgerResult.data;
      const retentionAmount = Number(updatedForex.RetentionAmountUsd ?? updatedForex.retentionAmountUsd ?? 0);
      const complianceStatus = String(updatedForex.RetentionStatus || updatedForex.retentionStatus || 'PENDING');

      // Update forex with retention info in PostgreSQL
      const db = DatabaseService.getInstance();
      await db.run(
        `UPDATE forex_allocations 
         SET retention_percentage = $1, retention_amount_usd = $2, fcy_account_number = $3, 
             retention_status = $4, retention_date = $5
         WHERE allocation_id = $6`,
        [retentionPercentage, retentionAmount, fcyAccountNumber, complianceStatus, updatedForex.RetentionDate || updatedForex.retentionDate || new Date().toISOString(), forexId]
      );

      logger.info(`Retention enforced: ${forexId}, ${retentionPercentage}%, ${retentionAmount} USD`);

      res.json({
        success: true,
        data: {
          forexId,
          retentionPercentage,
          retentionAmount,
          fcyAccountNumber,
          status: complianceStatus,
        },
        txId: result.txId,
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

      const result = await fabricService.queryChaincode('ReadForex', [forexId]);
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
        compliantWithNBE: forex.retentionStatus === 'COMPLIED',
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
