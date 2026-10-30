// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Sales Contracts API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { ContractService } from '../services/contractService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { dedupeById, hasText, isValidContract } from '../utils/dataFilters';
import { statusManager } from '../utils/statusManager';
import { resolveDocumentPath } from '../utils/fileUtils';

const router = express.Router();
const fabricService = FabricService.getInstance();
const contractService = ContractService.getInstance();

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
router.patch('/:contractId',
  authMiddleware,
  [
    param('contractId').notEmpty().withMessage('Contract ID is required'),
    body('buyerID').optional().notEmpty(),
    body('buyerName').optional().notEmpty(),
    body('buyerCountry').optional().notEmpty(),
    body('buyerBank').optional().notEmpty(),
    body('exporterBank').optional().notEmpty(),
    body('coffeeType').optional().notEmpty(),
    body('quantity').optional().isNumeric().withMessage('Quantity must be a number'),
    body('pricePerKg').optional().isNumeric().custom((value) => {
      if (parseFloat(value) < 5.0) {
        throw new Error('Price per kg must be at least 5.0 USD (minimum price requirement)');
      }
      return true;
    }),
    body('currency').optional().notEmpty(),
    body('paymentMethod').optional().isIn(['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE']),
    body('eudrRequired').optional().isBoolean(),
    body('organicCertified').optional().isBoolean(),
    body('fairTradeCertified').optional().isBoolean(),
    body('portOfLoading').optional().isString(),
    body('portOfDestination').optional().isString(),
    body('deliveryDate').optional().isString(),
    body('incoterm').optional().isString(),
    body('specialInstructions').optional().isString(),
    body('documents').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const contractId = req.params.contractId;
      const user = (req as any).user;
      
      // Get existing contract from database
      const { DatabaseService } = await import('../services/databaseService');
      const db = DatabaseService.getInstance();
      
      const existingContract = await db.get(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [contractId]
      );
      
      if (!existingContract) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTRACT_NOT_FOUND',
            message: 'Contract not found'
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      // Authorization check
      const isAuthorizedUser = user.role === 'ADMIN' || 
                               user.role === 'ECTA' || 
                               user.role === 'ECTA_ADMIN' ||
                               user.role === 'SUPER_ADMIN';
      
      const userExporterId = user.exporterId || user.exporter_id || user.username;
      const normalizedUserExporterId = String(userExporterId || '').toLowerCase().trim();
      const normalizedContractExporterId = String(existingContract.exporter_id || '').toLowerCase().trim();
      
      if (!isAuthorizedUser && normalizedUserExporterId !== normalizedContractExporterId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only update your own contracts'
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      // Merge existing contract data with updates (only update provided fields)
      const updatedData = {
        buyerID: req.body.buyerID || existingContract.buyer_id,
        buyerName: req.body.buyerName || existingContract.buyer_name,
        buyerCountry: req.body.buyerCountry || existingContract.buyer_country,
        buyerBank: req.body.buyerBank || existingContract.buyer_bank,
        exporterBank: req.body.exporterBank || existingContract.exporter_bank,
        coffeeType: req.body.coffeeType || existingContract.coffee_type,
        quantity: req.body.quantity !== undefined ? parseFloat(req.body.quantity) : existingContract.quantity,
        pricePerKg: req.body.pricePerKg !== undefined ? parseFloat(req.body.pricePerKg) : existingContract.price_per_kg,
        currency: req.body.currency || existingContract.currency,
        paymentMethod: req.body.paymentMethod || existingContract.payment_method,
        eudrRequired: req.body.eudrRequired !== undefined ? Boolean(req.body.eudrRequired) : existingContract.eudr_required,
        organicCertified: req.body.organicCertified !== undefined ? Boolean(req.body.organicCertified) : existingContract.organic_certified,
        fairTradeCertified: req.body.fairTradeCertified !== undefined ? Boolean(req.body.fairTradeCertified) : existingContract.fair_trade_certified,
        portOfLoading: req.body.portOfLoading || existingContract.port_of_loading,
        portOfDestination: req.body.portOfDestination || existingContract.port_of_destination,
        deliveryDate: req.body.deliveryDate || existingContract.delivery_date,
        incoterm: req.body.incoterm || existingContract.incoterm,
        specialInstructions: req.body.specialInstructions || existingContract.special_instructions,
      };
      
      // Handle document updates if provided
      let documentIDs: string[] = [];
      if (req.body.documents && Array.isArray(req.body.documents)) {
        documentIDs = req.body.documents.map((doc: any) => doc.documentId || doc.id).filter(Boolean);
        
        // Verify documents exist and belong to the user (skip check for admins/ECTA)
        if (documentIDs.length > 0 && !isAuthorizedUser) {
          for (const docId of documentIDs) {
            const doc = await db.get(
              `SELECT document_id FROM documents 
               WHERE document_id = $1 
                 AND (
                   CAST(uploaded_by AS TEXT) = $2 OR 
                   CAST(uploaded_by AS TEXT) = CAST($3 AS TEXT) OR 
                   CAST(exporter_id AS TEXT) = CAST($4 AS TEXT) OR 
                   CAST(exporter_id AS TEXT) = $2
                 )`,
              [docId, user.username, user.userId || user.sub || '', user.exporterId]
            );
            
            if (!doc) {
              return res.status(403).json({
                success: false,
                error: {
                  code: 'INVALID_DOCUMENT',
                  message: `Document ${docId} not found or does not belong to your organization`
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
      
      // Update contract in database
      const totalValue = updatedData.quantity * updatedData.pricePerKg;
      
      // Build dynamic UPDATE query to only update fields that exist in the schema
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Core fields that always exist
      const fieldsToUpdate = [
        { db: 'buyer_id', data: updatedData.buyerID },
        { db: 'buyer_country', data: updatedData.buyerCountry },
        { db: 'buyer_bank', data: updatedData.buyerBank },
        { db: 'exporter_bank', data: updatedData.exporterBank },
        { db: 'coffee_type', data: updatedData.coffeeType },
        { db: 'quantity', data: updatedData.quantity },
        { db: 'price_per_kg', data: updatedData.pricePerKg },
        { db: 'total_value', data: totalValue },
        { db: 'currency', data: updatedData.currency },
        { db: 'payment_method', data: updatedData.paymentMethod },
        { db: 'eudr_required', data: updatedData.eudrRequired },
      ];
      
      // Optional fields that may not exist in older schemas
      const optionalFields = [
        { db: 'buyer_name', data: updatedData.buyerName },
        { db: 'organic_certified', data: updatedData.organicCertified },
        { db: 'fair_trade_certified', data: updatedData.fairTradeCertified },
        { db: 'port_of_loading', data: updatedData.portOfLoading },
        { db: 'port_of_destination', data: updatedData.portOfDestination },
        { db: 'delivery_date', data: updatedData.deliveryDate },
        { db: 'incoterm', data: updatedData.incoterm },
        { db: 'special_instructions', data: updatedData.specialInstructions },
      ];
      
      // Add all fields to update
      [...fieldsToUpdate, ...optionalFields].forEach(field => {
        updates.push(`${field.db} = $${paramIndex}`);
        values.push(field.data);
        paramIndex++;
      });
      
      // Add updated_at
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add contract_id for WHERE clause
      values.push(contractId);
      
      // Log the SQL for debugging
      const finalSQL = `UPDATE contracts SET ${updates.join(', ')} WHERE contract_id = $${paramIndex}`;
      logger.info('SQL UPDATE Query:', finalSQL);
      logger.info('SQL UPDATE Values:', values);
      
      try {
        await db.run(
          finalSQL,
          values
        );
      } catch (updateError: any) {
        // If update fails due to missing columns, try with core fields only
        if (updateError.message?.includes('column') || updateError.code === '42703') {
          logger.warn('Some columns may not exist, retrying with core fields only');
          
          const coreUpdates: string[] = [];
          const coreValues: any[] = [];
          let coreIndex = 1;
          
          fieldsToUpdate.forEach(field => {
            coreUpdates.push(`${field.db} = $${coreIndex}`);
            coreValues.push(field.data);
            coreIndex++;
          });
          
          coreUpdates.push('updated_at = CURRENT_TIMESTAMP');
          coreValues.push(contractId);
          
          await db.run(
            `UPDATE contracts SET ${coreUpdates.join(', ')} WHERE contract_id = $${coreIndex}`,
            coreValues
          );
          
          logger.info('✅ Contract updated with core fields only');
        } else {
          throw updateError;
        }
      }
      
      // If documents were provided, link them to the contract
      if (documentIDs.length > 0) {
        for (const docId of documentIDs) {
          await db.run(
            `INSERT INTO contract_documents (contract_id, document_id)
             VALUES ($1, $2)
             ON CONFLICT (contract_id, document_id) DO NOTHING`,
            [contractId, docId]
          );
        }
      }
      
      logger.info(`✅ Contract ${contractId} updated successfully by ${user.username} (${user.role})`);
      
      return res.status(200).json({
        success: true,
        message: 'Contract updated successfully',
        data: {
          contractId: contractId,
          updatedFields: Object.keys(req.body).filter(key => req.body[key] !== undefined),
          totalValue: totalValue
        },
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      logger.error('Error updating contract:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update contract'
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

router.post('/',
  authMiddleware, // ✅ FIX: Added authentication
  [
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('buyerID').notEmpty().withMessage('Buyer ID is required'),
    body('buyerCountry').notEmpty().withMessage('Buyer country is required'),
    body('buyerBank').notEmpty().withMessage('Buyer bank (issuing bank) is required'), // ✅ FIX: Made required
    body('exporterBank').notEmpty().withMessage('Exporter bank (advising bank) is required'), // ✅ FIX: Made required
    body('coffeeType').notEmpty().withMessage('Coffee type is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
    body('pricePerKg').isNumeric().custom((value) => {
      if (parseFloat(value) < 5.0) {
        throw new Error('Price per kg must be at least 5.0 USD (minimum price requirement)');
      }
      return true;
    }).withMessage('Price per kg must be a number'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('paymentMethod').optional().isIn(['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE']).withMessage('Payment method must be LC, CAD, TT_ADVANCE, TT_POST, or ADVANCE'),
    body('supersedesContractID').optional().isString().withMessage('Superseded contract ID must be a string'),
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
        paymentMethod,
        eudrRequired,
        documents,
        supersedesContractID,
      } = req.body;

      // ✅ FIX: Authorization check - handle both field names (exporterId and exporter_id)
      const user = (req as any).user;
      const userExporterId = user.exporterId || user.exporter_id || user.username;
      
      const normalizedUserExporterId = String(userExporterId || '').toLowerCase().trim();
      const normalizedRequestExporterId = String(exporterID || '').toLowerCase().trim();
      const normalizedUsername = String(user.username || '').toLowerCase().trim();

      // ADMIN and ECTA users can register contracts for any exporter
      const isAuthorizedUser = user.role === 'ADMIN' || 
                               user.role === 'ECTA' || 
                               user.role === 'ECTA_ADMIN' ||
                               user.role === 'SUPER_ADMIN';

      // For regular exporters, check if they're registering for themselves
      if (!isAuthorizedUser) {
        const isOwnContract = normalizedUserExporterId === normalizedRequestExporterId || 
                             normalizedUsername === normalizedRequestExporterId;
        
        if (!isOwnContract) {
          logger.warn(`Unauthorized contract creation attempt: ${userExporterId} (username: ${user.username}, role: ${user.role}) tried to create contract for ${exporterID}`);
          logger.info(`Authorization check: userExporterId=${normalizedUserExporterId}, requestExporterId=${normalizedRequestExporterId}, username=${normalizedUsername}, role=${user.role}`);
          return res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'You can only register contracts for your own organization',
              debug: {
                yourExporterId: userExporterId,
                yourUsername: user.username,
                yourRole: user.role,
                requestedExporterId: exporterID,
                hint: 'Your exporter_id must match the exporterID in the contract'
              }
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        logger.info(`✅ Authorized user (${user.role}) registering contract for ${exporterID}`);
      }

      // A corrected rejected contract is registered with a new immutable
      // contract ID and linked to the rejected source record for traceability.
      if (supersedesContractID) {
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        const rejectedSource = await db.get(
          `SELECT contract_id FROM contracts
           WHERE contract_id = $1 AND LOWER(exporter_id) = LOWER($2) AND LOWER(status) = 'rejected'`,
          [supersedesContractID, exporterID]
        );

        if (!rejectedSource) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CORRECTION_SOURCE',
              message: 'The rejected contract to correct was not found for this exporter',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // ✅ FIX: Validate document ownership (skip for privileged users)
      let documentIDs: string[] = [];
      if (documents && Array.isArray(documents)) {
        documentIDs = documents.map((doc: any) => doc.documentId || doc.id).filter(Boolean);
        
        // Verify documents exist and belong to the user (skip check for admins/ECTA)
        if (documentIDs.length > 0 && !isAuthorizedUser) {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          
          for (const docId of documentIDs) {
            // Check by username, userId, or exporterId to ensure the user owns the document
            const doc = await db.get(
              `SELECT document_id FROM documents 
               WHERE document_id = $1 
                 AND (
                   CAST(uploaded_by AS TEXT) = $2 OR 
                   CAST(uploaded_by AS TEXT) = CAST($3 AS TEXT) OR 
                   CAST(exporter_id AS TEXT) = CAST($4 AS TEXT) OR 
                   CAST(exporter_id AS TEXT) = $2
                 )`,
              [docId, user.username, user.userId || user.sub || '', user.exporterId]
            );
            
            if (!doc) {
              logger.warn(`Document ownership check failed for ${docId}: User ${user.username} (ID: ${user.userId}, Exporter: ${user.exporterId})`);
              return res.status(403).json({
                success: false,
                error: {
                  code: 'INVALID_DOCUMENT',
                  message: `Document ${docId} not found or does not belong to your organization`
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else if (documentIDs.length > 0 && isAuthorizedUser) {
          // Privileged users: just verify documents exist in database
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          
          for (const docId of documentIDs) {
            const doc = await db.get(
              `SELECT document_id FROM documents WHERE document_id = $1`,
              [docId]
            );
            
            if (!doc) {
              logger.warn(`Document not found: ${docId} (Admin user: ${user.username})`);
              return res.status(404).json({
                success: false,
                error: {
                  code: 'DOCUMENT_NOT_FOUND',
                  message: `Document ${docId} not found in system`
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
        
        logger.info(`Contract ${contractID}: Linking ${documentIDs.length} verified documents to blockchain`);
      }

      // Use new function if payment method is provided, otherwise use old function (backward compatibility)
      let result;
      let blockchainWriteSuccessful = false;
      
      try {
        // Use ContractService for registration
        result = await contractService.registerContract({
          contractID,
          exporterID,
          buyerID,
          buyerName: req.body.buyerName || buyerID,
          buyerCountry,
          buyerBank: buyerBank || '',
          exporterBank: exporterBank || '',
          coffeeType,
          quantity,
          pricePerKg,
          currency,
          paymentMethod: paymentMethod || 'LC',
          eudrRequired,
          documents: documentIDs,
          supersedesContractID: supersedesContractID || null,
          userId: user.username,
          userOrg: user.org || 'ECTA'
        });
        
        blockchainWriteSuccessful = result.success;
        
        // ✅ OPTIMIZATION: Invalidate cache for this contract and related queries
        const { CacheInvalidation } = await import('../services/blockchainCacheService');
        CacheInvalidation.contract(contractID, exporterID);
        
      } catch (error: any) {
        logger.error(`❌ Failed to register contract ${contractID}: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: {
            code: 'REGISTRATION_ERROR',
            message: error.message || 'Failed to register contract'
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (blockchainWriteSuccessful) {
        logger.info(`✅ Sales contract registered successfully: ${contractID}, paymentMethod: ${paymentMethod || 'LC (default)'}, txId: ${result.blockchainTxId}, documents: ${documentIDs.length}`);
        
        res.status(201).json({
          success: true,
          data: { 
            contractID, 
            status: 'pending', 
            blockchainSynced: true 
          },
          txId: result.blockchainTxId,
          documentsLinked: documentIDs.length,
          paymentMethod: paymentMethod || 'LC',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Contract is saved but blockchain sync is pending
        logger.warn(`Contract ${contractID} saved to database but blockchain write failed. Will retry later.`);
        res.status(202).json({
          success: true,
          warning: 'Contract saved but blockchain sync pending',
          data: { contractID, status: 'pending', blockchainSynced: false },
          txId: null,
          documentsLinked: documentIDs.length,
          paymentMethod: paymentMethod || 'LC',
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
    // ⚡ FETCH PostgreSQL and Fabric together so contract status stays current.
    logger.info('⚡ Starting PostgreSQL + blockchain contract fetch...');
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Start both queries in parallel
    const pgPromise = db.all(`
      SELECT 
        c.contract_id, c.exporter_id, c.buyer_id, c.buyer_country,
        c.buyer_bank, c.exporter_bank, c.coffee_type, c.quantity,
        c.price_per_kg, (c.quantity * c.price_per_kg) as total_value, c.currency,
        c.status as contract_status, c.eudr_required, c.created_at as registered_at, c.updated_at as approved_at,
        c.buyer_id as buyer_name, c.rejection_reason, c.rejection_date, c.rejected_by,
        c.supersedes_contract_id
      FROM contracts c
      WHERE LOWER(c.status) IN ('approved', 'registered', 'pending', 'rejected', 'draft')
      ORDER BY c.created_at DESC
    `).catch(err => {
      logger.error('PostgreSQL query error:', err);
      return [];
    });
    
    // Only query blockchain if explicitly requested via ?blockchain=true
    // This speeds up page loads dramatically (PostgreSQL: ~100ms vs Blockchain: ~30s+)
    const includeBlockchain = req.query.blockchain === 'true';
    
    let pgContracts: any[];
    let blockchainResult: { success: boolean; data: any[] } = { success: false, data: [] };
    
    if (includeBlockchain) {
      logger.info('🔗 Blockchain query requested via ?blockchain=true');
      const blockchainPromise = fabricService.getAllContracts().catch(err => {
        logger.warn('⚠️ Blockchain query failed:', err.message);
        return { success: false, data: [] };
      });
      
      // Await both sources in parallel
      const blockchainResultTemp = await blockchainPromise;
      blockchainResult = blockchainResultTemp as { success: boolean; data: any[] };
      pgContracts = await pgPromise;
    } else {
      // Fast path: PostgreSQL only
      logger.info('⚡ Fast mode: Using PostgreSQL only (add ?blockchain=true to include blockchain data)');
      pgContracts = await pgPromise;
    }
    
    logger.info(`✅ PostgreSQL returned ${pgContracts.length} contracts`);
    
    // Map PostgreSQL data
    const result: { success: boolean; data: any[] } = {
      success: true,
      data: pgContracts.map((c: any) => ({
        contractId: c.contract_id,
        ContractID: c.contract_id,
        exporterId: c.exporter_id,
        ExporterID: c.exporter_id,
        buyerId: c.buyer_id,
        BuyerID: c.buyer_id,
        buyerName: c.buyer_name || c.buyer_id,
        BuyerName: c.buyer_name || c.buyer_id,
        buyerCountry: c.buyer_country,
        BuyerCountry: c.buyer_country,
        buyerBank: c.buyer_bank,
        exporterBank: c.exporter_bank,
        coffeeType: c.coffee_type,
        CoffeeType: c.coffee_type,
        quantity: parseFloat(c.quantity) || 0,
        Quantity: parseFloat(c.quantity) || 0,
        pricePerKg: parseFloat(c.price_per_kg) || 0,
        PricePerKg: parseFloat(c.price_per_kg) || 0,
        totalValue: parseFloat(c.total_value) || 0,
        TotalValue: parseFloat(c.total_value) || 0,
        currency: c.currency,
        Currency: c.currency,
        paymentMethod: c.payment_method || 'LC',
        status: c.contract_status.toUpperCase(),
        contractStatus: c.contract_status.toUpperCase(),
        ContractStatus: c.contract_status.toUpperCase(),
        rejectionReason: c.rejection_reason || '',
        rejectionDate: c.rejection_date || null,
        rejectedBy: c.rejected_by || '',
        supersedesContractId: c.supersedes_contract_id || '',
        eudrRequired: c.eudr_required,
        registeredAt: c.registered_at,
        approvedAt: c.approved_at,
      }))
    };
    
    if (blockchainResult.success && Array.isArray(blockchainResult.data)) {
      logger.info(`🔗 Blockchain sync completed: ${blockchainResult.data.length} contracts`);
      const getChainStatus = (contract: any) => String(
        contract?.contractStatus || contract?.ContractStatus || contract?.status || ''
      ).trim().toUpperCase();
      const rejectedOnChain = blockchainResult.data.filter((contract: any) => getChainStatus(contract) === 'REJECTED');
      const approvedOnChain = blockchainResult.data.filter((contract: any) => getChainStatus(contract) === 'APPROVED');

      const toApiContract = (contract: any, status = 'REJECTED') => ({
        contractId: contract?.contractId || contract?.ContractID || '',
        ContractID: contract?.contractId || contract?.ContractID || '',
        exporterId: contract?.exporterId || contract?.ExporterID || '',
        ExporterID: contract?.exporterId || contract?.ExporterID || '',
        buyerId: contract?.buyerId || contract?.BuyerID || '',
        BuyerID: contract?.buyerId || contract?.BuyerID || '',
        buyerName: contract?.buyerName || contract?.BuyerName || contract?.buyerId || '',
        BuyerName: contract?.buyerName || contract?.BuyerName || contract?.buyerId || '',
        buyerCountry: contract?.buyerCountry || contract?.BuyerCountry || '',
        buyerBank: contract?.buyerBank || contract?.BuyerBank || '',
        exporterBank: contract?.exporterBank || contract?.ExporterBank || '',
        coffeeType: contract?.coffeeType || contract?.CoffeeType || '',
        quantity: Number(contract?.quantity ?? contract?.Quantity) || 0,
        pricePerKg: Number(contract?.pricePerKg ?? contract?.PricePerKg) || 0,
        totalValue: Number(contract?.totalValue ?? contract?.TotalValue) || 0,
        currency: contract?.currency || contract?.Currency || 'USD',
        status,
        contractStatus: status,
        ContractStatus: status,
        rejectionReason: contract?.rejectionReason || contract?.RejectionReason || '',
        rejectionDate: contract?.rejectionDate || contract?.RejectionDate || null,
        rejectedBy: contract?.rejectedBy || contract?.RejectedBy || '',
        paymentMethod: contract?.paymentMethod || contract?.PaymentMethod || 'LC',
        eudrRequired: contract?.eudrRequired ?? contract?.EUDRRequired ?? false,
        registrationDate: contract?.registrationDate || contract?.RegistrationDate || null,
        supersedesContractId: '',
      });

      for (const chainContract of rejectedOnChain) {
        const chainId = String(chainContract?.contractId || chainContract?.ContractID || '');
        if (!chainId) continue;
        const chainData = toApiContract(chainContract);
        const index = result.data.findIndex((contract: any) => String(contract.contractId) === chainId);

        if (index >= 0) {
          result.data[index] = {
            ...result.data[index],
            ...chainData,
            buyerBank: chainData.buyerBank || result.data[index].buyerBank,
            exporterBank: chainData.exporterBank || result.data[index].exporterBank,
            rejectionReason: chainData.rejectionReason || result.data[index].rejectionReason,
            rejectionDate: chainData.rejectionDate || result.data[index].rejectionDate,
            rejectedBy: chainData.rejectedBy || result.data[index].rejectedBy,
          };
        } else {
          result.data.push(chainData);
        }

        // Keep PostgreSQL aligned for other portals without writing on every read.
        const pgContract = pgContracts.find((contract: any) => String(contract.contract_id) === chainId);
        const needsSync = !pgContract ||
          String(pgContract.status || '').toUpperCase() !== 'REJECTED' ||
          (chainData.rejectionReason && pgContract.rejection_reason !== chainData.rejectionReason) ||
          (chainData.rejectedBy && pgContract.rejected_by !== chainData.rejectedBy) ||
          (chainData.rejectionDate && !pgContract.rejection_date);

        if (needsSync) {
          try {
            await db.run(
              `UPDATE contracts
               SET status = 'REJECTED',
                   rejection_reason = COALESCE(NULLIF($1, ''), rejection_reason),
                   rejection_date = COALESCE($2, rejection_date, CURRENT_TIMESTAMP),
                   rejected_by = COALESCE(NULLIF($3, ''), rejected_by),
                   updated_at = CURRENT_TIMESTAMP
               WHERE contract_id = $4`,
              [chainData.rejectionReason, chainData.rejectionDate, chainData.rejectedBy, chainId]
            );
          } catch (syncError) {
            logger.warn(`Could not sync rejected contract ${chainId} to PostgreSQL:`, syncError);
          }
        }
      }

      // ECTA approval on Fabric is the source of truth. Include approved
      // contracts even when PostgreSQL has not received or persisted the update.
      for (const chainContract of approvedOnChain) {
        const chainId = String(chainContract?.contractId || chainContract?.ContractID || '');
        if (!chainId) continue;
        const chainData = toApiContract(chainContract, 'APPROVED');
        const index = result.data.findIndex((contract: any) => String(contract.contractId) === chainId);

        if (index >= 0) {
          result.data[index] = {
            ...result.data[index],
            ...chainData,
            buyerBank: chainData.buyerBank || result.data[index].buyerBank,
            exporterBank: chainData.exporterBank || result.data[index].exporterBank,
          };
        } else {
          result.data.push(chainData);
        }

        const pgContract = pgContracts.find((contract: any) => String(contract.contract_id) === chainId);
        if (pgContract && String(pgContract.status || '').toUpperCase() !== 'APPROVED') {
          try {
            await db.run(
              `UPDATE contracts SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE contract_id = $1`,
              [chainId]
            );
          } catch (syncError) {
            logger.warn(`Could not sync approved contract ${chainId} to PostgreSQL:`, syncError);
          }
        }
      }
    } else {
      logger.warn('Blockchain contract query unavailable; serving PostgreSQL contracts only');
    }
    
    if (result.data) {
      logger.info(`First contract sample: ${JSON.stringify(result.data[0] || 'none')}`);
    }

    if (result.success) {
      const contracts = result.data || [];
      const normalizedContracts = contracts.map((contract: any) => ({
        contractId: contract?.contractId || contract?.ContractID || contract?.id || '',
        exporterId: contract?.exporterId || contract?.ExporterID || contract?.exporterID || '',
        buyerId: contract?.buyerId || contract?.BuyerID || contract?.buyerID || '',
        buyerName: contract?.buyerName || contract?.BuyerName || '',
        buyerCountry: contract?.buyerCountry || contract?.BuyerCountry || '',
        buyerBank: contract?.buyerBank || contract?.BuyerBank || '',
        exporterBank: contract?.exporterBank || contract?.ExporterBank || '',
        coffeeType: contract?.coffeeType || contract?.CoffeeType || '', // ✅ FIX: Add coffeeType mapping
        amount: contract?.amount ?? contract?.Amount ?? contract?.totalValue ?? contract?.TotalValue ?? 0,
        currency: contract?.currency || contract?.Currency || 'USD',
        pricePerKg: contract?.pricePerKg ?? contract?.PricePerKg ?? 0,
        quantity: contract?.quantity ?? contract?.Quantity ?? 0,
        totalValue: contract?.totalValue ?? contract?.TotalValue ?? contract?.amount ?? contract?.Amount ?? 0,
        paymentMethod: contract?.paymentMethod || contract?.PaymentMethod || 'LC',
        status: contract?.status || contract?.contractStatus || contract?.ContractStatus || 'PENDING',
        contractStatus: contract?.contractStatus || contract?.status || contract?.ContractStatus || 'REGISTERED', // Keep original field
        eudrRequired: contract?.eudrRequired ?? contract?.EUDRRequired ?? false,
        registrationDate: contract?.registrationDate || contract?.registeredAt || contract?.createdAt || null,
        approvalDate: contract?.approvalDate || contract?.approvedAt || null,
        rejectionReason: contract?.rejectionReason || contract?.RejectionReason || '',
        rejectionDate: contract?.rejectionDate || contract?.RejectionDate || null,
        rejectedBy: contract?.rejectedBy || contract?.RejectedBy || '',
        supersedesContractId: contract?.supersedesContractId || contract?.SupersedesContractId || '',
        terms: contract?.terms || contract?.Terms || '',
      }));

      // Enrichment block removed as 'buyers' table does not exist
      logger.info(`✅ Processing ${normalizedContracts.length} contracts for display`);


      // Debug: Log first normalized contract to see structure
      if (normalizedContracts.length > 0) {
        logger.info(`First normalized contract: ${JSON.stringify(normalizedContracts[0])}`);
      }
      
      // Filter valid contracts
      const allCount = normalizedContracts.length;
      const validContracts = dedupeById(normalizedContracts.filter(c => {
        // Rejected records must remain visible even when ECTA rejected them
        // for missing/invalid fields; require only enough ownership data to
        // avoid exposing an unowned record in exporter-facing views.
        const isIdentifiableRejectedContract =
          String(c.status || c.contractStatus || '').toUpperCase() === 'REJECTED' &&
          hasText(c.contractId) &&
          hasText(c.exporterId);
        const valid = isValidContract(c) || isIdentifiableRejectedContract;
        if (!valid) {
          logger.warn(`Contract ${c.contractId} failed validation: ${JSON.stringify({
            contractId: c.contractId,
            exporterId: c.exporterId,
            buyerId: c.buyerId,
            buyerCountry: c.buyerCountry,
            coffeeType: c.coffeeType,
            quantity: c.quantity,
            pricePerKg: c.pricePerKg,
            currency: c.currency
          })}`);
        }
        return valid;
      }), (contract: any) => contract.contractId);
      logger.info(`✅ Valid contracts after filtering: ${validContracts.length}/${allCount}`);
      const { exporterID, status, eudrRequired, limit = 50, offset = 0 } = req.query;

      // Apply filters
      let filteredContracts = validContracts;
      if (exporterID) {
        filteredContracts = filteredContracts.filter((contract: any) => contract.exporterId === exporterID);
      }
      if (status) {
        filteredContracts = filteredContracts.filter((contract: any) => contract.status === status);
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
          message: 'Failed to retrieve contracts',
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
 * /api/v1/contracts/{contractID}/documents:
 *   get:
 *     summary: Get all documents for a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractID
 *         required: true
 */
router.get('/:contractID/documents',
  authMiddleware,
  [param('contractID').notEmpty().withMessage('Contract ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { contractID } = req.params;
      logger.info(`Fetching documents for contract: ${contractID}`);
      
      const { DatabaseService } = await import('../services/databaseService');
      
      const db = DatabaseService.getInstance();
      
      // Get all documents for this contract
      logger.info(`Querying database for contract documents: ${contractID}`);
      const documents = await db.all(
        `SELECT 
          document_id, 
          document_type, 
          contract_id as entity_id,
          'CONTRACT' as entity_type,
          file_name, 
          file_size, 
          mime_type, 
          uploaded_by, 
          uploaded_at,
          upload_date,
          verification_status,
          status,
          metadata
         FROM documents 
         WHERE contract_id = $1 AND (status IS NULL OR status != 'deleted')
         ORDER BY COALESCE(uploaded_at, upload_date, created_at) DESC`,
        [contractID]
      );
      
      logger.info(`Found ${documents.length} documents for contract ${contractID}`);
      
      // Normalize document fields to match UI expectations (both camelCase and snake_case)
      const normalizedDocs = documents.map((doc: any) => {
        let parsedMetadata = {};
        try {
          parsedMetadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
        } catch {
          parsedMetadata = {};
        }
        
        return {
          document_id: doc.document_id,
          filename: doc.file_name,
          file_name: doc.file_name,
          size: doc.file_size,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          mimeType: doc.mime_type,
          document_type: doc.document_type,
          uploaded_at: doc.uploaded_at,
          uploadedAt: doc.uploaded_at,
          verification_status: doc.verification_status || 'pending',
          verificationStatus: doc.verification_status || 'pending',
          status: doc.status,
          uploaded_by: doc.uploaded_by,
          uploadedBy: doc.uploaded_by,
          entity_id: doc.entity_id,
          entityId: doc.entity_id,
          entity_type: doc.entity_type,
          entityType: doc.entity_type,
          metadata: parsedMetadata
        };
      });
      
      // Try to load document validation utilities (non-fatal if it fails)
      let requirements: any = {
        allRequired: true,
        missing: [],
        details: []
      };
      
      try {
        const { checkRequiredDocuments, DOCUMENT_TYPES } = await import('../utils/documentValidation');
        
        // Check requirements
        const docTypes = normalizedDocs
          .filter((d: any) => d.status === 'active')
          .map((d: any) => d.document_type);
        const requirementCheck = checkRequiredDocuments('contract', docTypes);
        
        // Get requirement details
        requirements = {
          allRequired: requirementCheck.valid,
          missing: requirementCheck.errors,
          details: ['CONTRACT_SIGNED', 'PROFORMA_INVOICE'].map(type => ({
            type,
            name: (DOCUMENT_TYPES as any)[type]?.name || type,
            required: (DOCUMENT_TYPES as any)[type]?.required || false,
            uploaded: docTypes.includes(type)
          }))
        };
      } catch (validationError) {
        logger.warn('Document validation utilities not available, skipping requirement check:', validationError);
      }
      
      res.json({
        success: true,
        data: {
          documents: normalizedDocs,
          count: normalizedDocs.length,
          requirements
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching contract documents:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch contract documents',
          details: error.stack
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

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
      const { blockchainCache, CacheKeys } = await import('../services/blockchainCacheService');
      
      // ✅ OPTIMIZATION: Try cache first, then blockchain, then PostgreSQL
      let blockchainData = null;
      let source = 'cache';
      
      try {
        blockchainData = await blockchainCache.get(
          CacheKeys.contract(contractID),
          async () => {
            const result = await fabricService.getSalesContract(contractID);
            if (result.success) {
              return result.data;
            }
            throw new Error('Contract not found on blockchain');
          },
          5 * 60 * 1000 // 5 minute cache
        );
        
        // If we got here without throwing, check if it came from cache or blockchain
        const cached = blockchainCache.getStats();
        source = 'blockchain'; // Since get() returns data, it was either cache hit or fresh fetch
      } catch (blockchainError: any) {
        logger.warn(`Blockchain query failed for contract ${contractID}, falling back to PostgreSQL: ${blockchainError.message}`);
      }
      
      // Fall back to PostgreSQL if blockchain failed
      if (!blockchainData) {
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        
        const contract = await db.get(
          `SELECT * FROM contracts WHERE contract_id = $1`,
          [contractID]
        );
        
        if (contract) {
          source = 'database';
          blockchainData = {
            contractID: contract.contract_id,
            exporterID: contract.exporter_id,
            buyerID: contract.buyer_id,
            buyerCountry: contract.buyer_country,
            buyerBank: contract.buyer_bank,
            exporterBank: contract.exporter_bank,
            coffeeType: contract.coffee_type,
            quantity: contract.quantity,
            pricePerKg: contract.price_per_kg,
            currency: contract.currency,
            paymentMethod: contract.payment_method,
            eudrRequired: contract.eudr_required,
            status: contract.status,
            blockchainTxId: contract.blockchain_tx_id,
            blockchainSynced: contract.blockchain_synced || false,
            createdAt: contract.created_at
          } as any;
        }
      }

      if (blockchainData) {
        // ✅ FETCH LINKED DOCUMENTS
        try {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          const documents = await db.all(
            'SELECT document_id, document_type, file_name, status, verification_status FROM documents WHERE contract_id = $1',
            [contractID]
          );
          (blockchainData as any).documents = documents || [];
        } catch (docError) {
          logger.warn(`Failed to fetch documents for contract ${contractID}:`, docError);
          if (!(blockchainData as any).documents) {
            (blockchainData as any).documents = [];
          }
        }

        res.json({
          success: true,
          data: blockchainData,
          source: source,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Contract not found in blockchain or database',
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
  async (req, res) => {
    try {
      const { contractId } = req.body;
      const user = (req as any).user;
      const userOrg = String(user?.org || '').toUpperCase();
      const userRole = String(user?.role || '').toUpperCase();
      
      if (!contractId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'contractId is required' },
          timestamp: new Date().toISOString()
        });
      }

      if (userOrg !== 'ECTAMSP' && userRole !== 'ECTA' && userRole !== 'ECTA_ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only ECTA users can approve sales contracts' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[CONTRACTS] Approving contract:', { contractId, userId: user?.sub, userOrg, userRole });

      await fabricService.connectAsOrg('ECTAMSP');
      const result = await fabricService.approveSalesContract(contractId);

      if (!result.success) {
        return res.status(409).json({
          success: false,
          error: { code: 'APPROVAL_REJECTED', message: result.error || 'Fabric rejected the contract approval' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[CONTRACTS] Contract approval committed:', { contractId, txId: result.txId });
      
      res.json({
        success: true,
        message: 'Contract approved successfully',
        data: { contractId, txId: result.txId },
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
 *     summary: Approve a sales contract (ECTA - Export Compliance)
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
 *         description: Contract approved successfully by ECTA
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
  async (req, res) => {
    try {
      const { contractID } = req.params;
      const user = (req as any).user; // Get authenticated user info
      const userOrg = String(user?.org || '').toUpperCase();
      const userRole = String(user?.role || '').toUpperCase();

      // Only ECTA can approve sales contracts for export compliance
      if (userOrg !== 'ECTAMSP' && userRole !== 'ECTA') {
        logger.warn(`Unauthorized sales contract approval attempt by ${user?.org || 'UNKNOWN'}: ${contractID}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only ECTA users can approve sales contracts for export compliance',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ DOCUMENT VERIFICATION: Ensure required documents are present and signed
      const { DatabaseService } = await import('../services/databaseService');
      const db = DatabaseService.getInstance();
      
      const requiredDocs = ['CONTRACT_SIGNED', 'PROFORMA_INVOICE'];
      const uploadedDocs = await db.all(
        `SELECT document_type, verification_status, status 
         FROM documents 
         WHERE entity_id = $1 AND entity_type = 'CONTRACT' AND status = 'active'`,
        [contractID]
      );
      
      const uploadedTypes = uploadedDocs.map(d => d.document_type);
      const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));
      
      if (missingDocs.length > 0) {
        logger.warn(`Contract ${contractID} approval blocked: Missing required documents: ${missingDocs.join(', ')}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_DOCUMENTS',
            message: `Required documents missing: ${missingDocs.join(', ')}. Please upload and sign these documents first.`,
            details: missingDocs
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      // ECTA approval signs the attached contract documents in the ECTA's own
      // identity below. Do not require an earlier signature here, which would
      // prevent the approval workflow from signing unsigned documents.
      logger.info(`✅ Required document presence verified for contract ${contractID}; ECTA signatures will be recorded after approval`);

      // Log which organization is approving
      logger.info(`[${user.org}] ECTA approving contract for export compliance: ${contractID}`, {
        userId: user?.sub,
        organization: user?.org,
        role: user?.role,
      });
      
      // Get current contract status for validation
      const contractData = await fabricService.getSalesContract(contractID);
      if (!contractData.success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contract not found' },
          timestamp: new Date().toISOString(),
        });
      }
      
      const currentStatus = contractData.data?.status || contractData.data?.Status || 'REGISTERED';
      
      // Validate status transition
      const isValid = statusManager.validateTransition('CONTRACT', currentStatus, 'APPROVED');
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot approve contract: Invalid status transition from ${currentStatus} to APPROVED`,
            allowedStatuses: statusManager.getNextStatuses('CONTRACT', currentStatus),
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      // Use ContractService for approval
      const result = await contractService.approveContract({
        contractID,
        approvedBy: user.username,
        approverOrg: user.org || 'ECTAMSP'
      });

      if (result.success) {
        // Update status with cascading effects
        await statusManager.updateEntityStatus('CONTRACT', contractID, currentStatus, 'APPROVED');
        
        logger.info(`✅ Contract ${contractID} approved successfully`);
        
        // ECTA approval hands LC-payment contracts to the bank as a real LC request.
        // Keep this idempotent so a retry never creates a second request.
        let lcHandoff: { status: 'created' | 'already_exists' | 'not_required' | 'failed'; lcId?: string; message?: string } = {
          status: 'not_required',
        };
        const approvedContract = contractData.data || {};
        const paymentMethod = String(approvedContract.paymentMethod || approvedContract.PaymentMethod || 'LC').trim().toUpperCase();
        if (paymentMethod === 'LC') {
          const generatedLcId = `LC-${contractID}`;
          try {
            const allLCs = await fabricService.queryChaincode('QueryAllLCs', []);
            const existingLC = allLCs.success && Array.isArray(allLCs.data)
              ? allLCs.data.find((lc: any) => String(lc.contractId || lc.ContractID || '') === contractID)
              : undefined;

            if (existingLC) {
              lcHandoff = {
                status: 'already_exists',
                lcId: existingLC.lcId || existingLC.LCID,
                message: 'An LC request already exists for this contract.',
              };
            } else {
              const amount = Number(approvedContract.totalValue ?? approvedContract.TotalValue ?? 0) ||
                (Number(approvedContract.quantity ?? approvedContract.Quantity ?? 0) * Number(approvedContract.pricePerKg ?? approvedContract.PricePerKg ?? 0));
              const currency = String(approvedContract.currency || approvedContract.Currency || 'USD');
              const exporterId = String(approvedContract.exporterId || approvedContract.ExporterID || '');
              const buyerCountry = String(approvedContract.buyerCountry || approvedContract.BuyerCountry || '');
              const issuingBank = String(approvedContract.buyerBank || approvedContract.BuyerBank || `Foreign Bank - ${buyerCountry}`);
              const advisingBank = String(approvedContract.exporterBank || approvedContract.ExporterBank || 'Commercial Bank of Ethiopia');
              const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

              const requestResult = await fabricService.requestLC(
                generatedLcId,
                contractID,
                exporterId,
                advisingBank,
                amount.toFixed(2),
                currency,
                expiryDate
              );
              if (!requestResult.success) {
                throw new Error(requestResult.error || 'The ledger rejected the generated LC request.');
              }

              try {
                const { DatabaseService: HandoffDatabaseService } = await import('../services/databaseService');
                const handoffDb = HandoffDatabaseService.getInstance();
                await handoffDb.run(
                  `INSERT INTO letters_of_credit (
                    lc_id, lc_number, contract_id, exporter_id, issuing_bank, amount, currency,
                    status, expiry_date, request_date, created_at, updated_at
                  ) VALUES ($1, $1, $2, $3, $4, $5, $6, 'REQUESTED', $7, NOW(), NOW(), NOW())
                  ON CONFLICT (lc_id) DO NOTHING`,
                  [generatedLcId, contractID, exporterId, issuingBank, amount, currency, expiryDate]
                );
              } catch (syncError) {
                logger.warn(`[LC HANDOFF] PostgreSQL sync failed for ${generatedLcId}; blockchain request is committed:`, syncError);
              }

              lcHandoff = {
                status: 'created',
                lcId: generatedLcId,
                message: 'LC request created and handed to the bank for review.',
              };
              logger.info(`[LC HANDOFF] Created ${generatedLcId} for ECTA-approved contract ${contractID}`);
            }
          } catch (handoffError: any) {
            lcHandoff = {
              status: 'failed',
              lcId: generatedLcId,
              message: handoffError?.message || 'Contract approved, but automatic LC handoff failed.',
            };
            logger.error(`[LC HANDOFF] Failed for approved contract ${contractID}:`, handoffError);
          }
        }

        // ⚡ PERFORMANCE FIX: Sign documents asynchronously in the background
        // This prevents approval from timing out when there are many documents
        const signerOrg = fabricService.getMspFromRole(user.role);
        const signerUsername = user.username || user.sub || 'ecta_officer';
        const signerEmail = user.email;
        const userSub = user.sub;
        
        // Get document count for response
        const { DatabaseService } = await import('../services/databaseService');
        const db = DatabaseService.getInstance();
        const contractDocuments = await db.all(
          `SELECT document_id, file_path, file_hash, mime_type, file_name, document_type
           FROM documents
           WHERE UPPER(entity_type) = 'CONTRACT' AND entity_id = $1 AND status = 'active'
           ORDER BY document_id`,
          [contractID]
        );
        const documentCount = contractDocuments.length;
        
        logger.info(`⚡ Contract ${contractID} approved. Starting background document signing for ${documentCount} documents...`);
        
        // Start document signing in background (don't await)
        setImmediate(async () => {
          const documentSigning = { total: documentCount, signed: 0, alreadySigned: 0, failed: [] as Array<{ documentId: string; reason: string }> };
          try {
            const { persistDocumentLedgerProof, signDocumentFile } = await import('../services/documentSigningService');
            
            for (const doc of contractDocuments) {
              try {
                const priorSignature = await db.get(
                  `SELECT signature_id FROM document_signatures
                   WHERE document_id = $1 AND signer_org = $2 AND signature_type = 'APPROVE'
                     AND signer_id = $3 LIMIT 1`,
                  [doc.document_id, signerOrg, signerUsername]
                );
                if (priorSignature) {
                  documentSigning.alreadySigned += 1;
                  continue;
                }

                const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
                if (!resolvedPath) throw new Error('Stored document file is unavailable');
                if (!fabricService.isConnected()) throw new Error('Fabric is unavailable');

                const signatureId = `SIG-${doc.document_id}-${signerOrg}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                const remarks = `Contract ${contractID} approved by ECTA for export compliance`;
                const proof = await signDocumentFile({
                  filePath: resolvedPath,
                  signerUsername,
                  signerEmail,
                  organization: signerOrg,
                  reason: remarks,
                  documentId: doc.document_id,
                  documentType: doc.document_type || 'OTHER',
                });
                if (!proof.detachedSignatureCreated) {
                  throw new Error('Document hash could not be confirmed from Fabric; no signature was recorded');
                }

                const blockchainResult = await fabricService.signDocument(
                  doc.document_id,
                  proof.documentHash,
                  'APPROVE',
                  remarks
                );
                if (!blockchainResult.success || !blockchainResult.txId) {
                  throw new Error(blockchainResult.error || 'Fabric rejected the document signature');
                }

                await db.run(
                  `INSERT INTO document_signatures (
                    signature_id, document_id, signer_id, signer_org, signature_type,
                    certificate_id, remarks, blockchain_tx_id, visual_signature_added,
                    detached_signature_created, document_hash_signed
                  ) VALUES ($1, $2, $3, $4, 'APPROVE', $5, $6, $7, FALSE, TRUE, $8)`,
                  [signatureId, doc.document_id, signerUsername, signerOrg, userSub || null, remarks, blockchainResult.txId, proof.documentHash]
                );
                await persistDocumentLedgerProof(
                  db,
                  signatureId,
                  doc.document_id,
                  proof.documentHash,
                  true,
                  blockchainResult.txId
                );
                documentSigning.signed += 1;
              } catch (docError) {
                const reason = docError instanceof Error ? docError.message : 'Unknown signing error';
                documentSigning.failed.push({ documentId: doc.document_id, reason });
                logger.error(`Failed to sign contract document ${doc.document_id}: ${reason}`);
              }
            }

            logger.info(`✅ Background document signing complete for ${contractID}`, documentSigning);
          } catch (signError) {
            const reason = signError instanceof Error ? signError.message : 'Unknown signing error';
            logger.error(`Failed to sign documents for contract ${contractID}: ${reason}`);
          }
        });

        // ✅ LOG TO AUDIT TRAIL - Contract Approved
        try {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          
          await db.run(
            `INSERT INTO audit_trail (
              entity_type, entity_id, action, performed_by, performed_by_org, 
              old_value, new_value, reason, metadata, ip_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              'CONTRACT',
              contractID,
              'APPROVE',
              user?.sub || user?.username || 'ECTA',
              user?.org || 'ECTAMSP',
              currentStatus,
              'APPROVED',
              'Contract approved by ECTA for export compliance',
              JSON.stringify({
                contractId: contractID,
                approvedBy: user?.sub || user?.username,
                role: user?.role,
                organization: user?.org,
                transactionId: result.txId,
                action: 'Export Compliance Approval',
                timestamp: new Date().toISOString()
              }),
              req.ip || req.connection.remoteAddress || 'unknown'
            ]
          );
          logger.info(`✅ Audit log created for contract approval: ${contractID}`);
        } catch (auditError) {
          logger.error('Failed to create audit log:', auditError);
          // Don't fail the request if audit logging fails
        }
        
        logger.info(`[${user?.org}] ✅ Sales contract approved by ECTA for export compliance: ${contractID}`);
        res.json({
          success: true,
          contractID: result.contractID,
          txId: result.txId,
          lcHandoff,
          documentSigning: {
            status: 'IN_PROGRESS',
            message: `Signing ${documentCount} documents in background`,
            totalDocuments: documentCount
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'APPROVAL_FAILED',
            message: 'Failed to approve contract',
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
/**
 * @swagger
 * /api/v1/contracts/{contractID}/reject:
 *   post:
 *     summary: Reject a sales contract (ECTA - Export Compliance)
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractID
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               rejectedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contract rejected successfully by ECTA
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.post('/:contractID/reject',
  authMiddleware,
  [
    param('contractID').notEmpty().withMessage('Contract ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    body('rejectedBy').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { contractID } = req.params;
      const { reason, rejectedBy } = req.body;
      const user = (req as any).user;
      const rejectionFeedback = typeof reason === 'string' ? reason.trim() : '';
      const userOrg = String(user?.org || '').toUpperCase();
      const userRole = String(user?.role || '').toUpperCase();

      // Only ECTA can reject sales contracts
      if (userOrg !== 'ECTAMSP' && userRole !== 'ECTA') {
        logger.warn(`Unauthorized contract rejection attempt by ${user?.org || 'UNKNOWN'}: ${contractID}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only ECTA users can reject sales contracts',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const feedbackParts = rejectionFeedback.match(
        /^Field to correct:\s*([^\n]+)\nRequired change:\s*([\s\S]+)$/i
      );
      if (!feedbackParts || feedbackParts[1].trim().length === 0 || feedbackParts[2].trim().length < 20) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ACTIONABLE_REJECTION_FEEDBACK_REQUIRED',
            message: 'Select the affected field and describe the required correction in at least 20 characters.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[${user.org}] ECTA rejecting contract: ${contractID}`, {
        userId: user?.sub,
        organization: user?.org,
        role: user?.role,
        reason: rejectionFeedback,
      });
      
      // Get current contract status for validation
      const contractData = await fabricService.getSalesContract(contractID);
      if (!contractData.success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contract not found' },
          timestamp: new Date().toISOString(),
        });
      }
      
      const currentStatus = contractData.data?.status || contractData.data?.Status || 'REGISTERED';
      
      // Validate status transition
      const isValid = statusManager.validateTransition('CONTRACT', currentStatus, 'REJECTED');
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot reject contract: Invalid status transition from ${currentStatus} to REJECTED`,
            allowedStatuses: statusManager.getNextStatuses('CONTRACT', currentStatus),
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      // Use ContractService for rejection
      const result = await contractService.rejectContract({
        contractID,
        rejectedBy: rejectedBy || user?.username || 'ECTA Officer',
        reason: rejectionFeedback,
        rejectorOrg: user?.org || 'ECTAMSP'
      });

      if (result.success) {
        // Update status with cascading effects
        await statusManager.updateEntityStatus('CONTRACT', contractID, currentStatus, 'REJECTED');
        
        logger.info(`✅ Contract ${contractID} rejected successfully`);
        
        // ✅ LOG TO AUDIT TRAIL - Contract Rejected
        try {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          
          await db.run(
            `INSERT INTO audit_trail (
              entity_type, entity_id, action, performed_by, performed_by_org, 
              old_value, new_value, reason, metadata, ip_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              'CONTRACT',
              contractID,
              'REJECT',
              user?.sub || user?.username || 'ECTA',
              user?.org || 'ECTAMSP',
              currentStatus,
              'REJECTED',
              rejectionFeedback,
              JSON.stringify({
                contractId: contractID,
                rejectedBy: rejectedBy || user?.username,
                role: user?.role,
                organization: user?.org,
                transactionId: result.txId,
                rejectionReason: rejectionFeedback,
                action: 'Contract Rejection - Compliance Issues',
                timestamp: new Date().toISOString()
              }),
              req.ip || (req as any).connection?.remoteAddress || 'unknown'
            ]
          );
          logger.info(`✅ Audit log created for contract rejection: ${contractID}`);
        } catch (auditError) {
          logger.error('Failed to create audit log:', auditError);
          // Don't fail the request if audit logging fails
        }
        
        logger.info(`[${user?.org}] ✅ Sales contract rejected by ECTA: ${contractID}, Reason: ${rejectionFeedback}`);
        res.json({
          success: true,
          contractID: result.contractID,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'REJECTION_FAILED',
            message: 'Failed to reject contract',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error rejecting contract:', error);
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

// REMOVED: Bank contract approval endpoints
// Banks should only issue LCs for ECTA-approved contracts
// Contract approval is ECTA's responsibility only

/**
 * POST /api/v1/contracts/:contractID/nbe-approve
 * DEPRECATED: This endpoint is deprecated. NBE should use forex allocation endpoints instead.
 * NBE's role is to allocate forex using AllocateForex chaincode function, not approve contracts.
 * Contract approval is done by ECTA for export compliance.
 * 
 * This endpoint is kept for backward compatibility but will be removed in future versions.
 */
router.post('/:contractID/nbe-approve',
  authMiddleware,
  [
    param('contractID').notEmpty().withMessage('Contract ID is required'),
    body('approvedBy').notEmpty().withMessage('Approving officer is required'),
    body('approvalType').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { contractID } = req.params;
      const { approvedBy } = req.body;

      logger.warn(`[NBE] Deprecated nbe-approve endpoint called for contract ${contractID}. Use forex allocation instead.`);

      // Return deprecation warning
      res.status(400).json({
        success: false,
        error: {
          code: 'ENDPOINT_DEPRECATED',
          message: 'This endpoint is deprecated. NBE should use forex allocation endpoints. Contract approval is done by ECTA.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in deprecated NBE endpoint:', error);
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
