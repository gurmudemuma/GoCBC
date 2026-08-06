// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Land Transport Tracking API Routes (Addis Ababa → Djibouti Port)

import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();
const fabricService = FabricService.getInstance();

/**
 * @swagger
 * /api/v1/land-transport/{shipmentID}/start:
 *   post:
 *     summary: Start land transport from Addis Ababa
 *     tags: [Land Transport]
 */
router.post('/:shipmentID/start',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('transportCompany').notEmpty().withMessage('Transport company is required'),
    body('truckPlateNumber').notEmpty().withMessage('Truck plate number is required'),
    body('driverName').notEmpty().withMessage('Driver name is required'),
    body('sealNumber').notEmpty().withMessage('Seal number is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const {
        transportCompany,
        truckPlateNumber,
        driverName,
        driverPhone,
        sealNumber,
        departureTime,
      } = req.body;

      logger.info(`[LAND-TRANSPORT] Starting transport for shipment: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('StartLandTransport', [
        shipmentID,
        transportCompany,
        truckPlateNumber,
        driverName,
        driverPhone || '',
        sealNumber,
        departureTime || new Date().toISOString(),
      ]);

      if (result.success) {
        logger.info(`✅ Land transport started: ${shipmentID} (Truck: ${truckPlateNumber})`);
        res.json({
          success: true,
          message: 'Land transport started successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'START_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[LAND-TRANSPORT] Error starting transport:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/land-transport/{shipmentID}/border-crossing:
 *   post:
 *     summary: Record Ethiopia-Djibouti border crossing
 *     tags: [Land Transport]
 */
router.post('/:shipmentID/border-crossing',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('crossingTime').notEmpty().withMessage('Border crossing time is required'),
    body('customsOfficer').notEmpty().withMessage('Customs officer name is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { crossingTime, customsOfficer, sealVerified, notes } = req.body;

      logger.info(`[LAND-TRANSPORT] Recording border crossing for: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('RecordBorderCrossing', [
        shipmentID,
        crossingTime,
        customsOfficer,
        (sealVerified !== undefined ? sealVerified : true).toString(),
        notes || 'Seal intact, documents verified',
      ]);

      if (result.success) {
        logger.info(`✅ Border crossing recorded: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Border crossing recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'RECORDING_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[LAND-TRANSPORT] Error recording border crossing:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/land-transport/{shipmentID}/arrive:
 *   post:
 *     summary: Record arrival at Djibouti Port
 *     tags: [Land Transport]
 */
router.post('/:shipmentID/arrive',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('arrivalTime').notEmpty().withMessage('Arrival time is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { arrivalTime, receivedBy, sealCondition, notes } = req.body;

      logger.info(`[LAND-TRANSPORT] Recording arrival at Djibouti: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('RecordPortArrival', [
        shipmentID,
        arrivalTime,
        receivedBy || 'Djibouti Port Authority',
        sealCondition || 'INTACT',
        notes || 'Cargo received in good condition',
      ]);

      if (result.success) {
        logger.info(`✅ Port arrival recorded: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Arrival at Djibouti Port recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'ARRIVAL_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[LAND-TRANSPORT] Error recording arrival:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/land-transport/{shipmentID}/status:
 *   get:
 *     summary: Get land transport status
 *     tags: [Land Transport]
 */
router.get('/:shipmentID/status',
  authMiddleware,
  [param('shipmentID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;

      // Query shipment to get land transport details
      const result = await fabricService.queryChaincode('ReadShipment', [shipmentID]);

      if (result.success && result.data) {
        const shipment = result.data;
        const landTransport = {
          shipmentID,
          status: shipment.landTransportStatus || 'NOT_STARTED',
          company: shipment.landTransportCompany || null,
          truckPlateNumber: shipment.truckPlateNumber || null,
          driverName: shipment.driverName || null,
          sealNumber: shipment.landTransportSeal || null,
          departureFromAddis: shipment.departureFromAddis || null,
          borderCrossingTime: shipment.borderCrossingTime || null,
          arrivalAtDjibouti: shipment.arrivalAtDjibouti || null,
        };

        res.json({
          success: true,
          data: landTransport,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Shipment not found' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[LAND-TRANSPORT] Error fetching status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
