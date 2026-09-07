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

      // ✅ FIX: Authorization check - only exporter can create their own contracts
      const user = (req as any).user;
      if (user.exporterId !== exporterID && user.username !== exporterID) {
        logger.warn(`Unauthorized contract creation attempt: ${user.exporterId || user.username} tried to create contract for ${exporterID}`);
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
      if (paymentMethod) {
        result = await fabricService.invokeChaincode('RegisterSalesContractWithPaymentMethod', [
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

      if (result.success) {
        logger.info(`Sales contract registered successfully: ${contractID}, paymentMethod: ${paymentMethod || 'LC (default)'}, txId: ${result.txId}, documents: ${documentIDs.length}`);
        
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
          paymentMethod: paymentMethod || 'LC',
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
      const normalizedContracts = contracts.map((contract: any) => ({
        contractId: contract?.contractId || contract?.ContractID || contract?.id || '',
        exporterId: contract?.exporterId || contract?.ExporterID || contract?.exporterID || '',
        buyerId: contract?.buyerId || contract?.BuyerID || contract?.buyerID || '',
        buyerName: contract?.buyerName || contract?.BuyerName || '',
        buyerCountry: contract?.buyerCountry || contract?.BuyerCountry || '',
        buyerBank: contract?.buyerBank || contract?.BuyerBank || '',
        exporterBank: contract?.exporterBank || contract?.ExporterBank || '',
        coffeeType: contract?.coffeeType || contract?.CoffeeType || '', // ✅ FIX: Add coffeeType mapping
        amount: contract?.amount ?? contract?.Amount ?? 0,
        currency: contract?.currency || contract?.Currency || 'USD',
        pricePerKg: contract?.pricePerKg ?? contract?.PricePerKg ?? 0,
        quantity: contract?.quantity ?? contract?.Quantity ?? 0,
        totalValue: contract?.totalValue ?? contract?.TotalValue ?? 0,
        paymentMethod: contract?.paymentMethod || contract?.PaymentMethod || 'LC',
        status: contract?.status || contract?.contractStatus || contract?.ContractStatus || 'PENDING',
        contractStatus: contract?.contractStatus || contract?.status || contract?.ContractStatus || 'REGISTERED', // Keep original field
        eudrRequired: contract?.eudrRequired ?? contract?.EUDRRequired ?? false,
        registrationDate: contract?.registrationDate || contract?.registeredAt || contract?.createdAt || null,
        approvalDate: contract?.approvalDate || contract?.approvedAt || null,
        terms: contract?.terms || contract?.Terms || '',
      }));

      // Debug: Log first normalized contract to see structure
      if (normalizedContracts.length > 0) {
        logger.info(`First normalized contract: ${JSON.stringify(normalizedContracts[0])}`);
      }
      
      // Filter valid contracts
      const invalidContracts = normalizedContracts.filter((c: any) => !isValidContract(c));
      if (invalidContracts.length > 0) {
        logger.warn(`⚠️  Filtered out ${invalidContracts.length} invalid contracts`);
        invalidContracts.forEach((c: any) => {
          const validations = {
            contractId: !!c.contractId && typeof c.contractId === 'string' && c.contractId.trim().length > 0,
            exporterId: !!c.exporterId && typeof c.exporterId === 'string' && c.exporterId.trim().length > 0,
            buyerId: !!c.buyerId && typeof c.buyerId === 'string' && c.buyerId.trim().length > 0,
            buyerCountry: !!c.buyerCountry && typeof c.buyerCountry === 'string' && c.buyerCountry.trim().length > 0,
            coffeeType: !!c.coffeeType && typeof c.coffeeType === 'string' && c.coffeeType.trim().length > 0,
            quantity: typeof c.quantity === 'number' && !Number.isNaN(c.quantity) && c.quantity > 0,
            pricePerKg: typeof c.pricePerKg === 'number' && !Number.isNaN(c.pricePerKg) && c.pricePerKg > 0,
            currency: !!c.currency && typeof c.currency === 'string' && c.currency.trim().length > 0,
          };
          const failedFields = Object.entries(validations).filter(([k, v]) => !v).map(([k]) => k);
          logger.warn(`  Invalid contract ${c.contractId}: FAILED fields: ${failedFields.join(', ')}`);
        });
      }
      
      const validContracts = dedupeById(normalizedContracts.filter(isValidContract), (contract: any) => contract.contractId);
      logger.info(`✅ Valid contracts after filtering: ${validContracts.length}/${normalizedContracts.length}`);
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
          entity_type, 
          entity_id, 
          file_name, 
          file_size, 
          mime_type, 
          uploaded_by, 
          uploaded_at,
          verification_status,
          status,
          metadata
         FROM documents 
         WHERE UPPER(entity_type) = 'CONTRACT' AND entity_id = $1 AND status != 'deleted'
         ORDER BY uploaded_at DESC`,
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

      // ✅ DOCUMENT VERIFICATION: Check required documents before approval
      try {
        const { DatabaseService } = await import('../services/databaseService');
        const { checkRequiredDocuments } = await import('../utils/documentValidation');
        
        const db = DatabaseService.getInstance();
        const documents = await db.all(
          `SELECT document_type, verification_status FROM documents 
           WHERE UPPER(entity_type) = 'CONTRACT' AND entity_id = $1 AND status = 'active'`,
          [contractID]
        );
        
        const docTypes = documents.map((d: any) => d.document_type);
        const requirementCheck = checkRequiredDocuments('contract', docTypes);
        
        if (!requirementCheck.valid) {
          logger.warn(`Contract ${contractID} approval blocked: Missing required documents`, requirementCheck.errors);
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_DOCUMENTS',
              message: 'Cannot approve contract: Required documents are missing',
              missing: requirementCheck.errors,
              hint: 'Upload CONTRACT_SIGNED document before approval'
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        // Check if CONTRACT_SIGNED is verified
        const contractDoc = documents.find((d: any) => d.document_type === 'CONTRACT_SIGNED');
        if (contractDoc && contractDoc.verification_status !== 'verified') {
          logger.warn(`Contract ${contractID} approval blocked: CONTRACT_SIGNED not verified`);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UNVERIFIED_DOCUMENT',
              message: 'Cannot approve contract: Signed contract document must be verified first',
              documentStatus: contractDoc.verification_status
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        logger.info(`✅ Contract ${contractID}: Document requirements satisfied for approval`);
      } catch (docCheckError) {
        logger.warn(`Non-fatal: Document check failed for contract ${contractID}:`, docCheckError);
        // Continue with approval - document check is best-effort
      }

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
                const signatureId = `SIG-${doc.document_id}-${user.org || 'ECTA'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const timestamp = new Date().toISOString();
                
                // Add visual signature stamp to PDF (if applicable)
                const isPDF = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
                let visualSignatureAdded = false;
                
                if (isPDF && doc.file_path && require('fs').existsSync(doc.file_path)) {
                  try {
                    await DocumentSignatureService.addVisualSignatureToPDF(doc.file_path, {
                      signer: user.username || user.sub || 'ECTA Officer',
                      organization: user.org || 'ECTAMSP',
                      timestamp,
                      signatureType: 'APPROVE',
                      role: user.role || 'ECTA',
                      transactionId: signatureId,
                    });
                    visualSignatureAdded = true;
                    logger.info(`✅ Visual signature added to: ${doc.document_id}`);
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
                    user.org || 'ECTAMSP',
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