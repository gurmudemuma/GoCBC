// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Sales Contracts API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/contracts:
 *   post:
 *     summary: Register a new sales contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractID
 *               - exporterID
 *               - buyerID
 *               - buyerCountry
 *               - coffeeType
 *               - quantity
 *               - pricePerKg
 *               - currency
 *               - eudrRequired
 *             properties:
 *               contractID:
 *                 type: string
 *               exporterID:
 *                 type: string
 *               buyerID:
 *                 type: string
 *               buyerCountry:
 *                 type: string
 *               coffeeType:
 *                 type: string
 *               quantity:
 *                 type: number
 *               pricePerKg:
 *                 type: number
 *               currency:
 *                 type: string
 *               eudrRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Sales contract registered successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/',
  [
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('buyerID').notEmpty().withMessage('Buyer ID is required'),
    body('buyerCountry').notEmpty().withMessage('Buyer country is required'),
    body('buyerBank').optional().isString(),
    body('exporterBank').optional().isString(),
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
    body('pricePerKg').isNumeric().withMessage('Price per kg must be a number'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('eudrRequired').isBoolean().withMessage('EUDR required must be a boolean'),
    body('documents').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        contractID,
        exporterID,
        buyerID,
        buyerCountry,
        buyerBank,
        exporterBank,
        coffeeType,
        quantity,
        pricePerKg,
        currency,
        eudrRequired,
        documents,
      } = req.body;

      // Extract document IDs for blockchain storage
      let documentIDs: string[] = [];
      if (documents && Array.isArray(documents)) {
        documentIDs = documents.map((doc: any) => doc.documentId || doc.id).filter(Boolean);
        logger.info(`Contract ${contractID}: Linking ${documentIDs.length} documents to blockchain`);
      }

      const result = await fabricService.registerSalesContract(
        contractID,
        exporterID,
        buyerID,
        buyerCountry,
        coffeeType,
        quantity.toString(),
        pricePerKg.toString(),
        currency,
        eudrRequired.toString(),
        buyerBank || '',
        exporterBank || '',
        JSON.stringify(documentIDs)
      );

      if (result.success) {
        logger.info(`Sales contract registered successfully: ${contractID}, txId: ${result.txId}, documents: ${documentIDs.length}`);
        
        // Try to read back the contract immediately to verify
        setTimeout(async () => {
          const readResult = await fabricService.getSalesContract(contractID);
          logger.info(`Read-back verification for ${contractID}: success=${readResult.success}, data=${JSON.stringify(readResult.data)}`);
        }, 2000);
        
        res.status(201).json({
          success: true,
          data: result.data,
          txId: result.txId,
          documentsLinked: documentIDs.length,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error || 'Failed to register sales contract',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error registering sales contract:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
/**
 * @swagger
 * /api/v1/contracts:
 *   get:
 *     summary: Get all sales contracts
 *     tags: [Contracts]
 *     parameters:
 *       - in: query
 *         name: exporterID
 *         schema:
 *           type: string
 *         description: Filter by exporter ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by contract status
 *       - in: query
 *         name: eudrRequired
 *         schema:
 *           type: boolean
 *         description: Filter EUDR-required contracts
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of contracts retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.getAllContracts();
    
    logger.info(`QueryAllContracts result: success=${result.success}, dataLength=${result.data?.length || 0}`);
    if (result.data) {
      logger.info(`First contract sample: ${JSON.stringify(result.data[0] || 'none')}`);
    }

    if (result.success) {
      const contracts = result.data || [];
      const { exporterID, status, eudrRequired, limit = 50, offset = 0 } = req.query;

      // Apply filters
      let filteredContracts = contracts;
      if (exporterID) {
        filteredContracts = filteredContracts.filter((contract: any) => contract.exporterID === exporterID);
      }
      if (status) {
        filteredContracts = filteredContracts.filter((contract: any) => contract.contractStatus === status);
      }
      if (eudrRequired !== undefined) {
        const eudrBool = eudrRequired === 'true';
        filteredContracts = filteredContracts.filter((contract: any) => contract.eudrRequired === eudrBool);
      }

      // Apply pagination
      const paginatedContracts = filteredContracts.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: paginatedContracts,
        pagination: {
          total: filteredContracts.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredContracts.length,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve contracts',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving contracts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/contracts/{contractID}:
 *   get:
 *     summary: Get contract details by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractID
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract details retrieved successfully
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.get('/:contractID',
  [param('contractID').notEmpty().withMessage('Contract ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { contractID } = req.params;
      const result = await fabricService.getSalesContract(contractID);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error || 'Contract not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving contract:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
/**
 * @swagger
 * /api/v1/contracts/approve:
 *   post:
 *     summary: Approve a sales contract (body data)
 *     tags: [Contracts]
 */
router.post('/approve',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { contractId, approvedBy, comments } = req.body;
      
      if (!contractId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'contractId is required' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[CONTRACTS] Approving contract:', { contractId, approvedBy });

      const result = await fabricService.submitTransaction(
        'ApproveContract',
        contractId,
        approvedBy || 'NBE Admin',
        comments || 'Approved'
      );

      logger.info('[CONTRACTS] Contract approved successfully:', contractId);
      
      res.json({
        success: true,
        message: 'Contract approved successfully',
        data: { contractId },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('[CONTRACTS] Error approving contract:', error);
      res.status(500).json({
        success: false,
        error: { code: 'APPROVAL_FAILED', message: error.message || 'Failed to approve contract' },
        timestamp: new Date().toISOString()
      });
    }
  }
);
/**
 * @swagger
 * /api/v1/contracts/{contractID}/approve:
 *   post:
 *     summary: Approve a sales contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractID
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract approved successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.post('/:contractID/approve',
  authMiddleware,
  [param('contractID').notEmpty().withMessage('Contract ID is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { contractID } = req.params;
      const user = (req as any).user; // Get authenticated user info
      const userOrg = String(user?.org || '').toUpperCase();
      const userRole = String(user?.role || '').toUpperCase();

      // Only NBE can approve sales contracts
      if (userOrg !== 'NBEMSP' && userRole !== 'NBE') {
        logger.warn(`Unauthorized sales contract approval attempt by ${user?.org || 'UNKNOWN'}: ${contractID}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only NBE users can approve sales contracts',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Log which organization is approving
      logger.info(`[${user.org}] Approving contract: ${contractID}`, {
        userId: user?.sub,
        organization: user?.org,
        role: user?.role,
      });
      
      await fabricService.connectAsOrg('NBEMSP');
      const result = await fabricService.approveSalesContract(contractID);

      if (result.success) {
        logger.info(`[${user?.org}] ✅ Sales contract approved: ${contractID}`);
        res.json({
          success: true,
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'APPROVAL_FAILED',
            message: result.error || 'Failed to approve contract',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error approving contract:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/contracts/:contractID/nbe-approve
 * NBE approves contract for forex allocation eligibility
 */
router.post('/:contractID/nbe-approve',
  authMiddleware,
  [
    param('contractID').notEmpty().withMessage('Contract ID is required'),
    body('approvedBy').notEmpty().withMessage('Approving officer is required'),
    body('approvalType').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { contractID } = req.params;
      const { approvedBy, approvalType, comments } = req.body;
      const user = (req as any).user;

      logger.info(`[NBE] Approving contract ${contractID} for forex allocation`, {
        userId: user?.sub,
        organization: user?.org,
        approvedBy,
      });

      // Update contract status to APPROVED in blockchain
      const result = await fabricService.invokeChaincode('ApproveContract', [
        contractID,
        approvedBy,
        'NBE_FOREX_APPROVAL',
        comments || 'Approved for foreign exchange allocation by NBE',
      ]);

      if (result.success) {
        logger.info(`✅ Contract ${contractID} approved for forex by NBE`);
        res.json({
          success: true,
          data: {
            contractID,
            approvedBy,
            approvalType: 'NBE_FOREX_APPROVAL',
            approvalDate: new Date().toISOString(),
          },
          txId: result.txId,
          message: 'Contract approved for forex allocation',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'NBE_APPROVAL_FAILED',
            message: result.error || 'Failed to approve contract for forex',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error in NBE contract approval:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;