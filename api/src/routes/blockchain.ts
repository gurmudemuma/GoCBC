// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Blockchain API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/blockchain/network:
 *   get:
 *     summary: Get blockchain network information
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Network information retrieved successfully
 *       500:
 *         description: Internal server error
 */
/**
 * Get blockchain network information with REAL metrics
 * Includes block height, TPS, average block time from actual blockchain data
 */
router.get('/network', async (req, res) => {
  try {
    const networkInfo = await fabricService.getNetworkInfo();
    
    // Get REAL statistics from the blockchain
    const isConnected = fabricService.isConnected();
    
    let blockchainStats = {
      height: 0,
      transactionsPerSecond: 0,
      averageBlockTime: 0,
      totalTransactions: 0,
      validTransactions: 0,
      invalidTransactions: 0,
      unknownValidationTransactions: 0,
    };
    
    let contractCount = 0;
    let chaincodeAvailable = false;
    let consensusInfo: {
      ordererType: string | null;
      configBlockNumber: number;
      consenterCount: number | null;
      consenters: Array<{ host: string; port: number; certificateSubject: string | null }>;
    } | null = null;
    let currentBlockHash: string | null = null;
    
    if (isConnected) {
      const [statsResult, consensusResult, contractsResult, ledgerInfoResult] = await Promise.allSettled([
        fabricService.getBlockchainStats(),
        fabricService.getConsensusInfo(),
        fabricService.queryChaincode('QueryAllContracts', []),
        fabricService.getBlockchainInfo(),
      ]);
      if (statsResult.status === 'fulfilled') blockchainStats = statsResult.value;
      else logger.warn('Could not query blockchain activity metrics:', statsResult.reason);
      if (consensusResult.status === 'fulfilled') consensusInfo = consensusResult.value;
      else logger.warn('Could not query active orderer configuration:', consensusResult.reason);
      if (contractsResult.status === 'fulfilled' && contractsResult.value.success && contractsResult.value.data !== undefined) {
        const contracts = Array.isArray(contractsResult.value.data) ? contractsResult.value.data : [contractsResult.value.data];
        contractCount = contracts.length;
        chaincodeAvailable = true;
      } else if (contractsResult.status === 'rejected') {
        logger.warn('Could not query contracts from the configured chaincode:', contractsResult.reason);
      }
      if (ledgerInfoResult.status === 'fulfilled') currentBlockHash = ledgerInfoResult.value.currentBlockHash;
      else logger.warn('Could not query the latest Fabric block hash:', ledgerInfoResult.reason);
    }
    
    res.json({
      success: true,
      data: {
        ...networkInfo,
        isConnected,
        status: isConnected ? 'healthy' : 'disconnected',
        blockHeight: blockchainStats.height,
        transactionsPerSecond: blockchainStats.transactionsPerSecond,
        averageBlockTime: blockchainStats.averageBlockTime,
        totalTransactions: blockchainStats.totalTransactions,
        validTransactions: blockchainStats.validTransactions,
        invalidTransactions: blockchainStats.invalidTransactions,
        unknownValidationTransactions: blockchainStats.unknownValidationTransactions,
        consensus: consensusInfo,
        currentBlockHash,
        configuredChaincode: chaincodeAvailable ? (process.env.FABRIC_CHAINCODE_NAME || 'coffee') : null,
        contractCount, // REAL: from blockchain query
        peers: networkInfo.peers?.filter((peer: any) => peer.reachable).length || 0,
        orderers: networkInfo.orderers?.filter((orderer: any) => orderer.reachable).length || 0,
        chaincodes: chaincodeAvailable ? 1 : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error retrieving network info:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to retrieve network information',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/** Read a committed block, including transaction validation codes and endorsements. */
router.get('/ledger/blocks/:blockNumber', authMiddleware, async (req, res) => {
  try {
    const blockNumber = Number(req.params.blockNumber);
    const block = await fabricService.getBlockDetails(blockNumber);
    res.json({ success: true, data: block, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error retrieving Fabric block:', error);
    res.status(400).json({
      success: false,
      error: { code: 'BLOCK_QUERY_ERROR', message: error instanceof Error ? error.message : 'Failed to retrieve block' },
      timestamp: new Date().toISOString(),
    });
  }
});

/** Read a committed transaction directly from QSCC and its containing block. */
router.get('/ledger/transactions/:txId', authMiddleware, async (req, res) => {
  try {
    const transaction = await fabricService.getTransactionDetails(req.params.txId);
    if (!transaction) {
      return res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction was not found on this channel' } });
    }
    return res.json({ success: true, data: transaction, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error retrieving Fabric transaction:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TRANSACTION_QUERY_ERROR', message: error instanceof Error ? error.message : 'Failed to retrieve transaction' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/blockchain/status:
 *   get:
 *     summary: Get blockchain connection status
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Connection status retrieved successfully
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = fabricService.isConnected();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error checking blockchain status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to check blockchain status',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
