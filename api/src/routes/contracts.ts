// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Sales Contracts API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { dedupeById, isValidContract } from '../utils/dataFilters';
import { statusManager } from '../utils/statusManager';
import { resolveDocumentPath } from '../utils/fileUtils';

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
      } = req.body;

      // ✅ FIX: Authorization check - handle both field names (exporterId and exporter_id)
      const user = (req as any).user;
      const userExporterId = user.exporterId || user.exporter_id || user.username;
      
      if (userExporterId !== exporterID && user.username !== exporterID && user.role !== 'ADMIN') {
        logger.warn(`Unauthorized contract creation attempt: ${userExporterId} tried to create contract for ${exporterID}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only register contracts for your own organization'
          },
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ FIX: Validate document ownership
      let documentIDs: string[] = [];
      if (documents && Array.isArray(documents)) {
        documentIDs = documents.map((doc: any) => doc.documentId || doc.id).filter(Boolean);
        
        // Verify documents exist and belong to the user
        if (documentIDs.length > 0) {
          const { DatabaseService } = await import('../services/databaseService');
          const db = DatabaseService.getInstance();
          
          for (const docId of documentIDs) {
            const doc = await db.get(
              'SELECT document_id FROM documents WHERE document_id = $1 AND uploaded_by = $2',
              [docId, user.username]
            );
            
            if (!doc) {
              return res.status(403).json({
                success: false,
                error: {
                  code: 'INVALID_DOCUMENT',
                  message: `Document ${docId} not found or does not belong to you`
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
        if (paymentMethod) {
          result = await fabricService.invokeChaincode('RegisterSalesContractWithPaymentMethod', [
            contractID,
            exporterID,
            buyerID,
            req.body.buyerName || buyerID, // ✅ FIX: Add buyerName parameter
            buyerCountry,
            coffeeType,
            quantity.toString(),
            pricePerKg.toString(),
            currency,
            eudrRequired.toString(),
            buyerBank || '',
            exporterBank || '',
            paymentMethod,
            JSON.stringify(documentIDs)
          ]);
        } else {
          result = await fabricService.registerSalesContract(
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
        }
        blockchainWriteSuccessful = result.success;
      } catch (blockchainError: any) {
        // ✅ FIX: Don't fail the entire request if blockchain times out
        // Log error and continue with PostgreSQL storage
        logger.error(`⚠️ Blockchain write failed for contract ${contractID}: ${blockchainError.message}`);
        result = {
          success: false,
          error: blockchainError.message,
          txId: null
        };
      }

      // ✅ FIX: Always save to PostgreSQL regardless of blockchain status
      // This ensures data is never lost even if blockchain is slow/down
      const { DatabaseService } = await import('../services/databaseService');
      const db = DatabaseService.getInstance();
      
      try {
        await db.run(
          `INSERT INTO contracts (
            contract_id, exporter_id, buyer_id, buyer_country, buyer_bank, exporter_bank,
            coffee_type, quantity, price_per_kg, currency, payment_method, eudr_required,
            status, blockchain_tx_id, blockchain_synced, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)`,
          [
            contractID,
            exporterID,
            buyerID,
            buyerCountry,
            buyerBank || '',
            exporterBank || '',
            coffeeType,
            quantity,
            pricePerKg,
            currency,
            paymentMethod || 'LC',
            eudrRequired,
            'pending', // Initial status
            result.txId || null,
            blockchainWriteSuccessful,
          ]
        );
        logger.info(`✅ Contract ${contractID} saved to PostgreSQL (blockchain: ${blockchainWriteSuccessful ? 'synced' : 'pending'})`);
        
        // ✅ OPTIMIZATION: Invalidate cache for this contract and related queries
        const { CacheInvalidation } = await import('../services/blockchainCacheService');
        CacheInvalidation.contract(contractID, exporterID);
        
      } catch (dbError: any) {
        logger.error(`❌ Failed to save contract ${contractID} to PostgreSQL: ${dbError.message}`);
        // This is a critical error - data must be in database
        return res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to save contract to database'
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (blockchainWriteSuccessful) {
        logger.info(`Sales contract registered successfully: ${contractID}, paymentMethod: ${paymentMethod || 'LC (default)'}, txId: ${result.txId}, documents: ${documentIDs.length}`);
        
        // Try to read back the contract immediately to verify
        setTimeout(async () => {
          const readResult = await fabricService.getSalesContract(contractID);
          logger.info(`Read-back verification for ${contractID}: success=${readResult.success}, data=${JSON.stringify(readResult.data)}`);
        }, 2000);
        
        res.status(201).json({
          success: true,
          data: { contractID, status: 'pending', blockchainSynced: true },
          txId: result.txId,
          documentsLinked: documentIDs.length,
          paymentMethod: paymentMethod || 'LC',
          timestamp: new Date().toISOString(),
        });
      } else {
        // ✅ FIX: Return 202 Accepted instead of 400
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
    // ⚡ PARALLEL FETCH: PostgreSQL (instant) + Blockchain (background sync)
    logger.info('⚡ Starting PARALLEL fetch: PostgreSQL + Blockchain...');
    
    const { DatabaseService } = await import('../services/databaseService');
    const db = DatabaseService.getInstance();
    
    // Start both queries in parallel
    const pgPromise = db.all(`
      SELECT 
        c.contract_id, c.exporter_id, c.buyer_id, c.buyer_country,
        c.buyer_bank, c.exporter_bank, c.coffee_type, c.quantity,
        c.price_per_kg, (c.quantity * c.price_per_kg) as total_value, c.currency,
        c.status as contract_status, c.eudr_required, c.created_at as registered_at, c.updated_at as approved_at,
        c.buyer_id as buyer_name
      FROM contracts c
      WHERE LOWER(c.status) IN ('approved', 'registered', 'pending')
      ORDER BY c.created_at DESC
    `).catch(err => {
      logger.error('PostgreSQL query error:', err);
      return [];
    });
    
    // Blockchain query in background (don't await)
    const blockchainPromise = fabricService.getAllContracts().catch(err => {
      logger.warn('⚠️ Blockchain query failed:', err.message);
      return { success: false, data: [] };
    });
    
    // Wait ONLY for PostgreSQL (instant), let blockchain finish in background
    const pgContracts = await pgPromise;
    
    logger.info(`✅ PostgreSQL returned ${pgContracts.length} contracts instantly`);
    
    // Map PostgreSQL data
    const result = {
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
        status: c.contract_status === 'pending' ? 'REGISTERED' : c.contract_status.toUpperCase(),
        contractStatus: c.contract_status === 'pending' ? 'REGISTERED' : c.contract_status.toUpperCase(),
        ContractStatus: c.contract_status === 'pending' ? 'REGISTERED' : c.contract_status.toUpperCase(),
        eudrRequired: c.eudr_required,
        registeredAt: c.registered_at,
        approvedAt: c.approved_at,
      }))
    };
    
    // Blockchain sync continues in background (fire and forget)
    blockchainPromise.then(blockchainResult => {
      if (blockchainResult.success) {
        logger.info(`🔗 Blockchain sync completed: ${blockchainResult.data?.length || 0} contracts`);
      }
    });
    
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
        const valid = isValidContract(c);
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
        'ApproveSalesContract',
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
      
      // Check if CONTRACT_SIGNED is actually signed by the exporter
      const contractSignedDoc = uploadedDocs.find(d => d.document_type === 'CONTRACT_SIGNED');
      if (contractSignedDoc && contractSignedDoc.verification_status !== 'signed' && contractSignedDoc.verification_status !== 'verified') {
        logger.warn(`Contract ${contractID} approval blocked: CONTRACT_SIGNED document not signed by exporter`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_SIGNED',
            message: 'The Sales Contract document must be signed by the exporter before ECTA approval.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`✅ Document verification passed for contract ${contractID}`);

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
      
      await fabricService.connectAsOrg('ECTAMSP');
      const result = await fabricService.approveSalesContract(contractID);

      if (result.success) {
        // Update status with cascading effects
        await statusManager.updateEntityStatus('CONTRACT', contractID, currentStatus, 'APPROVED');
        
        // ✅ SIGN CONTRACT DOCUMENTS - Add cryptographic signature with approver's identity
        // Process all documents in parallel for performance
        try {
          const { DatabaseService } = await import('../services/databaseService');
          const { DocumentSignatureService } = await import('../services/documentSignatureService');
          const db = DatabaseService.getInstance();
          
          // Get all CONTRACT_SIGNED documents for this contract
          const contractDocuments = await db.all(
            `SELECT document_id, file_path, file_hash, mime_type, file_name 
             FROM documents 
             WHERE UPPER(entity_type) = 'CONTRACT' 
               AND entity_id = $1 
               AND document_type = 'CONTRACT_SIGNED'
               AND status = 'active'`,
            [contractID]
          );
          
          if (contractDocuments.length > 0) {
            logger.info(`📝 Signing ${contractDocuments.length} contract document(s) with ${user.username}'s cryptographic identity...`);
            
            // ✅ PARALLEL PROCESSING: Sign all documents simultaneously for speed
            const signingPromises = contractDocuments.map(async (doc) => {
              try {
                const signatureId = `SIG-${doc.document_id}-${fabricService.getMspFromRole(user.role)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const timestamp = new Date().toISOString();
                
                // Resolve physical file path for visual signature
                const resolvedPath = resolveDocumentPath(doc.file_path, doc.file_name);
                const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
                let visualSignatureAdded = false;
                
                if (isPDF && resolvedPath) {
                  try {
                    // Get current signature count for positioning
                    const sigCountResult = await db.get(
                      'SELECT COUNT(*) as count FROM document_signatures WHERE document_id = $1',
                      [doc.document_id]
                    );
                    const positionIndex = parseInt(sigCountResult?.count || '0');

                    await DocumentSignatureService.addVisualSignatureToPDF(resolvedPath, {
                      signer: user.username || user.sub || 'ECTA Officer',
                      organization: fabricService.getMspFromRole(user.role),
                      timestamp,
                      signatureType: 'APPROVE',
                      role: user.role || 'ECTA',
                      transactionId: signatureId,
                      documentId: doc.document_id,
                      documentType: doc.document_type
                    }, positionIndex);
                    visualSignatureAdded = true;
                    logger.info(`✅ Visual signature added to: ${doc.document_id} at position ${positionIndex}`);
                  } catch (pdfError) {
                    logger.warn(`⚠️  Failed to add visual signature to ${doc.document_id}:`, pdfError);
                  }
                }
                
                // Store cryptographic signature in database
                await db.run(
                  `INSERT INTO document_signatures (
                    signature_id, document_id, signer_id, signer_org, signature_type,
                    certificate_id, remarks, blockchain_tx_id, visual_signature_added
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                  [
                    signatureId,
                    doc.document_id,
                    user.username || user.sub,
                    fabricService.getMspFromRole(user.role),
                    'APPROVE',
                    user.sub || null, // X.509 certificate ID
                    `Contract ${contractID} approved by ECTA for export compliance`,
                    result.txId || null,
                    visualSignatureAdded
                  ]
                );
                
                // Sign document on blockchain with X.509 certificate (optional - best effort)
                if (fabricService.isConnected()) {
                  try {
                    const blockchainSigResult = await fabricService.signDocument(
                      doc.document_id,
                      doc.file_hash,
                      'APPROVE',
                      `Contract ${contractID} approved for export`
                    );
                    
                    if (blockchainSigResult.success && blockchainSigResult.txId) {
                      await db.run(
                        'UPDATE document_signatures SET blockchain_tx_id = $1 WHERE signature_id = $2',
                        [blockchainSigResult.txId, signatureId]
                      );
                    }
                  } catch (blockchainSigError) {
                    logger.warn(`⚠️  Blockchain signature skipped for ${doc.document_id}`);
                  }
                }
                
                return { success: true, documentId: doc.document_id };
              } catch (docError) {
                logger.error(`❌ Failed to sign document ${doc.document_id}:`, docError);
                return { success: false, documentId: doc.document_id, error: docError };
              }
            });
            
            // Wait for all signatures to complete
            const results = await Promise.allSettled(signingPromises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            
            logger.info(`✅ Signed ${successCount}/${contractDocuments.length} contract documents with ${user.username}'s cryptographic identity`);
          }
        } catch (signError) {
          logger.error('Failed to sign contract documents:', signError);
          // Don't fail the contract approval if document signing fails
        }
        
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

      logger.info(`[${user.org}] ECTA rejecting contract: ${contractID}`, {
        userId: user?.sub,
        organization: user?.org,
        role: user?.role,
        reason,
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
      
      await fabricService.connectAsOrg('ECTAMSP');
      
      // Call RejectSalesContract chaincode function
      const result = await fabricService.invokeChaincode('RejectSalesContract', [
        contractID,
        rejectedBy || user?.username || 'ECTA Officer',
        reason,
      ]);

      if (result.success) {
        // Update status with cascading effects
        await statusManager.updateEntityStatus('CONTRACT', contractID, currentStatus, 'REJECTED');
        
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
              reason,
              JSON.stringify({
                contractId: contractID,
                rejectedBy: rejectedBy || user?.username,
                role: user?.role,
                organization: user?.org,
                transactionId: result.txId,
                rejectionReason: reason,
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
        
        logger.info(`[${user?.org}] ✅ Sales contract rejected by ECTA: ${contractID}, Reason: ${reason}`);
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
            code: 'REJECTION_FAILED',
            message: result.error || 'Failed to reject contract',
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