// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Border Crossing Documentation API Routes

import express from 'express';
import { FabricService } from '../services/fabricService';
import { DatabaseService } from '../services/databaseService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const fabricService = FabricService.getInstance();
const postgresDb = DatabaseService.getInstance();

// ==================== BORDER CROSSING ROUTES ====================

// GET /api/v1/bordercrossing — Get all border crossings
router.get('/', authMiddleware, async (req, res) => {
  try {
    logger.info('[BORDERCROSSING] 🔗 Querying all border crossings from blockchain...');
    
    const result = await fabricService.evaluateTransaction('QueryAllBorderCrossings');
    
    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Blockchain query failed: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        source: 'blockchain'
      });
    }

    const crossings = result.data || [];
    logger.info(`[BORDERCROSSING] ✅ Retrieved ${crossings.length} border crossings`);

    res.json({
      success: true,
      data: crossings,
      count: crossings.length,
      source: 'blockchain',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error fetching crossings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/bordercrossing/:id — Get specific crossing
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[BORDERCROSSING] 🔍 Fetching border crossing: ${id}`);
    
    const result = await fabricService.evaluateTransaction('ReadBorderCrossing', id);
    
    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to fetch: ${result.error}`);
      return res.status(404).json({ 
        success: false, 
        error: result.error 
      });
    }

    res.json({
      success: true,
      data: result.data,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[BORDERCROSSING] ❌ Error fetching crossing:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/bordercrossing/shipment/:shipmentId — Get by shipment
router.get('/shipment/:shipmentId', authMiddleware, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    logger.info(`[BORDERCROSSING] 🔍 Fetching crossings for shipment: ${shipmentId}`);
    
    const result = await fabricService.evaluateTransaction('QueryBorderCrossingsByShipment', shipmentId);
    
    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const crossings = result.data || [];
    
    res.json({
      success: true,
      data: crossings,
      count: crossings.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[BORDERCROSSING] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/v1/bordercrossing/status/:status — Get by status
router.get('/status/:status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    logger.info(`[BORDERCROSSING] 🔍 Fetching crossings with status: ${status}`);
    
    const result = await fabricService.evaluateTransaction('QueryBorderCrossingsByStatus', status);
    
    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to fetch: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    const crossings = result.data || [];
    
    res.json({
      success: true,
      data: crossings,
      count: crossings.length,
      source: 'blockchain'
    });
  } catch (error: any) {
    logger.error(`[BORDERCROSSING] ❌ Error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/initiate — Initiate border crossing
router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const {
      crossingId,
      shipmentId,
      contractId,
      exporterId,
      borderPost,
      borderCountry,
      crossingType,
      transitCountry,
      finalDestination,
      exitPermitNumber,
      customsDeclaration,
      transportMode,
      vehicleNumber,
      driverName,
      sealNumber,
      cargoWeight,
      numberOfBags
    } = req.body;

    logger.info(`[BORDERCROSSING] 📝 Initiating crossing: ${crossingId}`);

    const result = await fabricService.submitTransaction('InitiateBorderCrossing',
      crossingId,
      shipmentId,
      contractId,
      exporterId,
      borderPost,
      borderCountry,
      crossingType,
      transitCountry || '',
      finalDestination,
      exitPermitNumber,
      customsDeclaration,
      transportMode,
      vehicleNumber,
      driverName,
      sealNumber,
      String(cargoWeight),
      String(numberOfBags)
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to initiate: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Initiated: ${crossingId}`);

    res.status(201).json({
      success: true,
      message: 'Border crossing initiated successfully',
      data: { crossingId },
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error initiating:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/clear-exit — Clear for exit
router.post('/:id/clear-exit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { customsOfficer, clearanceRef } = req.body;

    logger.info(`[BORDERCROSSING] ✅ Clearing for exit: ${id}`);

    const result = await fabricService.submitTransaction('ClearForExit',
      id,
      customsOfficer,
      clearanceRef
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to clear: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Cleared for exit: ${id}`);

    res.json({
      success: true,
      message: 'Cleared for exit successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error clearing:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/departure — Record departure
router.post('/:id/departure', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { departureDate } = req.body;

    logger.info(`[BORDERCROSSING] 🚚 Recording departure: ${id}`);

    const result = await fabricService.submitTransaction('RecordDeparture',
      id,
      departureDate
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to record departure: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Departure recorded: ${id}`);

    res.json({
      success: true,
      message: 'Departure recorded successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error recording departure:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/crossing — Record border crossing
router.post('/:id/crossing', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      crossingDate,
      borderCustomsOfficer,
      borderClearanceRef,
      borderStampURL
    } = req.body;

    logger.info(`[BORDERCROSSING] 🛂 Recording border crossing: ${id}`);

    const result = await fabricService.submitTransaction('RecordBorderCrossing',
      id,
      crossingDate,
      borderCustomsOfficer || '',
      borderClearanceRef || '',
      borderStampURL || ''
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to record crossing: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Border crossing recorded: ${id}`);

    res.json({
      success: true,
      message: 'Border crossing recorded successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error recording crossing:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/location — Update location
router.post('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, checkpoint } = req.body;

    logger.info(`[BORDERCROSSING] 📍 Updating location: ${id}`);

    const result = await fabricService.submitTransaction('UpdateLocation',
      id,
      location,
      checkpoint || ''
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to update location: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Location updated: ${id} - ${location}`);

    res.json({
      success: true,
      message: 'Location updated successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error updating location:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/delay — Report delay
router.post('/:id/delay', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { delayReason, delayDuration } = req.body;

    logger.info(`[BORDERCROSSING] ⚠️  Reporting delay: ${id}`);

    const result = await fabricService.submitTransaction('ReportDelay',
      id,
      delayReason,
      String(delayDuration || 0)
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to report delay: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Delay reported: ${id}`);

    res.json({
      success: true,
      message: 'Delay reported successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error reporting delay:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/arrival — Record arrival
router.post('/:id/arrival', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { arrivalDate, arrivalLocation } = req.body;

    logger.info(`[BORDERCROSSING] 🏁 Recording arrival: ${id}`);

    const result = await fabricService.submitTransaction('RecordArrival',
      id,
      arrivalDate,
      arrivalLocation
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to record arrival: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Arrival recorded: ${id}`);

    res.json({
      success: true,
      message: 'Arrival recorded successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error recording arrival:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/v1/bordercrossing/:id/verify — Verify compliance
router.post('/:id/verify', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { complianceStatus, complianceNotes } = req.body;

    logger.info(`[BORDERCROSSING] ✅ Verifying compliance: ${id}`);

    const result = await fabricService.submitTransaction('VerifyCompliance',
      id,
      complianceStatus,
      complianceNotes || ''
    );

    if (!result.success) {
      logger.error(`[BORDERCROSSING] ❌ Failed to verify: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

    logger.info(`[BORDERCROSSING] ✅ Compliance verified: ${id}`);

    res.json({
      success: true,
      message: 'Compliance verified successfully',
      txId: result.transactionId
    });
  } catch (error: any) {
    logger.error('[BORDERCROSSING] ❌ Error verifying:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
