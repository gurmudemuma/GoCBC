// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Management Routes - Complete shipping lifecycle tracking

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();

/**
 * GET /api/v1/shipping/shipments
 * Get all shipments with optional status filtering
 */
router.get('/shipments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    logger.info(`[SHIPPING] Fetching shipments${status ? ` with status: ${status}` : ''}...`);

    let query = `
      SELECT 
        s.*,
        c.exporter_id,
        c.buyer_id,
        c.quantity as contract_quantity,
        c.coffee_type
      FROM shipments s
      LEFT JOIN contracts c ON s.contract_id = c.contract_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND s.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC`;

    const shipments = await dbService.all(query, params);

    const normalizedShipments = shipments.map((shipment: any) => ({
      shipmentId: shipment.shipment_id,
      contractId: shipment.contract_id,
      exporterId: shipment.exporter_id,
      buyerId: shipment.buyer_id,
      status: shipment.status,
      origin: shipment.origin || 'ADDIS_ABABA',
      destination: shipment.destination || 'DJIBOUTI',
      carrier: shipment.carrier,
      bookingReference: shipment.booking_reference,
      estimatedDeparture: shipment.estimated_departure,
      actualDeparture: shipment.actual_departure,
      estimatedArrival: shipment.estimated_arrival,
      actualArrival: shipment.actual_arrival,
      coffeeType: shipment.coffee_type,
      
      quantity: shipment.contract_quantity || 0,
      containerNumber: shipment.container_number,
      sealNumber: shipment.seal_number,
      transportMode: shipment.transport_mode || 'LAND_SEA',
      currentLocation: shipment.current_location,
      lastUpdated: shipment.updated_at || shipment.created_at,
      createdAt: shipment.created_at
    }));

    logger.info(`[SHIPPING] ✅ Retrieved ${normalizedShipments.length} shipments`);

    res.json({
      success: true,
      data: normalizedShipments,
      count: normalizedShipments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch shipments'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/shipping/shipments/:shipmentId
 * Get specific shipment details
 */
router.get('/shipments/:shipmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    logger.info(`[SHIPPING] Fetching shipment: ${shipmentId}`);

    const shipment = await dbService.get(`
      SELECT 
        s.*,
        c.exporter_id,
        c.buyer_id,
        c.quantity as contract_quantity,
        c.coffee_type,
        c.coffee_grade,
        c.buyer_country
      FROM shipments s
      LEFT JOIN contracts c ON s.contract_id = c.contract_id
      WHERE s.shipment_id = $1
    `, [shipmentId]);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Shipment not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const normalizedShipment = {
      shipmentId: shipment.shipment_id,
      contractId: shipment.contract_id,
      exporterId: shipment.exporter_id,
      buyerId: shipment.buyer_id,
      buyerCountry: shipment.buyer_country,
      status: shipment.status,
      origin: shipment.origin || 'ADDIS_ABABA',
      destination: shipment.destination || 'DJIBOUTI',
      carrier: shipment.carrier,
      bookingReference: shipment.booking_reference,
      estimatedDeparture: shipment.estimated_departure,
      actualDeparture: shipment.actual_departure,
      estimatedArrival: shipment.estimated_arrival,
      actualArrival: shipment.actual_arrival,
      coffeeType: shipment.coffee_type,
      
      quantity: shipment.contract_quantity || 0,
      containerNumber: shipment.container_number,
      sealNumber: shipment.seal_number,
      transportMode: shipment.transport_mode || 'LAND_SEA',
      currentLocation: shipment.current_location,
      lastUpdated: shipment.updated_at || shipment.created_at,
      createdAt: shipment.created_at
    };

    res.json({
      success: true,
      data: normalizedShipment,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/shipping/bookings
 * Get all shipping bookings
 */
router.get('/bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('[SHIPPING] Fetching shipping bookings...');

    const bookings = await dbService.all(`
      SELECT 
        s.shipment_id,
        s.contract_id,
        s.carrier,
        s.origin,
        s.destination,
        s.estimated_departure,
        s.estimated_arrival,
        s.status,
        s.created_at,
        c.exporter_id,
        c.buyer_id
      FROM shipments s
      LEFT JOIN contracts c ON s.contract_id = c.contract_id
      ORDER BY s.created_at DESC
    `);

    const normalizedBookings = bookings.map((booking: any) => ({
      bookingId: `BOOK-${booking.shipment_id}`,
      shipmentId: booking.shipment_id,
      contractId: booking.contract_id,
      exporterId: booking.exporter_id,
      buyerId: booking.buyer_id,
      carrier: booking.carrier,
      origin: booking.origin || 'ADDIS_ABABA',
      destination: booking.destination || 'DJIBOUTI',
      estimatedDeparture: booking.estimated_departure,
      estimatedArrival: booking.estimated_arrival,
      bookingStatus: booking.status === 'CUSTOMS_CLEARED' ? 'CONFIRMED' : 'PENDING',
      createdAt: booking.created_at
    }));

    logger.info(`[SHIPPING] ✅ Retrieved ${normalizedBookings.length} bookings`);

    res.json({
      success: true,
      data: normalizedBookings,
      count: normalizedBookings.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch bookings'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/shipping/tracking
 * Get shipment tracking information
 */
router.get('/tracking', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { shipmentId, bookingReference } = req.query;
    logger.info('[SHIPPING] Fetching tracking information...');

    let query = `
      SELECT 
        s.*,
        c.exporter_id,
        c.buyer_id
      FROM shipments s
      LEFT JOIN contracts c ON s.contract_id = c.contract_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (shipmentId) {
      query += ` AND s.shipment_id = $${params.length + 1}`;
      params.push(shipmentId);
    }

    if (bookingReference) {
      query += ` AND s.booking_reference = $${params.length + 1}`;
      params.push(bookingReference);
    }

    query += ` ORDER BY s.created_at DESC`;

    const trackingData = await dbService.all(query, params);

    const normalizedTracking = trackingData.map((track: any) => ({
      trackingId: `TRACK-${track.shipment_id}`,
      shipmentId: track.shipment_id,
      bookingReference: track.booking_reference,
      contractId: track.contract_id,
      status: track.status,
      currentLocation: track.current_location || track.origin || 'ADDIS_ABABA',
      origin: track.origin || 'ADDIS_ABABA',
      destination: track.destination || 'DJIBOUTI',
      estimatedArrival: track.estimated_arrival,
      actualArrival: track.actual_arrival,
      carrier: track.carrier,
      lastUpdated: track.updated_at || track.created_at,
      trackingEvents: [
        {
          event: 'BOOKING_CONFIRMED',
          location: track.origin || 'ADDIS_ABABA',
          timestamp: track.created_at,
          description: 'Shipment booking confirmed'
        },
        track.status === 'LAND_TRANSPORT' || track.status === 'ARRIVED_PORT' || track.status === 'PORT_WAREHOUSED' || track.status === 'VESSEL_LOADED' || track.status === 'IN_TRANSIT' || track.status === 'DESTINATION_PORT' || track.status === 'DELIVERED' ? {
          event: 'IN_TRANSIT',
          location: track.current_location || 'EN_ROUTE',
          timestamp: track.updated_at || track.created_at,
          description: 'Shipment in transit'
        } : null,
        track.status === 'DELIVERED' ? {
          event: 'DELIVERED',
          location: track.destination || 'DJIBOUTI',
          timestamp: track.actual_arrival || track.updated_at,
          description: 'Shipment delivered'
        } : null
      ].filter(e => e !== null)
    }));

    logger.info(`[SHIPPING] ✅ Retrieved ${normalizedTracking.length} tracking records`);

    res.json({
      success: true,
      data: normalizedTracking,
      count: normalizedTracking.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch tracking information'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
