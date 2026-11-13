// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Management Routes - Complete shipping lifecycle tracking

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { FabricService } from '../services/fabricService';
import { ShipmentService } from '../services/shipmentService';
import { logger } from '../utils/logger';
import { statusManager } from '../utils/statusManager';

const router = Router();
const dbService = DatabaseService.getInstance();
const fabricService = FabricService.getInstance();
const shipmentService = ShipmentService.getInstance();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: errors.array() },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

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
  requireRole('EXPORTER', 'SHIPPING', 'SHIPPING_ADMIN', 'ECTA', 'ECTA_ADMIN'),
  [
    // shipmentID is REQUIRED: shipping_bookings.shipment_id is NOT NULL,
    // so a missing/empty value used to leak the Postgres not-null
    // constraint as a 500 INTERNAL_ERROR. Fail fast with 400 instead.
    body('shipmentID').isString().withMessage('shipmentID must be a string').trim().notEmpty().withMessage('shipmentID is required'),
    // bookingID is OPTIONAL (generated as BOOK-<Date.now()> when absent),
    // but a provided value must not be empty.
    body('bookingID').optional().isString().withMessage('bookingID must be a string').trim().notEmpty().withMessage('bookingID must not be empty'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
  try {
    const {
      bookingID: providedBookingID, // Accept bookingID from request
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

    // Use provided bookingID or generate one
    const bookingID = providedBookingID || `BOOK-${Date.now()}`;
    
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
      // shipmentID is validated non-empty above (400 VALIDATION_ERROR),
      // so this can never be null — never leak the NOT NULL constraint.
      shipmentID,
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
    // there, so bookings were invisible in the portal. Mirror the booked
    // shipment to FREIGHT_BOOKED ONLY when the shipment's lifecycle and
    // transport mode support it (M2/M3):
    //  - FROM-STATE: the audited SHIPMENT table
    //    (api/src/utils/statusManager.ts) lists FREIGHT_BOOKED as a target
    //    from CREATED and from CUSTOMS_CLEARED (leg2 #7 reconciliation:
    //    the literal order is customs cleared → book freight, and the
    //    book-freight route always allowed that move). Mirroring from
    //    CUSTOMS_CLEARED used to destroy the exact state
    //    StartLandTransport requires — the chaincode now accepts
    //    FREIGHT_BOOKED there too (main.go), so a booked shipment can
    //    still start land transport. Mirroring from DELIVERED (or any
    //    later state) still moves the shipment backwards and stays
    //    refused. The chaincode setter
    //    (UpdateShipmentStatus, main.go:2104) has deliberately NO
    //    from-state guard, so this API gate is the only thing stopping a
    //    regressing chain write.
    //  - TRANSPORT MODE: a freight booking is a sea-freight booking
    //    (vessel/voyage/container). An AIR shipment never takes
    //    FREIGHT_BOOKED — its air paperwork is the airway bill (LOADED).
    //    The ledger's TransportMode (SEA/AIR) is authoritative: the
    //    Postgres transport_mode column is the migration-029 default
    //    'LAND_SEA' (the create-shipment insert never writes it), so it
    //    cannot tell SEA from AIR.
    // The ledger is the source of truth for both checks (Postgres
    // shipments.status is known-stale, O-1). When the ledger cannot be
    // read, the Postgres status gates the PG mirror only; the chain write
    // is skipped — never write to the chain from an unverified
    // from-state. A skipped mirror never fails the booking: the booking
    // row itself is still created (status BOOKED).
    let blockchainSynced = false;
    let blockchainWarning: string | null = null;
    if (shipmentID) {
      // Ledger state first: status + transport mode (authoritative).
      let ledgerStatus: string | null = null;
      let ledgerMode: string | null = null;
      try {
        const ledgerShipment = await fabricService.getShipment(shipmentID);
        if (ledgerShipment?.success && ledgerShipment?.data) {
          ledgerStatus = String(ledgerShipment.data.status || ledgerShipment.data.Status || '');
          ledgerMode = String(ledgerShipment.data.transportMode || ledgerShipment.data.TransportMode || '');
        } else {
          logger.warn(`[SHIPPING] Could not read shipment ${shipmentID} from the ledger: ${ledgerShipment?.error || 'not found'}; Postgres status will gate the PG mirror only`);
        }
      } catch (ledgerError: any) {
        logger.warn(`[SHIPPING] Ledger read failed for shipment ${shipmentID}: ${ledgerError.message}; Postgres status will gate the PG mirror only`);
      }

      // Postgres status (fallback signal for the PG mirror only).
      let pgStatus: string | null = null;
      try {
        const pgRow: any = await dbService.get(
          'SELECT status FROM shipments WHERE shipment_id = $1',
          [shipmentID]
        );
        pgStatus = pgRow?.status ? String(pgRow.status) : null;
      } catch (pgError: any) {
        logger.warn(`[SHIPPING] Postgres shipment lookup failed for ${shipmentID}: ${pgError.message}`);
      }

      if (!ledgerStatus && !pgStatus) {
        blockchainWarning = `Shipment ${shipmentID} was not found in PostgreSQL or on the ledger, so its status could not be moved to FREIGHT_BOOKED`;
        logger.warn(`[SHIPPING] ${blockchainWarning}`);
      } else {
        // Gate on the ledger status when known, else the Postgres status.
        // statusManager.validateTransition is fail-closed: FREIGHT_BOOKED
        // is reachable from CREATED (book early) and from CUSTOMS_CLEARED
        // (book after clearance — the literal order; leg2 #7). The old
        // gate allowed CREATED only, so a booking after customs clearance
        // silently skipped the mirror while the book-freight route moved
        // the same shipment — the two paths now agree. (Moving
        // CUSTOMS_CLEARED → FREIGHT_BOOKED used to strand land transport;
        // StartLandTransport now accepts FREIGHT_BOOKED, see main.go.)
        const gateStatus = (ledgerStatus || pgStatus) as string;
        const isAir = ledgerMode ? ledgerMode.trim().toUpperCase() === 'AIR' : false;
        const mayMirror = !isAir && statusManager.validateTransition('SHIPMENT', gateStatus, 'FREIGHT_BOOKED');
        if (!mayMirror) {
          const reason = isAir
            ? 'transport mode is AIR (a sea-freight booking does not apply to air shipments)'
            : `status is ${gateStatus} (FREIGHT_BOOKED is only mirrored from CREATED or CUSTOMS_CLEARED)`;
          blockchainWarning = `Shipment ${shipmentID} ${reason}, so its status was left unchanged; the booking itself was still recorded`;
          logger.warn(`[SHIPPING] ${blockchainWarning}`);
        } else {
          // PG mirror, guarded in the UPDATE as well as in code, so a
          // concurrent status change cannot reintroduce the regression.
          try {
            const updated = await dbService.run(
              `UPDATE shipments
               SET status = 'FREIGHT_BOOKED', updated_at = NOW()
               WHERE shipment_id = $1 AND status IN ('CREATED', 'CUSTOMS_CLEARED')`,
              [shipmentID]
            );
            if ((updated as any)?.rowCount === 0) {
              blockchainWarning = `Shipment ${shipmentID} left CREATED/CUSTOMS_CLEARED before the mirror ran, so its Postgres status was not moved to FREIGHT_BOOKED`;
              logger.warn(`[SHIPPING] ${blockchainWarning}`);
            }
          } catch (statusError: any) {
            blockchainWarning = `Failed to move shipment ${shipmentID} to FREIGHT_BOOKED: ${statusError.message}`;
            logger.warn(`[SHIPPING] ${blockchainWarning}`);
          }
          // Chain mirror — ONLY from a verified ledger from-state. If the
          // ledger could not be read, no chain write happens at all.
          if (ledgerStatus) {
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
            blockchainWarning = `Ledger status for shipment ${shipmentID} could not be verified, so no chaincode status update was attempted`;
            logger.warn(`[SHIPPING] ${blockchainWarning}`);
          }
        }
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

// ==================== ADVANCED SHIPPING OPERATIONS ====================

/**
 * POST /api/v1/shipping/bookings/:bookingId/bill-of-lading/issue
 * Issue Bill of Lading (various types)
 * Types: NEGOTIABLE, NON_NEGOTIABLE, SEA_WAYBILL, MASTER_BL, HOUSE_BL
 */
router.post('/bookings/:bookingId/bill-of-lading/issue',
  authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'),
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('blNumber').notEmpty().withMessage('B/L number is required'),
    body('blType').isIn(['NEGOTIABLE', 'NON_NEGOTIABLE', 'SEA_WAYBILL', 'MASTER_BL', 'HOUSE_BL']).withMessage('Invalid B/L type'),
    body('shipper').notEmpty().withMessage('Shipper is required'),
    body('consignee').notEmpty().withMessage('Consignee is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const {
        blNumber,
        blType,
        shipper,
        consignee,
        notifyParty,
        portOfLoading,
        portOfDischarge,
        vesselName,
        voyageNumber,
        containerNumbers,
        sealNumbers,
        cargoDescription,
        packageCount,
        grossWeight,
        measurement,
        freightTerms,
        numberOfOriginals,
        issuedAt,
        issueDate,
        onBoardDate
      } = req.body;
      const user = (req as any).user;

      logger.info(`[SHIPPING] Issuing ${blType} Bill of Lading: ${blNumber}`);

      // A bill of lading must reference a real booking: bookings live in
      // PostgreSQL (shipping_bookings) — there is no booking object on the
      // ledger (booking-create only mirrors the linked shipment's status
      // on-chain). The B/L itself is recorded on the LEDGER first
      // (F3, leg2 — RecordBillOfLading, signed by ShippingMSP) and
      // mirrored to PG (bills_of_lading) only after the chain write
      // commits; the old code inserted the PG row only, so the ledger
      // shipment's billOfLadingNo stayed "" and there was no signature.
      // Unknown booking -> 404, never issue.
      const booking = await dbService.get(
        'SELECT booking_id, shipment_id, vessel_name, origin, destination FROM shipping_bookings WHERE booking_id = $1',
        [bookingId]
      );
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
          timestamp: new Date().toISOString()
        });
      }
      const shipmentId = (booking as any).shipment_id as string;

      // F3 (leg2): the linked shipment must be in a loadable state —
      // 404 when it does not exist, 400 when its state does not allow
      // loading. Nothing is written on a refusal.
      const blGate = await shipmentService.assertBillOfLadingAllowed(shipmentId);
      if (!blGate.ok) {
        const status = blGate.code === 'SHIPMENT_NOT_FOUND' ? 404
          : blGate.code === 'SHIPMENT_VERIFY_UNAVAILABLE' ? 503 : 400;
        return res.status(status).json({
          success: false,
          error: { code: blGate.code, message: blGate.message },
          timestamp: new Date().toISOString()
        });
      }

      // Ledger-first: RecordBillOfLading sets billOfLadingNo and LOADED
      // on-chain under the endorsement policy. Vessel / ports come from
      // the request body when supplied and fall back to the booking row
      // (the old code hand-typed them in the body and never checked
      // them against the booking — a mismatch was not caught); the
      // estimated arrival falls back to the on-board / issue date.
      // The resolved values are used for the chain call AND the PG
      // mirror below, so an omitted vessel/port can never leave a
      // committed chain write with a failed PG insert behind it.
      // A failed chain call returns 503 and writes no PG row.
      const effVessel = vesselName || (booking as any).vessel_name || '';
      const effPortOfLoading = portOfLoading || (booking as any).origin || '';
      const effPortOfDischarge = portOfDischarge || (booking as any).destination || '';
      const effArrival = onBoardDate || issueDate || new Date().toISOString();
      let chainTxId: string | null = null;
      try {
        await fabricService.connectAsOrg('ShippingMSP');
        const chainResult = await fabricService.invokeChaincode('RecordBillOfLading', [
          shipmentId,
          blNumber,
          effVessel,
          effPortOfLoading,
          effPortOfDischarge,
          effArrival,
          '',
        ]);
        if (!chainResult?.success) {
          throw new Error(chainResult?.error || 'Chaincode call did not succeed');
        }
        chainTxId = chainResult.txId || null;
      } catch (chainErr: any) {
        const message = chainErr?.message || 'Chaincode call failed';
        logger.error(`❌ [SHIPPING] Failed to record B/L ${blNumber} on the ledger for shipment ${shipmentId}: ${message}`);
        return res.status(503).json({
          success: false,
          error: {
            code: 'BILL_OF_LADING_FAILED',
            message: `Bill of Lading ${blNumber} could not be recorded on the ledger: ${message}. No B/L was issued.`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const blId = `BL-${Date.now()}`;

      // Store in database — only after the ledger write committed.
      // Mirror the shipment to LOADED in PG (the chaincode already set
      // it on-chain); the mirror never fails the issuance.
      await dbService.run(`
        INSERT INTO bills_of_lading (
          bl_id, bl_number, bl_type, booking_id, shipper, consignee,
          notify_party, port_of_loading, port_of_discharge, vessel_name,
          voyage_number, container_numbers, seal_numbers, cargo_description,
          package_count, gross_weight, measurement, freight_terms,
          number_of_originals, issued_at, issue_date, on_board_date,
          issued_by, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, CURRENT_TIMESTAMP)
      `, [
        blId,
        blNumber,
        blType,
        bookingId,
        shipper,
        consignee,
        notifyParty || '',
        effPortOfLoading,
        effPortOfDischarge,
        effVessel,
        voyageNumber || '',
        Array.isArray(containerNumbers) ? containerNumbers.join(',') : containerNumbers || '',
        Array.isArray(sealNumbers) ? sealNumbers.join(',') : sealNumbers || '',
        cargoDescription,
        packageCount || 0,
        grossWeight || 0,
        measurement || 0,
        freightTerms || 'PREPAID',
        numberOfOriginals || 3,
        issuedAt || 'Port of Loading',
        issueDate || new Date().toISOString(),
        onBoardDate || new Date().toISOString(),
        user.username,
        'ISSUED'
      ]);

      logger.info(`✅ [SHIPPING] Bill of Lading issued: ${blId} (${blType}), ledger tx ${chainTxId}`);

      try {
        await dbService.run(
          `UPDATE shipments SET status = 'LOADED', updated_at = NOW() WHERE shipment_id = $1`,
          [shipmentId]
        );
      } catch (mirrorErr: any) {
        logger.warn(`[SHIPPING] Could not mirror shipment ${shipmentId} to LOADED in Postgres:`, mirrorErr);
      }

      res.status(201).json({
        success: true,
        data: {
          blId,
          blNumber,
          blType,
          bookingId,
          shipmentId,
          shipper,
          consignee,
          status: 'ISSUED',
          shipmentStatus: 'LOADED',
          issueDate: issueDate || new Date().toISOString(),
          numberOfOriginals: numberOfOriginals || 3
        },
        txId: chainTxId,
        message: `${blType} Bill of Lading issued successfully`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error issuing Bill of Lading:', error);
      res.status(500).json({
        success: false,
        error: { code: 'BL_ISSUE_FAILED', message: 'Failed to issue Bill of Lading' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * PUT /api/v1/shipping/bookings/:bookingId/amend
 * Amend shipping booking details
 */
router.put('/bookings/:bookingId/amend',
  authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN', 'EXPORTER'),
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('amendmentReason').notEmpty().withMessage('Amendment reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const {
        amendmentReason,
        newVesselName,
        newVoyageNumber,
        newEstimatedDeparture,
        newEstimatedArrival,
        newContainerType,
        newNumberOfContainers,
        additionalNotes
      } = req.body;
      const user = (req as any).user;

      logger.info(`[SHIPPING] Amending booking: ${bookingId}`);

      // Get current booking
      const currentBooking = await dbService.get(
        'SELECT * FROM shipping_bookings WHERE booking_id = $1',
        [bookingId]
      );

      if (!currentBooking) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
          timestamp: new Date().toISOString()
        });
      }

      const amendmentId = `AMD-${bookingId}-${Date.now()}`;

      // Record amendment
      await dbService.run(`
        INSERT INTO booking_amendments (
          amendment_id, booking_id, amendment_reason, amended_by,
          old_vessel_name, new_vessel_name, old_voyage_number, new_voyage_number,
          old_departure, new_departure, old_arrival, new_arrival,
          old_container_type, new_container_type, old_container_count, new_container_count,
          additional_notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
      `, [
        amendmentId,
        bookingId,
        amendmentReason,
        user.username,
        currentBooking.vessel_name,
        newVesselName || currentBooking.vessel_name,
        currentBooking.voyage_number,
        newVoyageNumber || currentBooking.voyage_number,
        currentBooking.estimated_departure,
        newEstimatedDeparture || currentBooking.estimated_departure,
        currentBooking.estimated_arrival,
        newEstimatedArrival || currentBooking.estimated_arrival,
        currentBooking.container_type,
        newContainerType || currentBooking.container_type,
        currentBooking.number_of_containers,
        newNumberOfContainers || currentBooking.number_of_containers,
        additionalNotes || '',
        'APPROVED'
      ]);

      // Update booking with amendments
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (newVesselName) {
        updates.push(`vessel_name = $${paramIndex++}`);
        values.push(newVesselName);
      }
      if (newVoyageNumber) {
        updates.push(`voyage_number = $${paramIndex++}`);
        values.push(newVoyageNumber);
      }
      if (newEstimatedDeparture) {
        updates.push(`estimated_departure = $${paramIndex++}`);
        values.push(newEstimatedDeparture);
      }
      if (newEstimatedArrival) {
        updates.push(`estimated_arrival = $${paramIndex++}`);
        values.push(newEstimatedArrival);
      }
      if (newContainerType) {
        updates.push(`container_type = $${paramIndex++}`);
        values.push(newContainerType);
      }
      if (newNumberOfContainers) {
        updates.push(`number_of_containers = $${paramIndex++}`);
        values.push(newNumberOfContainers);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(bookingId);
        
        await dbService.run(
          `UPDATE shipping_bookings SET ${updates.join(', ')} WHERE booking_id = $${paramIndex}`,
          values
        );
      }

      logger.info(`✅ [SHIPPING] Booking amended: ${bookingId} - ${amendmentId}`);

      res.json({
        success: true,
        data: {
          amendmentId,
          bookingId,
          amendmentReason,
          status: 'APPROVED',
          amendedFields: {
            vesselName: newVesselName,
            voyageNumber: newVoyageNumber,
            estimatedDeparture: newEstimatedDeparture,
            estimatedArrival: newEstimatedArrival,
            containerType: newContainerType,
            numberOfContainers: newNumberOfContainers
          }
        },
        message: 'Booking amended successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error amending booking:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AMENDMENT_FAILED', message: 'Failed to amend booking' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * DELETE /api/v1/shipping/bookings/:bookingId/cancel
 * Cancel shipping booking
 */
router.delete('/bookings/:bookingId/cancel',
  authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN', 'EXPORTER'),
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('cancellationReason').notEmpty().withMessage('Cancellation reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { cancellationReason, cancelledBy } = req.body;
      const user = (req as any).user;

      logger.info(`[SHIPPING] Cancelling booking: ${bookingId}`);

      // Check if booking can be cancelled (not yet loaded/departed)
      const booking = await dbService.get(
        'SELECT * FROM shipping_bookings WHERE booking_id = $1',
        [bookingId]
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
          timestamp: new Date().toISOString()
        });
      }

      if (['LOADED', 'DEPARTED', 'ARRIVED', 'DELIVERED'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'CANCELLATION_NOT_ALLOWED', 
            message: `Cannot cancel booking with status: ${booking.status}` 
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update booking status to CANCELLED
      await dbService.run(`
        UPDATE shipping_bookings
        SET status = 'CANCELLED',
            cancellation_reason = $1,
            cancelled_by = $2,
            cancellation_date = NOW(),
            updated_at = NOW()
        WHERE booking_id = $3
      `, [
        cancellationReason,
        cancelledBy || user.username,
        bookingId
      ]);

      logger.info(`✅ [SHIPPING] Booking cancelled: ${bookingId}`);

      res.json({
        success: true,
        data: {
          bookingId,
          status: 'CANCELLED',
          cancellationReason,
          cancelledBy: cancelledBy || user.username,
          cancellationDate: new Date().toISOString()
        },
        message: 'Booking cancelled successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error cancelling booking:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CANCELLATION_FAILED', message: 'Failed to cancel booking' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/shipping/bookings/:bookingId/containers/allocate
 * Allocate specific containers to booking
 */
router.post('/bookings/:bookingId/containers/allocate',
  authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'),
  [
    param('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('containers').isArray({ min: 1 }).withMessage('At least one container is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { containers, allocatedBy } = req.body;
      const user = (req as any).user;

      logger.info(`[SHIPPING] Allocating ${containers.length} containers to booking: ${bookingId}`);

      // Validate container format
      for (const container of containers) {
        if (!container.containerNumber || !container.containerType || !container.sizeType) {
          return res.status(400).json({
            success: false,
            error: { 
              code: 'INVALID_CONTAINER', 
              message: 'Each container must have containerNumber, containerType, and sizeType' 
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Store container allocations
      for (const container of containers) {
        await dbService.run(`
          INSERT INTO container_allocations (
            container_id, booking_id, container_number, container_type,
            size_type, condition, allocated_by, allocated_date, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        `, [
          `CONT-${bookingId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          bookingId,
          container.containerNumber,
          container.containerType,
          container.sizeType,
          container.condition || 'GOOD',
          allocatedBy || user.username,
          new Date().toISOString(),
          'ALLOCATED'
        ]);
      }

      // Update booking with container info
      const containerNumbers = containers.map((c: any) => c.containerNumber).join(',');
      await dbService.run(`
        UPDATE shipping_bookings
        SET container_number = $1,
            number_of_containers = $2,
            updated_at = NOW()
        WHERE booking_id = $3
      `, [
        containerNumbers,
        containers.length,
        bookingId
      ]);

      logger.info(`✅ [SHIPPING] Containers allocated to booking: ${bookingId}`);

      res.json({
        success: true,
        data: {
          bookingId,
          containersAllocated: containers.length,
          containers: containers.map((c: any) => ({
            containerNumber: c.containerNumber,
            containerType: c.containerType,
            sizeType: c.sizeType,
            status: 'ALLOCATED'
          })),
          allocationDate: new Date().toISOString()
        },
        message: 'Containers allocated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error allocating containers:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ALLOCATION_FAILED', message: 'Failed to allocate containers' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v1/shipping/containers/:containerId/stuffing-report
 * Record container stuffing report
 */
router.post('/containers/:containerId/stuffing-report',
  authMiddleware,
  requireRole('SHIPPING', 'SHIPPING_ADMIN'),
  [
    param('containerId').notEmpty().withMessage('Container ID is required'),
    body('containerNumber').notEmpty().withMessage('Container number is required'),
    body('stuffingDate').notEmpty().withMessage('Stuffing date is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { containerId } = req.params;
      const {
        containerNumber,
        stuffingDate,
        stuffingLocation,
        cargoDescription,
        packageCount,
        grossWeight,
        netWeight,
        volumeCBM,
        sealNumber,
        stuffingSupervisor,
        photoUrls,
        remarks
      } = req.body;
      const user = (req as any).user;

      logger.info(`[SHIPPING] Recording stuffing report for container: ${containerNumber}`);

      const reportId = `STUFF-${containerId}-${Date.now()}`;

      await dbService.run(`
        INSERT INTO container_stuffing_reports (
          report_id, container_id, container_number, stuffing_date,
          stuffing_location, cargo_description, package_count, gross_weight,
          net_weight, volume_cbm, seal_number, stuffing_supervisor,
          photo_urls, remarks, reported_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      `, [
        reportId,
        containerId,
        containerNumber,
        stuffingDate,
        stuffingLocation || '',
        cargoDescription || '',
        packageCount || 0,
        grossWeight || 0,
        netWeight || 0,
        volumeCBM || 0,
        sealNumber || '',
        stuffingSupervisor || user.username,
        photoUrls ? JSON.stringify(photoUrls) : '[]',
        remarks || '',
        user.username
      ]);

      logger.info(`✅ [SHIPPING] Container stuffing report recorded: ${reportId}`);

      res.status(201).json({
        success: true,
        data: {
          reportId,
          containerId,
          containerNumber,
          stuffingDate,
          packageCount,
          grossWeight,
          sealNumber,
          status: 'STUFFED'
        },
        message: 'Container stuffing report recorded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error recording stuffing report:', error);
      res.status(500).json({
        success: false,
        error: { code: 'STUFFING_REPORT_FAILED', message: 'Failed to record stuffing report' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/shipping/bills-of-lading
 * Get all Bills of Lading with filtering
 */
router.get('/bills-of-lading',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { blType, status, bookingId } = req.query;

      logger.info('[SHIPPING] Fetching Bills of Lading...');

      let query = 'SELECT * FROM bills_of_lading WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (blType) {
        query += ` AND bl_type = $${paramIndex++}`;
        params.push(blType);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (bookingId) {
        query += ` AND booking_id = $${paramIndex++}`;
        params.push(bookingId);
      }

      query += ' ORDER BY issue_date DESC';

      const billsOfLading = await dbService.all(query, params);

      res.json({
        success: true,
        data: billsOfLading.map((bl: any) => ({
          blId: bl.bl_id,
          blNumber: bl.bl_number,
          blType: bl.bl_type,
          bookingId: bl.booking_id,
          shipper: bl.shipper,
          consignee: bl.consignee,
          portOfLoading: bl.port_of_loading,
          portOfDischarge: bl.port_of_discharge,
          vesselName: bl.vessel_name,
          voyageNumber: bl.voyage_number,
          containerNumbers: bl.container_numbers,
          status: bl.status,
          issueDate: bl.issue_date,
          onBoardDate: bl.on_board_date
        })),
        count: billsOfLading.length,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('[SHIPPING] Error fetching Bills of Lading:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch Bills of Lading' },
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
