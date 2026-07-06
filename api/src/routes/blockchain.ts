// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Blockchain API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

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
router.get('/network', async (req, res) => {
  try {
    const networkInfo = await fabricService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo,
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