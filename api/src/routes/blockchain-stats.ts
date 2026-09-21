/**
 * Blockchain Statistics API
 * Provides real-time blockchain network statistics
 */

import express, { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const dbService = DatabaseService.getInstance();

/**
 * GET /api/v1/blockchain/stats
 * Get real-time blockchain statistics
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Get total blockchain transactions
    const totalTx = await dbService.get(`
      SELECT COUNT(*) as count FROM blockchain_signatures
    `);

    // Get chaincode function distribution
    const chaincodeCount = await dbService.get(`
      SELECT COUNT(DISTINCT chaincode_function) as count 
      FROM blockchain_signatures 
      WHERE chaincode_function IS NOT NULL
    `);

    // Get active organizations
    const orgsCount = await dbService.get(`
      SELECT COUNT(DISTINCT signer_org) as count 
      FROM blockchain_signatures 
      WHERE signer_org IS NOT NULL
    `);

    // Get document signatures
    const docSigs = await dbService.get(`
      SELECT COUNT(DISTINCT entity_id) as count 
      FROM blockchain_signatures 
      WHERE entity_type = 'DOCUMENT'
    `);

    // Get LC blockchain coverage
    const lcTotal = await dbService.get(`
      SELECT COUNT(*) as count FROM letters_of_credit
    `);

    const lcWithSigs = await dbService.get(`
      SELECT COUNT(DISTINCT entity_id) as count 
      FROM blockchain_signatures 
      WHERE entity_type = 'LETTER_OF_CREDIT'
    `);

    const lcCoverage = lcTotal.count > 0 
      ? (lcWithSigs.count / lcTotal.count) * 100 
      : 0;

    // Get recent activity (last 24 hours)
    const recentActivity = await dbService.get(`
      SELECT COUNT(*) as count 
      FROM blockchain_signatures 
      WHERE blockchain_timestamp > NOW() - INTERVAL '24 hours'
    `);

    // Get chaincode function breakdown
    const chaincodes = await dbService.all(`
      SELECT chaincode_function, COUNT(*) as invocations
      FROM blockchain_signatures
      WHERE chaincode_function IS NOT NULL
      GROUP BY chaincode_function
      ORDER BY invocations DESC
      LIMIT 10
    `);

    const stats = {
      totalTransactions: parseInt(totalTx.count) || 0,
      chaincodeInvocations: parseInt(totalTx.count) || 0,
      uniqueChaincodes: parseInt(chaincodeCount.count) || 0,
      activeOrganizations: parseInt(orgsCount.count) || 0,
      documentSignatures: parseInt(docSigs.count) || 0,
      lcCoverage: parseFloat(lcCoverage.toFixed(1)),
      recentActivity: parseInt(recentActivity.count) || 0,
      chaincodeBreakdown: chaincodes.map((c: any) => ({
        function: c.chaincode_function,
        invocations: parseInt(c.invocations)
      })),
      network: {
        name: 'Hyperledger Fabric',
        channel: 'coffeechannel',
        chaincode: 'coffee',
        consensus: 'Raft',
        stateDatabase: 'CouchDB'
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('[BLOCKCHAIN STATS] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/v1/blockchain/health
 * Check blockchain network health
 */
router.get('/health', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check if we have recent transactions
    const recentTx = await dbService.get(`
      SELECT MAX(blockchain_timestamp) as last_tx
      FROM blockchain_signatures
    `);

    const lastTxDate = recentTx.last_tx ? new Date(recentTx.last_tx) : null;
    const now = new Date();
    const hoursSinceLastTx = lastTxDate 
      ? (now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60)
      : 999;

    const health = {
      status: hoursSinceLastTx < 24 ? 'healthy' : hoursSinceLastTx < 72 ? 'warning' : 'stale',
      lastTransaction: lastTxDate?.toISOString() || null,
      hoursSinceLastTx: parseFloat(hoursSinceLastTx.toFixed(1)),
      message: hoursSinceLastTx < 24 
        ? 'Blockchain network is active and healthy'
        : hoursSinceLastTx < 72
        ? 'No recent transactions (warning)'
        : 'No transactions in over 72 hours (stale)',
      checks: {
        hasTransactions: recentTx.last_tx !== null,
        recentActivity: hoursSinceLastTx < 24,
        stateAccessible: true // Assume true if query succeeded
      }
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error: any) {
    logger.error('[BLOCKCHAIN HEALTH] Error:', error);
    res.json({
      success: false,
      data: {
        status: 'error',
        message: 'Could not check blockchain health',
        error: error.message
      }
    });
  }
});

export default router;
