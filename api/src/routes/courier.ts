// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Document Courier Tracking API Routes

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
 * /api/v1/courier/{shipmentID}/send:
 *   post:
 *     summary: Record document courier dispatch
 *     tags: [Courier]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courierCompany
 *               - trackingNumber
 */
router.post('/:shipmentID/send',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('courierCompany').notEmpty().withMessage('Courier company is required'),
    body('trackingNumber').notEmpty().withMessage('Tracking number is required'),
    body('documents').isArray().withMessage('Documents must be an array'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const {
        courierCompany,
        trackingNumber,
        documents,
        recipient,
        recipientAddress,
        sentDate,
      } = req.body;

      logger.info(`[COURIER] Recording document dispatch for shipment: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('SendDocumentsByCourier', [
        shipmentID,
        courierCompany,
        trackingNumber,
        JSON.stringify(documents || []),
        recipient || '',
        recipientAddress || '',
        sentDate || new Date().toISOString(),
      ]);

      if (result.success) {
        logger.info(`✅ Documents sent via ${courierCompany}: ${trackingNumber}`);
        res.json({
          success: true,
          message: 'Document dispatch recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'DISPATCH_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[COURIER] Error recording dispatch:', error);
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
 * /api/v1/courier/{shipmentID}/receive:
 *   post:
 *     summary: Record document receipt by buyer
 *     tags: [Courier]
 */
router.post('/:shipmentID/receive',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('receivedDate').notEmpty().withMessage('Received date is required'),
    body('receivedBy').notEmpty().withMessage('Receiver name is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { receivedDate, receivedBy, condition, notes } = req.body;

      logger.info(`[COURIER] Recording document receipt for shipment: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('ConfirmDocumentReceipt', [
        shipmentID,
        receivedDate,
        receivedBy,
        condition || 'GOOD',
        notes || 'All documents received in good condition',
      ]);

      if (result.success) {
        logger.info(`✅ Document receipt confirmed for shipment: ${shipmentID}`);
        res.json({
          success: true,
          message: 'Document receipt recorded successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'RECEIPT_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[COURIER] Error recording receipt:', error);
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
 * /api/v1/courier/{shipmentID}/status:
 *   get:
 *     summary: Get document courier tracking status
 *     tags: [Courier]
 */
router.get('/:shipmentID/status',
  authMiddleware,
  [param('shipmentID').notEmpty()],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;

      // Query shipment to get courier details
      const result = await fabricService.queryChaincode('ReadShipment', [shipmentID]);

      if (result.success && result.data) {
        const shipment = result.data;
        const courierTracking = {
          shipmentID,
          courierCompany: shipment.courierCompany || null,
          trackingNumber: shipment.courierTracking || null,
          sentDate: shipment.documentsSentDate || null,
          receivedDate: shipment.documentsReceivedDate || null,
          status: shipment.documentsReceivedDate ? 'DELIVERED' : 
                  shipment.documentsSentDate ? 'IN_TRANSIT' : 'NOT_SENT',
        };

        res.json({
          success: true,
          data: courierTracking,
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
      logger.error('[COURIER] Error fetching tracking status:', error);
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
 * /api/v1/courier/{shipmentID}/update-status:
 *   put:
 *     summary: Update courier tracking status (intermediate updates)
 *     tags: [Courier]
 */
router.put('/:shipmentID/update-status',
  authMiddleware,
  [
    param('shipmentID').notEmpty(),
    body('status').notEmpty().withMessage('Status is required'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { shipmentID } = req.params;
      const { status, location, updateTime, notes } = req.body;

      logger.info(`[COURIER] Updating tracking status for shipment: ${shipmentID}`);

      const result = await fabricService.invokeChaincode('UpdateCourierStatus', [
        shipmentID,
        status,
        location,
        updateTime || new Date().toISOString(),
        notes || '',
      ]);

      if (result.success) {
        logger.info(`✅ Courier status updated: ${shipmentID} - ${status}`);
        res.json({
          success: true,
          message: 'Courier status updated successfully',
          data: result.data,
          txId: result.txId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('[COURIER] Error updating status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
