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

// POST /api/v1/retention/policy - Set NBE retention policy (NBE only)
router.post('/policy',
  authMiddleware,
  requireRole(['NBE', 'NBE_ADMIN', 'NBE OFFICER']),
  [
    body('commodityType').notEmpty().isString(),
    body('retentionRate').isFloat({ min: 0, max: 100 }),
    body('setBy').notEmpty().isString(),
    body('justification').notEmpty().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { commodityType, retentionRate, setBy, justification } = req.body;
      
      // Generate policy ID
      const policyId = `POLICY-${commodityType}-${Date.now()}`;
      
      logger.info(`[NBE] Setting retention policy: ${commodityType} = ${retentionRate}% by ${setBy}`);
      
      // Connect as NBE
      await fabricService.connectAsOrg('NBEMSP');
      
      // Call SetRetentionPolicy chaincode
      const result = await fabricService.invokeChaincode('SetRetentionPolicy', [
        policyId,
        commodityType.toUpperCase(),
        retentionRate.toString(),
        setBy,
        justification,
      ]);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'POLICY_SET_FAILED', 
            message: result.error || 'Failed to set retention policy on blockchain' 
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      logger.info(`✅ [NBE] Retention policy set: ${commodityType} = ${retentionRate}%`);
      
      res.status(201).json({
        success: true,
        message: 'Retention policy set successfully',
        data: {
          policyId,
          commodityType: commodityType.toUpperCase(),
          retentionRate,
          surrenderRate: 100 - retentionRate,
          setBy,
          effectiveDate: new Date().toISOString(),
        },
        txId: result.txId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('[NBE] Error setting retention policy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// GET /api/v1/retention/policy/:commodityType - Get active retention policy
router.get('/policy/:commodityType',
  authMiddleware,
  async (req, res) => {
    try {
      const commodityType = req.params.commodityType.toUpperCase();
      
      logger.info(`[NBE] Querying retention policy for ${commodityType}`);
      
      // Try blockchain first
      const result = await fabricService.queryChaincode('GetCurrentRetentionPolicy', [commodityType]);
      
      if (result.success && result.data) {
        // Parse blockchain response
        const policyData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        // Normalize field names (blockchain might use different casing)
        const normalizedData = {
          policyId: policyData.PolicyID || policyData.policyId || policyData.policyID,
          commodityType: policyData.CommodityType || policyData.commodityType || commodityType,
          retentionPercentage: parseFloat(policyData.RetentionRate || policyData.retentionRate || policyData.retentionPercentage || 0),
          surrenderRate: 100 - parseFloat(policyData.RetentionRate || policyData.retentionRate || policyData.retentionPercentage || 0),
          setBy: policyData.SetBy || policyData.setBy || 'NBE',
          effectiveDate: policyData.EffectiveDate || policyData.effectiveDate || policyData.setDate,
          justification: policyData.Justification || policyData.justification || 'NBE Policy'
        };
        
        logger.info(`[NBE] ✅ Found retention policy: ${commodityType} = ${normalizedData.retentionPercentage}%`);
        
        return res.json({
          success: true,
          data: normalizedData,
          source: 'blockchain',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Fallback: Return default 40% for COFFEE (NBE standard policy)
      logger.warn(`[NBE] Blockchain query failed, using default policy for ${commodityType}`);
      
      if (commodityType === 'COFFEE') {
        return res.json({
          success: true,
          data: {
            policyId: 'DEFAULT-COFFEE-POLICY',
            commodityType: 'COFFEE',
            retentionPercentage: 40,
            surrenderRate: 60,
            setBy: 'NBE',
            effectiveDate: new Date().toISOString(),
            justification: 'NBE Coffee Export Retention Policy - 40% mandatory retention',
            source: 'default'
          },
          source: 'default',
          message: 'Using default NBE policy (blockchain query unavailable)',
          timestamp: new Date().toISOString(),
        });
      }
      
      // No policy found
      return res.status(404).json({
        success: false,
        error: { 
          code: 'POLICY_NOT_FOUND', 
          message: `No active retention policy found for ${commodityType}` 
        },
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      logger.error('[NBE] Error getting retention policy:', error);
      
      // Fallback on error for COFFEE
      if (req.params.commodityType.toUpperCase() === 'COFFEE') {
        return res.json({
          success: true,
          data: {
            policyId: 'DEFAULT-COFFEE-POLICY',
            commodityType: 'COFFEE',
            retentionPercentage: 40,
            surrenderRate: 60,
            setBy: 'NBE',
            effectiveDate: new Date().toISOString(),
            justification: 'NBE Coffee Export Retention Policy - 40% mandatory retention',
            source: 'default'
          },
          source: 'default',
          message: 'Using default NBE policy (error in blockchain query)',
          timestamp: new Date().toISOString(),
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

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
