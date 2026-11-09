// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Management Routes - Complete shipping lifecycle tracking

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();

// A freight booking lives in its own shipping_bookings row
// (booking_id = 'BOOK-<timestamp>', shipment_id = the real shipment).
// The lifecycle handlers below update that booking row, but the real
// shipment row — the one every other portal reads — must advance too:
// mirror each lifecycle status onto the real shipment row (resolved
// via the booking row's shipment_id) and best-effort sync it on-chain
// the same way booking-create mirrors FREIGHT_BOOKED. Never fails the
// request: a booking with no linked shipment simply has nothing to
// mirror. Column names in `extras` are hardcoded by the callers below,
// never user input.
async function mirrorBookingStatusToShipment(
  bookingId: string,
  status: string,
  extras: Array<[string, any]> = [],
): Promise<void> {
  try {
    const booking = await dbService.get(
      'SELECT shipment_id FROM shipping_bookings WHERE booking_id = $1',
      [bookingId],
    );
    const shipmentID = (booking as any)?.shipment_id as string | undefined;
    if (!shipmentID) {
      logger.warn(`[SHIPPING] Booking ${bookingId} has no linked shipment; status ${status} mirrored to the booking row only`);
      return;
    }
    const sets = ['status = $1'];
    const params: any[] = [status];
    extras.forEach(([col, val], i) => {
      sets.push(`${col} = $${i + 2}`);
      params.push(val);
    });
    params.push(shipmentID);
    await dbService.run(
      `UPDATE shipments SET ${sets.join(', ')}, updated_at = NOW() WHERE shipment_id = $${params.length}`,
      params,
    );
    logger.info(`[SHIPPING] ✅ Shipment ${shipmentID} mirrored to ${status} (booking ${bookingId})`);
    try {
      const chainResult = await fabricService.updateShipmentStatus(shipmentID, status);
      if (!chainResult?.success) {
        logger.warn(`[SHIPPING] Chain mirror of ${shipmentID} -> ${status} did not succeed: ${chainResult?.error || 'unknown error'}`);
      }
    } catch (chainError: any) {
      logger.warn(`[SHIPPING] Fabric unavailable, shipment ${shipmentID} status ${status} mirrored in PostgreSQL only: ${chainError.message}`);
    }
  } catch (mirrorError: any) {
    logger.warn(`[SHIPPING] Failed to mirror booking ${bookingId} status ${status} to its shipment: ${mirrorError.message}`);
  }
}

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

    // Bookings live in shipping_bookings; join the real shipment row
    // (and its contract) for the display fields. Response shape is
    // unchanged: bookingId is the BOOK- id, shipmentId is now the REAL
    // shipment (previously it was the phantom row's id), contractId /
    // exporterId / buyerId come from the real shipment's contract.
    // Previously this selected every shipments row with no filter, so
    // every shipment was mislabelled as a booking (and real bookings
    // came back with a doubled 'BOOK-BOOK-...' bookingId).
    const bookings = await dbService.all(`
      SELECT 
        b.booking_id,
        b.shipment_id,
        b.carrier,
        b.origin,
        b.destination,
        b.estimated_departure,
        b.estimated_arrival,
        b.status,
        b.created_at,
        s.contract_id,
        c.exporter_id,
        c.buyer_id
      FROM shipping_bookings b
      LEFT JOIN shipments s ON s.shipment_id = b.shipment_id
      LEFT JOIN contracts c ON s.contract_id = c.contract_id
      ORDER BY b.created_at DESC
    `);

    const normalizedBookings = bookings.map((booking: any) => ({
      bookingId: booking.booking_id,
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
      // Raw lifecycle status from shipping_bookings (BOOKED/LOADED/IN_TRANSIT/
      // ARRIVED/DELIVERED). bookingStatus above is a two-value display label
      // only; without this field a consumer could not tell a BOOKED booking
      // from a DELIVERED one (matrix §16 #43 follow-up, found live in REM7).
      status: booking.status,
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

/**
 * POST /api/v1/shipping/bookings
 * Create a new shipping booking
 */
router.post('/bookings', authMiddleware,
  requireRole('EXPORTER', 'SHIPPING', 'SHIPPING_ADMIN', 'ECTA', 'ECTA_ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      shipmentID,
      exporterID,
      shippingLine,
      vesselName,
      voyageNumber,
      containerType,
      numberOfContainers,
      portOfLoading,
      portOfDischarge,
      estimatedDepartureDate,
      estimatedArrivalDate
    } = req.body;

    const bookingID = `BOOK-${Date.now()}`;
    
    logger.info(`[SHIPPING] Creating booking: ${bookingID} for shipment: ${shipmentID}`);

    // Insert the booking into shipping_bookings (not shipments — the
    // old phantom-row shape). The request fields the old INSERT silently
    // dropped (exporterID, vesselName, voyageNumber, containerType,
    // numberOfContainers) are now persisted. Response shape unchanged.
    await dbService.run(`
      INSERT INTO shipping_bookings (
        booking_id, shipment_id, exporter_id, carrier, vessel_name,
        voyage_number, container_type, number_of_containers, origin,
        destination, estimated_departure, estimated_arrival, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    `, [
      bookingID,
      shipmentID || null,
      exporterID || null,
      shippingLine || 'Maersk Line',
      vesselName || null,
      voyageNumber || null,
      containerType || null,
      numberOfContainers || null,
      portOfLoading || 'Djibouti',
      portOfDischarge || 'New York',
      estimatedDepartureDate || null,
      estimatedArrivalDate || null,
      'BOOKED'
    ]);

    logger.info(`[SHIPPING] ✅ Booking created: ${bookingID}`);

    // The booking is stored in shipping_bookings (status BOOKED), but
    // the shipping portal's freightBookings list reads shipments WHERE
    // status = 'FREIGHT_BOOKED' — and nothing ever moved the real shipment
    // there, so bookings were invisible in the portal. Move the booked
    // shipment to FREIGHT_BOOKED, and best-effort mirror the status on
    // the chain. A chain failure must not fail the booking: the Postgres
    // status is what the portal reads.
    let blockchainSynced = false;
    let blockchainWarning: string | null = null;
    if (shipmentID) {
      try {
        const updated = await dbService.run(
          `UPDATE shipments
           SET status = 'FREIGHT_BOOKED', updated_at = NOW()
           WHERE shipment_id = $1`,
          [shipmentID]
        );
        if ((updated as any)?.rowCount === 0) {
          blockchainWarning = `Shipment ${shipmentID} was not found in PostgreSQL, so its status could not be moved to FREIGHT_BOOKED`;
          logger.warn(`[SHIPPING] ${blockchainWarning}`);
        }
      } catch (statusError: any) {
        blockchainWarning = `Failed to move shipment ${shipmentID} to FREIGHT_BOOKED: ${statusError.message}`;
        logger.warn(`[SHIPPING] ${blockchainWarning}`);
      }
      try {
        const chainResult = await fabricService.updateShipmentStatus(shipmentID, 'FREIGHT_BOOKED');
        blockchainSynced = !!chainResult?.success;
        if (!blockchainSynced) {
          blockchainWarning = `Chaincode status update did not succeed: ${chainResult?.error || 'unknown error'}`;
          logger.warn(`[SHIPPING] ${blockchainWarning}`);
        }
      } catch (chainError: any) {
        blockchainWarning = `Fabric unavailable, shipment status mirrored in PostgreSQL only: ${chainError.message}`;
        logger.warn(`[SHIPPING] ${blockchainWarning}`);
      }
    } else {
      blockchainWarning = 'No shipmentID was supplied, so no shipment status was updated';
    }

    res.json({
      success: true,
      data: {
        bookingID,
        shipmentID,
        status: 'BOOKED',
        shippingLine,
        vesselName,
        voyageNumber,
        portOfLoading,
        portOfDischarge,
        blockchainSynced,
        ...(blockchainWarning ? { blockchainWarning } : {})
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create booking'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/shipping/bookings/:bookingId/load
 * Record cargo loading
 */
router.post('/bookings/:bookingId/load', authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { loadingDate, containerNumbers, sealNumbers, loadedBy } = req.body;

    logger.info(`[SHIPPING] Recording cargo loading for booking: ${bookingId}`);

    // Update the booking row's status to LOADED
    const updated = await dbService.run(`
      UPDATE shipping_bookings
      SET status = $1,
          container_number = $2,
          seal_number = $3,
          updated_at = NOW()
      WHERE booking_id = $4
    `, [
      'LOADED',
      Array.isArray(containerNumbers) ? containerNumbers.join(',') : containerNumbers,
      Array.isArray(sealNumbers) ? sealNumbers.join(',') : sealNumbers,
      bookingId
    ]);

    if ((updated as any)?.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Mirror onto the real shipment row (see mirrorBookingStatusToShipment).
    await mirrorBookingStatusToShipment(bookingId, 'LOADED', [
      ['container_number', Array.isArray(containerNumbers) ? containerNumbers.join(',') : containerNumbers],
      ['seal_number', Array.isArray(sealNumbers) ? sealNumbers.join(',') : sealNumbers],
    ]);

    logger.info(`[SHIPPING] ✅ Cargo loaded for booking: ${bookingId}`);

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'LOADED',
        loadingDate,
        containerNumbers,
        sealNumbers
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error recording cargo loading:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record cargo loading'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/shipping/bookings/:bookingId/depart
 * Record vessel departure
 */
router.post('/bookings/:bookingId/depart', authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { departureDate, actualDepartureTime } = req.body;

    logger.info(`[SHIPPING] Recording vessel departure for booking: ${bookingId}`);

    // Update the booking row's status to IN_TRANSIT
    const updated = await dbService.run(`
      UPDATE shipping_bookings
      SET status = $1,
          actual_departure = $2,
          updated_at = NOW()
      WHERE booking_id = $3
    `, [
      'IN_TRANSIT',
      departureDate || new Date().toISOString().split('T')[0],
      bookingId
    ]);

    if ((updated as any)?.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Mirror onto the real shipment row (see mirrorBookingStatusToShipment).
    await mirrorBookingStatusToShipment(bookingId, 'IN_TRANSIT', [
      ['actual_departure', departureDate || new Date().toISOString().split('T')[0]],
    ]);

    logger.info(`[SHIPPING] ✅ Vessel departed for booking: ${bookingId}`);

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'IN_TRANSIT',
        departureDate,
        actualDepartureTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error recording vessel departure:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record vessel departure'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/shipping/bookings/:bookingId/arrive
 * Record vessel arrival
 */
router.post('/bookings/:bookingId/arrive', authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { arrivalDate, actualArrivalTime } = req.body;

    logger.info(`[SHIPPING] Recording vessel arrival for booking: ${bookingId}`);

    // Update the booking row's status to ARRIVED
    const updated = await dbService.run(`
      UPDATE shipping_bookings
      SET status = $1,
          actual_arrival = $2,
          updated_at = NOW()
      WHERE booking_id = $3
    `, [
      'ARRIVED',
      arrivalDate || new Date().toISOString().split('T')[0],
      bookingId
    ]);

    if ((updated as any)?.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Mirror onto the real shipment row (see mirrorBookingStatusToShipment).
    await mirrorBookingStatusToShipment(bookingId, 'ARRIVED', [
      ['actual_arrival', arrivalDate || new Date().toISOString().split('T')[0]],
    ]);

    logger.info(`[SHIPPING] ✅ Vessel arrived for booking: ${bookingId}`);

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'ARRIVED',
        arrivalDate,
        actualArrivalTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error recording vessel arrival:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record vessel arrival'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/shipping/bookings/:bookingId/deliver
 * Record cargo delivery
 */
router.post('/bookings/:bookingId/deliver', authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { deliveryDate, receivedBy, deliveryNotes } = req.body;

    logger.info(`[SHIPPING] Recording cargo delivery for booking: ${bookingId}`);

    // Update the booking row's status to DELIVERED
    const updated = await dbService.run(`
      UPDATE shipping_bookings
      SET status = $1,
          delivery_date = $2,
          updated_at = NOW()
      WHERE booking_id = $3
    `, [
      'DELIVERED',
      deliveryDate || new Date().toISOString().split('T')[0],
      bookingId
    ]);

    if ((updated as any)?.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Mirror onto the real shipment row (see mirrorBookingStatusToShipment).
    await mirrorBookingStatusToShipment(bookingId, 'DELIVERED', [
      ['delivery_date', deliveryDate || new Date().toISOString().split('T')[0]],
    ]);

    logger.info(`[SHIPPING] ✅ Cargo delivered for booking: ${bookingId}`);

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'DELIVERED',
        deliveryDate,
        receivedBy,
        deliveryNotes
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[SHIPPING] Error recording cargo delivery:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to record cargo delivery'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
