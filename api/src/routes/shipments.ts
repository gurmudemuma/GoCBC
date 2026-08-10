// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipments API Routes

import express, { Request, Response } from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { dedupeById, isValidShipment } from '../utils/dataFilters';
import { statusManager } from '../utils/statusManager';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

/**
 * @swagger
 * /api/v1/shipments:
 *   post:
 *     summary: Create a new coffee shipment
 *     tags: [Shipments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentID
 *               - exporterID
 *               - buyerID
 *               - origin
 *               - quantity
 *               - grade
 *               - icoNumber
 *               - channel
 *               - forexRate
 *               - valueUSD
 *               - eudrCompliant
 *             properties:
 *               shipmentID:
 *                 type: string
 *               exporterID:
 *                 type: string
 *               buyerID:
 *                 type: string
 *               origin:
 *                 type: string
 *               quantity:
 *                 type: number
 *               grade:
 *                 type: string
 *               icoNumber:
 *                 type: string
 *               ecxLotNumber:
 *                 type: string
 *                 description: 'Required only when channel is ECX'
 *               bondReference:
 *                 type: string
 *                 description: 'Required only when channel is Direct Export'
 *               unionApprovalReference:
 *                 type: string
 *                 description: 'Required only when channel is Union/Cooperative'
 *               channel:
 *                 type: string
 *               forexRate:
 *                 type: number
 *               valueUSD:
 *                 type: number
 *               eudrCompliant:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Shipment created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/',
  [
    body('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('contractID').notEmpty().withMessage('Contract ID is required'),
    body('exporterID').notEmpty().withMessage('Exporter ID is required'),
    body('buyerID').notEmpty().withMessage('Buyer ID is required'),
    body('origin').notEmpty().withMessage('Origin is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
    body('grade').notEmpty().withMessage('Grade is required'),
    body('icoNumber').notEmpty().withMessage('ICO number is required'),
    body('channel').notEmpty().withMessage('Channel is required'),
    body('ecxLotNumber')
      .if(body('channel').equals('ECX'))
      .notEmpty().withMessage('ECX lot number is required when channel is ECX'),
    body('unionApprovalReference')
      .if(body('channel').equals('Union'))
      .notEmpty().withMessage('Union approval reference is required when channel is Union/Cooperative'),
    body('bondReference')
      .if(body('channel').equals('Direct Export'))
      .notEmpty().withMessage('Bond reference is required when channel is Direct Export'),
    body('forexRate').isNumeric().withMessage('Forex rate must be a number'),
    body('valueUSD').isNumeric().withMessage('Value USD must be a number'),
    body('eudrCompliant').isBoolean().withMessage('EUDR compliant must be a boolean'),
    body('documents').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        shipmentID,
        contractID,
        exporterID,
        buyerID,
        origin,
        quantity,
        grade,
        icoNumber,
        ecxLotNumber,
        channel,
        forexRate,
        valueUSD,
        eudrCompliant,
        documents,
      } = req.body;

      // DUPLICATE PREVENTION: Check if shipment already exists for this contract
      try {
        logger.info(`[SHIPMENT] Checking for existing shipments on contract ${contractID}...`);
        const existingShipmentsResult = await fabricService.queryChaincode('QueryShipmentsByContract', [contractID]);
        
        if (existingShipmentsResult.success) {
          if (existingShipmentsResult.data && Array.isArray(existingShipmentsResult.data) && existingShipmentsResult.data.length > 0) {
            const existingShipments = existingShipmentsResult.data;
            logger.warn(`[SHIPMENT] Duplicate prevention: Shipment already exists for contract ${contractID}`);
            return res.status(400).json({
              success: false,
              error: {
                code: 'DUPLICATE_SHIPMENT',
                message: `A shipment already exists for contract ${contractID}`,
                existingShipmentId: existingShipments[0].ShipmentID || existingShipments[0].shipmentID,
              },
              timestamp: new Date().toISOString(),
            });
          } else {
            logger.info(`[SHIPMENT] No existing shipments found for contract ${contractID}`);
          }
        } else {
          logger.error(`[SHIPMENT] Failed to query existing shipments: ${existingShipmentsResult.error}`);
          // Continue with shipment creation - duplicate check is best-effort
        }
      } catch (dupCheckError) {
        logger.error('[SHIPMENT] Error during duplicate check:', dupCheckError);
        // Continue with shipment creation - duplicate check is best-effort
      }

      // AUTO-MAPPING: Fetch contract data to auto-populate fields
      let autoMappedData: any = {};
      try {
        const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractID]);
        if (contractResult.success && contractResult.data) {
          const contract = contractResult.data;
          autoMappedData.exporterID = contract.ExporterID || contract.exporterID || exporterID;
          autoMappedData.buyerID = contract.BuyerID || contract.buyerID || buyerID;
          autoMappedData.quantity = contract.Quantity || contract.quantity || quantity;
          autoMappedData.grade = contract.CoffeeType || contract.coffeeType || grade;
          
          // Calculate valueUSD from contract price if not provided
          const pricePerKg = parseFloat(contract.PricePerKg || contract.pricePerKg || '0');
          const qty = parseFloat(autoMappedData.quantity || quantity || '0');
          autoMappedData.calculatedValueUSD = (pricePerKg * qty).toFixed(2);
          
          logger.info(`[SHIPMENT] Auto-mapped from contract: exporterID=${autoMappedData.exporterID}, quantity=${autoMappedData.quantity}, valueUSD=${autoMappedData.calculatedValueUSD}`);
        }
      } catch (error) {
        logger.warn('[SHIPMENT] Could not fetch contract for auto-mapping:', error);
      }

      // Use provided values or auto-mapped values
      const finalExporterID = exporterID || autoMappedData.exporterID || '';
      const finalBuyerID = buyerID || autoMappedData.buyerID || '';
      const finalQuantity = quantity || autoMappedData.quantity || 0;
      const finalGrade = grade || autoMappedData.grade || '';
      const finalValueUSD = valueUSD || autoMappedData.calculatedValueUSD || 0;

      // MANDATORY FIELD VALIDATION: Ensure all required fields are filled after auto-mapping
      const validationErrors: string[] = [];
      
      if (!finalExporterID || finalExporterID.trim() === '') {
        validationErrors.push('Exporter ID is required and cannot be empty');
      }
      if (!finalBuyerID || finalBuyerID.trim() === '') {
        validationErrors.push('Buyer ID is required and cannot be empty');
      }
      if (!origin || origin.trim() === '') {
        validationErrors.push('Origin is required and cannot be empty');
      }
      if (!finalQuantity || finalQuantity <= 0) {
        validationErrors.push('Quantity must be greater than 0');
      }
      if (!finalGrade || finalGrade.trim() === '') {
        validationErrors.push('Grade is required and cannot be empty. Please specify the coffee grade (e.g., Grade 1, Grade 2, etc.)');
      }
      if (!icoNumber || icoNumber.trim() === '') {
        validationErrors.push('ICO Number is required and cannot be empty');
      }
      if (!finalValueUSD || finalValueUSD <= 0) {
        validationErrors.push('Value USD must be greater than 0');
      }
      
      // If there are validation errors, return them to the user
      if (validationErrors.length > 0) {
        logger.warn(`[SHIPMENT] Validation failed for shipment ${shipmentID}:`, validationErrors);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Shipment creation failed: Required fields are missing or empty',
            details: validationErrors,
            hint: 'All required fields must be filled. Auto-mapping from contract could not populate missing fields.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ DOCUMENT VERIFICATION: Check quality documents before shipment creation
      try {
        const { DatabaseService } = await import('../services/databaseService');
        
        const db = DatabaseService.getInstance();
        const documents = await db.all(
          `SELECT document_type, verification_status FROM documents 
           WHERE entity_type = 'shipment' AND entity_id = ? AND status = 'active'`,
          [shipmentID]
        );
        
        // Required quality documents for shipment
        const requiredDocs = ['QUALITY_CERTIFICATE', 'CUPPING_REPORT'];
        const docTypes = documents.map((d: any) => d.document_type);
        const missing = requiredDocs.filter(type => !docTypes.includes(type));
        
        if (missing.length > 0) {
          logger.warn(`Shipment ${shipmentID} creation: Missing ${missing.length} quality documents (non-blocking)`);
          // Note: This is informational only - we don't block shipment creation
          // Quality documents can be uploaded after shipment creation
        } else {
          logger.info(`✅ Shipment ${shipmentID}: Quality documents already uploaded`);
        }
      } catch (docCheckError) {
        logger.warn(`Non-fatal: Document check failed for shipment ${shipmentID}:`, docCheckError);
        // Continue with shipment creation - document check is best-effort
      }

      // Extract document IDs for blockchain storage
      let documentIDs: string[] = [];
      if (documents && Array.isArray(documents)) {
        documentIDs = documents.map((doc: any) => doc.documentId || doc.id).filter(Boolean);
        logger.info(`Shipment ${shipmentID}: Linking ${documentIDs.length} documents to blockchain`);
      }

      const result = await fabricService.createShipment(
        shipmentID,
        contractID,
        finalExporterID,
        finalBuyerID,
        origin,
        finalQuantity.toString(),
        finalGrade,
        icoNumber,
        ecxLotNumber || '', // Default to empty string if not provided
        channel,
        forexRate.toString(),
        finalValueUSD.toString(),
        eudrCompliant.toString(),
        JSON.stringify(documentIDs)
      );

      if (result.success) {
        logger.info(`✅ Shipment created successfully: ${shipmentID} with auto-mapped data and ${documentIDs.length} documents`);
        
        // Link shipment to LC if contract has one
        try {
          const lcResult = await fabricService.queryChaincode('QueryLCsByContract', [contractID]);
          if (lcResult.success && lcResult.data && Array.isArray(lcResult.data) && lcResult.data.length > 0) {
            // DEBUG: Log all LCs found for this contract
            logger.info(`[DEBUG] Found ${lcResult.data.length} LC(s) for contract ${contractID}`);
            
            // Filter for valid LCs (must have LC ID, status, and amount > 0)
            const validLCs = lcResult.data.filter((lc: any) => {
              const lcId = lc.lcId || lc.LCID || lc.lcID;
              const hasValidId = lcId && lcId.trim() !== '';
              const hasValidStatus = lc.status && lc.status.trim() !== '';
              const hasValidAmount = lc.amount && lc.amount > 0;
              return hasValidId && hasValidStatus && hasValidAmount;
            });
            
            logger.info(`[DEBUG] Found ${validLCs.length} valid LC(s) after filtering`);
            
            if (validLCs.length === 0) {
              logger.warn(`[SHIPMENT] No valid LCs found for contract ${contractID} - shipment created without LC link`);
            } else {
              // Use the most recent valid LC (highest status priority: ISSUED > APPROVED > REQUESTED)
              const statusPriority: {[key: string]: number} = {
                'ISSUED': 3,
                'FOREX_ALLOCATED': 2,
                'APPROVED': 1,
                'REQUESTED': 0
              };
              
              const lc = validLCs.sort((a: any, b: any) => {
                const priorityA = statusPriority[a.status] || 0;
                const priorityB = statusPriority[b.status] || 0;
                return priorityB - priorityA; // Descending order
              })[0];
              
              const lcID = lc.lcId || lc.LCID || lc.lcID;
              
              logger.info(`[DEBUG] Selected LC ${lcID} with status ${lc.status} for shipment linking`);
              
              // Update LC status to SHIPPED
              const linkResult = await fabricService.invokeChaincode('LinkShipmentToLC', [lcID, shipmentID]);
              if (linkResult.success) {
                logger.info(`✅ LC ${lcID} linked to shipment ${shipmentID}, status updated to SHIPPED`);
              } else {
                logger.warn(`⚠️ Failed to link LC to shipment: ${linkResult.error}`);
              }
            }
          } else {
            logger.info(`[SHIPMENT] No LC found for contract ${contractID} - shipment created without LC link`);
          }
        } catch (lcError) {
          logger.warn('[SHIPMENT] Could not link to LC:', lcError);
          // Non-fatal - shipment created successfully
        }
        
        res.status(201).json({
          success: true,
          data: result.data,
          autoMapped: {
            exporterID: finalExporterID,
            buyerID: finalBuyerID,
            quantity: finalQuantity,
            grade: finalGrade,
            valueUSD: finalValueUSD,
          },
          documentsLinked: documentIDs.length,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: result.error || 'Failed to create shipment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error creating shipment:', error);
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
 * /api/v1/shipments:
 *   get:
 *     summary: Get all shipments
 *     tags: [Shipments]
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
 *         description: Filter by shipment status
 *       - in: query
 *         name: eudrCompliant
 *         schema:
 *           type: boolean
 *         description: Filter EUDR-compliant shipments
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: List of shipments retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const { exporterID, eudrCompliant } = req.query;
    let result;

    if (exporterID) {
      result = await fabricService.getShipmentsByExporter(exporterID as string);
    } else if (eudrCompliant === 'true') {
      result = await fabricService.getEUDRCompliantShipments();
    } else {
      result = await fabricService.getAllShipments();
    }

    if (result.success) {
      const shipments = result.data || [];
      
      // DEBUG: Log first shipment to see what blockchain returns
      if (shipments.length > 0) {
        logger.info(`[SHIPMENTS] Total shipments: ${shipments.length}`);
        logger.info('[SHIPMENTS] First shipment type:', typeof shipments[0]);
        logger.info('[SHIPMENTS] First shipment isArray:', Array.isArray(shipments[0]));
        logger.info('[SHIPMENTS] First shipment from blockchain:', JSON.stringify(shipments[0], null, 2));
        logger.info('[SHIPMENTS] First shipment keys:', Object.keys(shipments[0]));
        logger.info('[SHIPMENTS] First shipment values sample:', {
          quantity: shipments[0].quantity,
          grade: shipments[0].grade,
          shipmentId: shipments[0].shipmentId
        });
      }
      
      const normalizedShipments = shipments.map((shipment: any) => ({
        shipmentId: shipment?.shipmentId || shipment?.ShipmentID || shipment?.id || '',
        contractId: shipment?.contractId || shipment?.ContractID || shipment?.contractID || '',
        exporterId: shipment?.exporterId || shipment?.ExporterID || shipment?.exporterID || '',
        buyerId: shipment?.buyerId || shipment?.BuyerID || shipment?.buyerID || '',
        buyerName: shipment?.buyerName || shipment?.BuyerName || '',
        origin: shipment?.origin || shipment?.Origin || '',
        destination: shipment?.destination || shipment?.Destination || '',
        quantity: shipment?.quantity ?? shipment?.Quantity ?? 0,
        grade: shipment?.grade || shipment?.Grade || '',
        icoNumber: shipment?.icoNumber || shipment?.ICONumber || shipment?.icoNumber || '',
        status: shipment?.status || shipment?.Status || 'CREATED',
        createdAt: shipment?.createdAt || shipment?.created_at || shipment?.createdAt || null,
        updatedAt: shipment?.updatedAt || shipment?.updated_at || shipment?.updatedAt || null,
        eudrCompliant: shipment?.eudrCompliant ?? shipment?.EUDRCompliant ?? false,
        ecxLots: Array.isArray(shipment?.ecxLots) ? shipment.ecxLots : [],
        documents: Array.isArray(shipment?.documents) ? shipment.documents : [],
      }));

      const validShipments = dedupeById(normalizedShipments.filter(isValidShipment), (shipment: any) => shipment.shipmentId);
      const { status, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

      // Apply additional filters
      let filteredShipments = validShipments;
      if (status) {
        filteredShipments = filteredShipments.filter((shipment: any) => shipment.status === status);
      }
      if (dateFrom || dateTo) {
        filteredShipments = filteredShipments.filter((shipment: any) => {
          const shipmentDate = new Date(shipment.createdAt);
          if (dateFrom && shipmentDate < new Date(dateFrom as string)) return false;
          if (dateTo && shipmentDate > new Date(dateTo as string)) return false;
          return true;
        });
      }

      // Apply pagination
      const paginatedShipments = filteredShipments.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: paginatedShipments,
        pagination: {
          total: filteredShipments.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredShipments.length,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: result.error || 'Failed to retrieve shipments',
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error retrieving shipments:', error);
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
 * /api/v1/shipments/{shipmentID}/documents:
 *   get:
 *     summary: Get all documents for a shipment
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 */
router.get('/:shipmentID/documents',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { DatabaseService } = await import('../services/databaseService');
      const { checkRequiredDocuments, DOCUMENT_TYPES } = await import('../utils/documentValidation');
      
      const db = DatabaseService.getInstance();
      
      // Get all documents for this shipment
      const documents = await db.all(
        `SELECT * FROM documents 
         WHERE entity_type = 'shipment' AND entity_id = ? AND status != 'deleted'
         ORDER BY uploaded_at DESC`,
        [shipmentID]
      );
      
      // Parse metadata
      documents.forEach((doc: any) => {
        try {
          doc.metadata = JSON.parse(doc.metadata || '{}');
        } catch {
          doc.metadata = {};
        }
      });
      
      // Check requirements
      const docTypes = documents
        .filter((d: any) => d.status === 'active')
        .map((d: any) => d.document_type);
      const requirementCheck = checkRequiredDocuments('shipment', docTypes);
      
      // Get requirement details for shipment
      const shipmentRequirements = ['QUALITY_CERTIFICATE', 'CUPPING_REPORT', 'EXPORT_PERMIT', 
                                     'PHYTOSANITARY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN'];
      const requirements = shipmentRequirements
        .filter(type => type in DOCUMENT_TYPES)
        .map(type => ({
          type,
          name: (DOCUMENT_TYPES as any)[type].name,
          required: (DOCUMENT_TYPES as any)[type].required,
          uploaded: docTypes.includes(type)
        }));
      
      res.json({
        success: true,
        data: {
          documents,
          count: documents.length,
          requirements: {
            allRequired: requirementCheck.valid,
            missing: requirementCheck.errors,
            details: requirements
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching shipment documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/shipments/{shipmentID}:
 *   get:
 *     summary: Get shipment details by ID
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     responses:
 *       200:
 *         description: Shipment details retrieved successfully
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:shipmentID',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const result = await fabricService.getShipment(shipmentID);

      if (result.success) {
        // FIX: Handle null ecxLots from blockchain (convert to empty array)
        if (result.data) {
          if (result.data.ecxLots === null || result.data.ecxLots === undefined) {
            result.data.ecxLots = [];
          }
          if (result.data.documents === null || result.data.documents === undefined) {
            result.data.documents = [];
          }
        }
        
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
            message: result.error || 'Shipment not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving shipment:', error);
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
 * /api/v1/shipments/{shipmentID}/status:
 *   put:
 *     summary: Update shipment status
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CREATED, QUALITY_CONTROL, CUSTOMS_CLEARANCE, SHIPPED, DELIVERED]
 *     responses:
 *       200:
 *         description: Shipment status updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:shipmentID/status',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('status').notEmpty().withMessage('Status is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { status } = req.body;

      // Get current shipment status for validation
      const shipmentData = await fabricService.getShipment(shipmentID);
      if (!shipmentData.success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Shipment not found' },
          timestamp: new Date().toISOString(),
        });
      }
      
      const currentStatus = shipmentData.data?.status || shipmentData.data?.Status || 'CREATED';
      
      // Validate status transition
      const isValid = statusManager.validateTransition('SHIPMENT', currentStatus, status);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot update shipment: Invalid status transition from ${currentStatus} to ${status}`,
            allowedStatuses: statusManager.getNextStatuses('SHIPMENT', currentStatus),
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fabricService.updateShipmentStatus(shipmentID, status);

      if (result.success) {
        // Update status with cascading effects
        await statusManager.updateEntityStatus('SHIPMENT', shipmentID, currentStatus, status);
        
        logger.info(`Shipment status updated successfully: ${shipmentID} - ${currentStatus} → ${status}`);
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
            code: 'UPDATE_FAILED',
            message: result.error || 'Failed to update shipment status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating shipment status:', error);
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
 * /api/v1/shipments/{shipmentID}/history:
 *   get:
 *     summary: Get shipment transaction history
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     responses:
 *       200:
 *         description: Shipment history retrieved successfully
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:shipmentID/history',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const result = await fabricService.getShipmentHistory(shipmentID);

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
            message: result.error || 'Shipment history not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving shipment history:', error);
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
 * /api/v1/shipments/{shipmentID}/traceability:
 *   get:
 *     summary: Get complete traceability data for a shipment
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     responses:
 *       200:
 *         description: Complete traceability data retrieved successfully
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:shipmentID/traceability',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const result = await fabricService.getCompleteTraceability(shipmentID);

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
            message: result.error || 'Traceability data not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error retrieving traceability data:', error);
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

// ==================== SHIPPING & LOGISTICS ROUTES ====================

/**
 * @swagger
 * /api/v1/shipments/{shipmentID}/bill-of-lading:
 *   post:
 *     summary: Record Bill of Lading for a shipment
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - billOfLadingNo
 *               - vesselName
 *               - departurePort
 *               - destinationPort
 *               - estimatedArrival
 *             properties:
 *               billOfLadingNo:
 *                 type: string
 *               vesselName:
 *                 type: string
 *               departurePort:
 *                 type: string
 *               destinationPort:
 *                 type: string
 *               estimatedArrival:
 *                 type: string
 *                 format: date
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bill of Lading recorded successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.post('/:shipmentID/bill-of-lading',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('billOfLadingNo').notEmpty().withMessage('B/L number is required'),
    body('vesselName').notEmpty().withMessage('Vessel name is required'),
    body('departurePort').notEmpty().withMessage('Departure port is required'),
    body('destinationPort').notEmpty().withMessage('Destination port is required'),
    body('estimatedArrival').notEmpty().withMessage('Estimated arrival is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const {
        billOfLadingNo,
        vesselName,
        departurePort,
        destinationPort,
        estimatedArrival,
        trackingNumber
      } = req.body;

      logger.info(`[SHIPPING] Recording B/L for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('RecordBillOfLading', [
        shipmentID,
        billOfLadingNo,
        vesselName,
        departurePort,
        destinationPort,
        estimatedArrival,
        trackingNumber || ''
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] B/L recorded successfully: ${billOfLadingNo}`);
        res.json({
          success: true,
          message: 'Bill of Lading recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record B/L: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'RECORDING_FAILED',
            message: result.error || 'Failed to record Bill of Lading',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording Bill of Lading:', error);
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
 * /api/v1/shipments/{shipmentID}/shipping-status:
 *   put:
 *     summary: Update shipping status and location
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED]
 *     responses:
 *       200:
 *         description: Shipping status updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:shipmentID/shipping-status',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('status').notEmpty().withMessage('Status is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { location, status } = req.body;

      logger.info(`[SHIPPING] Updating shipping status: ${shipmentID} -> ${status}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('UpdateShipmentLocation', [
        shipmentID,
        location || '',
        status
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Shipping status updated: ${shipmentID} -> ${status}`);
        res.json({
          success: true,
          message: 'Shipping status updated successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to update shipping status: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: result.error || 'Failed to update shipping status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error updating shipping status:', error);
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
 * /api/v1/shipments/{shipmentID}/pickup:
 *   post:
 *     summary: Mark shipment as picked up (CUSTOMS_CLEARED -> IN_TRANSIT)
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupLocation
 *               - pickupBy
 *             properties:
 *               pickupLocation:
 *                 type: string
 *               pickupBy:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *               driverName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment marked as picked up
 *       400:
 *         description: Invalid input data or shipment not ready for pickup
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/shipments/:shipmentID/book-freight:
 *   post:
 *     summary: Book freight for customs-cleared shipment
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - freightForwarder
 *               - transportMode
 *               - estimatedDepartureDate
 *             properties:
 *               freightForwarder:
 *                 type: string
 *               transportMode:
 *                 type: string
 *                 enum: [SEA, AIR]
 *               vesselName:
 *                 type: string
 *               containerNumber:
 *                 type: string
 *               estimatedDepartureDate:
 *                 type: string
 *                 format: date
 *               estimatedArrivalDate:
 *                 type: string
 *                 format: date
 *               portOfLoading:
 *                 type: string
 *               portOfDischarge:
 *                 type: string
 *     responses:
 *       200:
 *         description: Freight booked successfully
 *       400:
 *         description: Shipment not customs cleared or invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/:shipmentID/book-freight',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('freightForwarder').notEmpty().withMessage('Freight forwarder is required'),
    body('transportMode').notEmpty().isIn(['SEA', 'AIR']).withMessage('Transport mode must be SEA or AIR'),
    body('estimatedDepartureDate').notEmpty().withMessage('Estimated departure date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const {
        freightForwarder,
        transportMode,
        vesselName,
        containerNumber,
        estimatedDepartureDate,
        estimatedArrivalDate,
        portOfLoading,
        portOfDischarge,
      } = req.body;

      logger.info(`[SHIPPING] Booking freight for shipment: ${shipmentID}`);

      // Verify shipment is customs cleared
      await fabricService.connectAsOrg('ShippingMSP');
      const shipmentResult = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
      
      if (!shipmentResult.success || !shipmentResult.data) {
        return res.status(404).json({
          success: false,
          error: { message: 'Shipment not found' }
        });
      }

      const shipment = shipmentResult.data;
      const currentStatus = shipment.Status || shipment.status;
      
      if (currentStatus !== 'CUSTOMS_CLEARED') {
        return res.status(400).json({
          success: false,
          error: { 
            message: `Shipment must be customs cleared before booking freight. Current status: ${currentStatus}` 
          }
        });
      }

      // Update shipment with freight booking details
      const freightData = {
        freightForwarder,
        transportMode,
        vesselName: vesselName || '',
        containerNumber: containerNumber || '',
        estimatedDepartureDate,
        estimatedArrivalDate: estimatedArrivalDate || '',
        portOfLoading: portOfLoading || 'Djibouti Port',
        portOfDischarge: portOfDischarge || '',
        bookingDate: new Date().toISOString(),
        bookingStatus: 'CONFIRMED'
      };

      // Store freight booking (you may need to add this chaincode function)
      // For now, update shipment status to FREIGHT_BOOKED
      const statusUpdate = await fabricService.updateShipmentStatus(shipmentID, 'FREIGHT_BOOKED');
      
      if (statusUpdate.success) {
        logger.info(`✅ [SHIPPING] Freight booked for ${shipmentID} via ${freightForwarder}`);
        
        res.json({
          success: true,
          message: 'Freight booked successfully',
          shipmentID,
          freightData,
          nextStep: {
            action: 'GENERATE_BILL_OF_LADING',
            description: 'Generate bill of lading with freight booking details',
            endpoint: `/api/v1/shipments/${shipmentID}/bill-of-lading`
          },
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Failed to update shipment status');
      }
    } catch (error: any) {
      logger.error(`[SHIPPING] Error booking freight:`, error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }
);

router.post('/:shipmentID/pickup',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('pickupBy').notEmpty().withMessage('Pickup by (shipping company) is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { pickupBy, pickupLocation, vehicleNumber, driverName } = req.body;

      logger.info(`[SHIPPING] Recording pickup for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      // Generate tracking number if not provided
      const trackingNumber = `TRK-${Date.now()}`;
      
      // Determine transport mode from shipment data
      const shipmentResult = await fabricService.getShipment(shipmentID);
      let transportMode = 'SEA'; // Default
      if (shipmentResult.success && shipmentResult.data) {
        transportMode = shipmentResult.data.transportMode || shipmentResult.data.TransportMode || 'SEA';
      }

      // Call blockchain with correct parameters: shipmentID, shippingCompany, transportMode, trackingNumber
      const result = await fabricService.invokeChaincode('PickupShipment', [
        shipmentID,
        pickupBy, // shippingCompany
        transportMode,
        trackingNumber
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Shipment picked up: ${shipmentID} by ${pickupBy}`);
        res.json({
          success: true,
          message: 'Shipment marked as picked up',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record pickup: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'PICKUP_FAILED',
            message: result.error || 'Failed to record pickup',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording pickup:', error);
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
 * /api/v1/shipments/{shipmentID}/delivery:
 *   post:
 *     summary: Confirm shipment delivery (IN_TRANSIT -> DELIVERED)
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryLocation
 *               - deliveredTo
 *             properties:
 *               deliveryLocation:
 *                 type: string
 *               deliveredTo:
 *                 type: string
 *               receivedBy:
 *                 type: string
 *               receiverSignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment delivery confirmed
 *       400:
 *         description: Invalid input data or shipment not in transit
 *       500:
 *         description: Internal server error
 */
router.post('/:shipmentID/delivery',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { deliveryLocation, deliveredTo, receivedBy, receiverSignature } = req.body;

      logger.info(`[SHIPPING] Confirming delivery for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      // Blockchain ConfirmDelivery only needs: shipmentID, deliveryNotes
      const deliveryNotes = `Delivered to ${deliveredTo || 'buyer'} at ${deliveryLocation || 'destination'}`;

      const result = await fabricService.invokeChaincode('ConfirmDelivery', [
        shipmentID,
        deliveryNotes
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Shipment delivered: ${shipmentID} to ${deliveredTo || 'buyer'}`);
        res.json({
          success: true,
          message: 'Shipment delivery confirmed',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to confirm delivery: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'DELIVERY_FAILED',
            message: result.error || 'Failed to confirm delivery',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error confirming delivery:', error);
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
 * /api/v1/shipments/{shipmentID}/lc-documents:
 *   post:
 *     summary: Submit LC documents after shipment (updates LC to DOCUMENTS_SUBMITTED)
 *     tags: [Shipments, LC]
 *     parameters:
 *       - in: path
 *         name: shipmentID
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lcID
 *               - documentIDs
 *             properties:
 *               lcID:
 *                 type: string
 *               documentIDs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: LC documents submitted successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/:shipmentID/lc-documents',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('lcID').notEmpty().withMessage('LC ID is required'),
    body('documentIDs').isArray().withMessage('Document IDs must be an array'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { lcID, documentIDs } = req.body;

      logger.info(`[SHIPMENT] Submitting LC documents for shipment: ${shipmentID}, LC: ${lcID}`);

      await fabricService.connectAsOrg('ExporterMSP');

      const result = await fabricService.invokeChaincode('SubmitLCDocuments', [
        lcID,
        JSON.stringify(documentIDs)
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPMENT] LC documents submitted: LC ${lcID}, ${documentIDs.length} documents`);
        res.json({
          success: true,
          message: 'LC documents submitted successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPMENT] Failed to submit LC documents: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: result.error || 'Failed to submit LC documents',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPMENT] Error submitting LC documents:', error);
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

// ==================== COMPLETE COFFEE EXPORT SHIPPING WORKFLOW ENDPOINTS ====================

/**
 * POST /api/v1/shipments/{shipmentID}/land-transport/start
 * Start land transport from Addis to Djibouti (CUSTOMS_CLEARED → LAND_TRANSPORT)
 */
router.post('/:shipmentID/land-transport/start',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('transportCompany').notEmpty().withMessage('Transport company is required'),
    body('truckPlate').notEmpty().withMessage('Truck plate number is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { transportCompany, truckPlate, driverName, sealNumber } = req.body;

      logger.info(`[SHIPPING] Starting land transport for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('StartLandTransport', [
        shipmentID,
        transportCompany,
        truckPlate || '',
        driverName || '',
        sealNumber || `SEAL-${Date.now()}`
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Land transport started: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Land transport started',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to start land transport: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'LAND_TRANSPORT_START_FAILED',
            message: result.error || 'Failed to start land transport',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error starting land transport:', error);
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
 * POST /api/v1/shipments/{shipmentID}/port/arrive
 * Record arrival at Djibouti Port (LAND_TRANSPORT → PORT_ARRIVED)
 */
router.post('/:shipmentID/port/arrive',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { notes } = req.body;

      logger.info(`[SHIPPING] Recording port arrival for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('ArriveAtPort', [
        shipmentID,
        notes || 'Arrived at Djibouti Port'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Port arrival recorded: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Port arrival recorded',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record port arrival: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'PORT_ARRIVAL_FAILED',
            message: result.error || 'Failed to record port arrival',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording port arrival:', error);
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
 * POST /api/v1/shipments/{shipmentID}/container/stuff
 * Record container stuffing (PORT_ARRIVED → CONTAINER_STUFFED)
 */
router.post('/:shipmentID/container/stuff',
  [
    param('shipmentID').notEmpty().withMessage('Shipment ID is required'),
    body('containerNumber').notEmpty().withMessage('Container number is required'),
    body('containerType').notEmpty().withMessage('Container type is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { containerNumber, containerType, sealNumber, stuffedBy, location } = req.body;

      logger.info(`[SHIPPING] Recording container stuffing for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('StuffContainer', [
        shipmentID,
        containerNumber,
        containerType || 'DRY',
        sealNumber || `SEAL-${Date.now()}`,
        stuffedBy || 'Port Authority',
        location || 'Djibouti Port'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Container stuffed: ${shipmentID} → ${containerNumber}`);
        res.json({
          success: true,
          message: 'Container stuffing recorded',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record container stuffing: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'CONTAINER_STUFFING_FAILED',
            message: result.error || 'Failed to record container stuffing',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording container stuffing:', error);
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
 * POST /api/v1/shipments/{shipmentID}/vessel/load
 * Record container loaded on vessel (CONTAINER_STUFFED → VESSEL_LOADED)
 */
router.post('/:shipmentID/vessel/load',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { notes } = req.body;

      logger.info(`[SHIPPING] Recording vessel loading for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('LoadOnVessel', [
        shipmentID,
        notes || 'Container loaded on vessel'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Vessel loaded: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Vessel loading recorded',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record vessel loading: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VESSEL_LOADING_FAILED',
            message: result.error || 'Failed to record vessel loading',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording vessel loading:', error);
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
 * POST /api/v1/shipments/{shipmentID}/vessel/depart
 * Record vessel departure (VESSEL_LOADED → DEPARTED)
 */
router.post('/:shipmentID/vessel/depart',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { notes } = req.body;

      logger.info(`[SHIPPING] Recording vessel departure for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('DepartFromPort', [
        shipmentID,
        notes || 'Vessel departed from Djibouti'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Vessel departed: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Vessel departure recorded',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record vessel departure: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VESSEL_DEPARTURE_FAILED',
            message: result.error || 'Failed to record vessel departure',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording vessel departure:', error);
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
 * POST /api/v1/shipments/{shipmentID}/in-transit/update
 * Update to in-transit status (DEPARTED → IN_TRANSIT)
 */
router.post('/:shipmentID/in-transit/update',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { trackingNumber } = req.body;

      logger.info(`[SHIPPING] Updating to in-transit for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('UpdateToInTransit', [
        shipmentID,
        trackingNumber || ''
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] In-transit updated: ${shipmentID}`);
        res.json({
          success: true,
          message: 'In-transit status updated',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to update in-transit: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'IN_TRANSIT_UPDATE_FAILED',
            message: result.error || 'Failed to update in-transit status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error updating in-transit:', error);
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
 * POST /api/v1/shipments/{shipmentID}/destination/arrive
 * Record arrival at destination port (IN_TRANSIT → DESTINATION_ARRIVED)
 */
router.post('/:shipmentID/destination/arrive',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { notes } = req.body;

      logger.info(`[SHIPPING] Recording destination arrival for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('ArriveAtDestination', [
        shipmentID,
        notes || 'Arrived at destination port'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Destination arrival recorded: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Destination arrival recorded',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to record destination arrival: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'DESTINATION_ARRIVAL_FAILED',
            message: result.error || 'Failed to record destination arrival',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error recording destination arrival:', error);
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
 * POST /api/v1/shipments/{shipmentID}/delivery/complete
 * Complete final delivery (DESTINATION_ARRIVED → DELIVERED)
 */
router.post('/:shipmentID/delivery/complete',
  [param('shipmentID').notEmpty().withMessage('Shipment ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { deliveryNotes } = req.body;

      logger.info(`[SHIPPING] Completing delivery for shipment: ${shipmentID}`);

      await fabricService.connectAsOrg('ShippingMSP');

      const result = await fabricService.invokeChaincode('CompleteDelivery', [
        shipmentID,
        deliveryNotes || 'Delivery completed'
      ]);

      if (result.success) {
        logger.info(`✅ [SHIPPING] Delivery completed: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Delivery completed',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`❌ [SHIPPING] Failed to complete delivery: ${result.error}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'DELIVERY_COMPLETION_FAILED',
            message: result.error || 'Failed to complete delivery',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('[SHIPPING] Error completing delivery:', error);
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

// POST /shipments/:shipmentID/status - Update shipment status
router.post('/:shipmentID/status',
  authMiddleware,
  [body('status').notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { shipmentID } = req.params;
      const { status, location, updatedBy } = req.body;
      const user = (req as any).user;

      await postgresDb.run(
        `INSERT INTO shipment_status_history (
          shipment_id, status, location, updated_by
        ) VALUES ($1, $2, $3, $4)`,
        [shipmentID, status, location || null, updatedBy || user.username]
      );

      res.json({
        success: true,
        data: { shipmentID, status },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Shipment status update error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;