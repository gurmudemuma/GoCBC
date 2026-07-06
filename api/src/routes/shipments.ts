// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipments API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

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
        ecxLotNumber,
        channel,
        forexRate.toString(),
        finalValueUSD.toString(),
        eudrCompliant.toString(),
        JSON.stringify(documentIDs)
      );

      if (result.success) {
        logger.info(`✅ Shipment created successfully: ${shipmentID} with auto-mapped data and ${documentIDs.length} documents`);
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
      const { status, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

      // Apply additional filters
      let filteredShipments = shipments;
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

      const result = await fabricService.updateShipmentStatus(shipmentID, status);

      if (result.success) {
        logger.info(`Shipment status updated successfully: ${shipmentID} - ${status}`);
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

export default router;