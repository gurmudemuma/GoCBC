// Land Transport Tracking API Routes
import express from 'express';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const fabricService = FabricService.getInstance();

// Record land transport details (Addis → Djibouti)
router.post('/:shipmentId/land-transport',
  authMiddleware,
  [
    param('shipmentId').notEmpty(),
    body('truckingCompany').notEmpty(),
    body('truckPlateNumber').notEmpty(),
    body('driverName').notEmpty(),
    body('departureFromAddis').isISO8601(),
    body('sealNumber').notEmpty(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentId } = req.params;
      const {
        truckingCompany,
        truckPlateNumber,
        driverName,
        driverLicense,
        departureFromAddis,
        sealNumber,
      } = req.body;

      // Update shipment with land transport info via chaincode
      const result = await fabricService.invokeChaincode(
        'UpdateShipmentLandTransport',
        [
          shipmentId,
          truckingCompany,
          truckPlateNumber,
          driverName,
          driverLicense || '',
          departureFromAddis,
          sealNumber,
        ]
      );

      res.json({
        success: result.success,
        data: { shipmentId, status: 'IN_TRANSIT' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error recording land transport:', error);
      res.status(500).json({
        success: false,
        error: { code: 'LAND_TRANSPORT_FAILED', message: 'Failed to record land transport' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Update land transport status
router.put('/:shipmentId/land-transport/status',
  authMiddleware,
  [
    param('shipmentId').notEmpty(),
    body('status').isIn(['IN_TRANSIT', 'BORDER_CROSSED', 'ARRIVED']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentId } = req.params;
      const { status, arrivalTime, borderCrossingTime } = req.body;

      const updateData: any = { landTransportStatus: status };
      
      if (status === 'ARRIVED' && arrivalTime) {
        updateData.arrivalAtDjibouti = arrivalTime;
      }
      if (status === 'BORDER_CROSSED' && borderCrossingTime) {
        updateData.borderCrossingTime = borderCrossingTime;
      }

      const result = await fabricService.invokeChaincode(
        'UpdateShipmentStatus',
        [shipmentId, status]
      );

      res.json({
        success: result.success,
        data: { shipmentId, status },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating land transport status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'STATUS_UPDATE_FAILED' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
