-- Migration 064: create a dedicated shipping_bookings table and move
-- freight bookings out of shipments.
--
-- Until now POST /shipping/bookings stored each booking as a phantom
-- row in `shipments` (shipment_id = 'BOOK-<timestamp>', contract_id =
-- the real shipmentID, status BOOKED), and GET /bookings plus the
-- load/depart/arrive/deliver handlers all worked off that phantom row,
-- while the Shipping portal read the real row (FREIGHT_BOOKED) — two
-- rows for one booking, and GET /bookings returned every shipment, not
-- just bookings. Bookings now live in their own table; the real
-- shipment row keeps advancing via the mirror in shipping.ts, so the
-- portal query (shipments WHERE status = 'FREIGHT_BOOKED') is
-- untouched.
--
-- NOTE on the number: this was drafted as 062, but 062 is already the
-- ecx lots rejection_reason migration (committed and applied); the
-- payments split took 063, so this is 064. The runner tracks by full
-- filename, so the rename is safe — but note the content WAS already
-- applied on databases built before the rename, under the old filename
-- 062_create_shipping_bookings (that row exists in _schema_migrations).
-- Re-applying as 064 is safe because every statement below is
-- idempotent (CREATE TABLE/INDEX IF NOT EXISTS, INSERT ... ON CONFLICT
-- DO NOTHING, DELETE of already-moved phantom rows is a no-op).
--
-- Columns mirror the shipments columns the old code wrote, with the
-- same types, plus the POST /bookings request fields the old INSERT
-- silently dropped (exporter_id, vessel_name, voyage_number,
-- container_type, number_of_containers — see TEST-WORKFLOW-MAP.md B1),
-- which the route now persists.
CREATE TABLE IF NOT EXISTS shipping_bookings (
  booking_id VARCHAR(100) PRIMARY KEY,
  shipment_id VARCHAR(100) NOT NULL,
  exporter_id VARCHAR(100),
  carrier VARCHAR(200),
  vessel_name VARCHAR(200),
  voyage_number VARCHAR(100),
  container_type VARCHAR(50),
  number_of_containers INTEGER,
  container_number VARCHAR(50),
  seal_number VARCHAR(50),
  transport_mode VARCHAR(50) DEFAULT 'LAND_SEA',
  origin VARCHAR(100),
  destination VARCHAR(100),
  estimated_departure TIMESTAMP,
  actual_departure TIMESTAMP,
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  delivery_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'BOOKED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_shipping_bookings_status
    CHECK (status IN ('BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'))
);
-- The lifecycle states are exactly the ones shipping.ts writes: BOOKED
-- on create, LOADED / IN_TRANSIT / ARRIVED / DELIVERED by the four
-- lifecycle handlers. No writer uses CANCELLED (there is no booking
-- cancel endpoint), so it is deliberately not in the set; a future
-- cancel writer must extend this CHECK first.

CREATE INDEX IF NOT EXISTS idx_shipping_bookings_shipment
  ON shipping_bookings(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bookings_status
  ON shipping_bookings(status);

-- Move existing phantom booking rows: booking_id is the old phantom
-- shipment_id ('BOOK-...'), shipment_id is the old contract_id (the
-- real shipment). Guarded to the BOOK- pattern only, so real shipment
-- rows are never touched. COALESCE(status, 'BOOKED') covers a NULL
-- status (the old INSERT always wrote BOOKED, but the column allowed
-- NULL). ON CONFLICT DO NOTHING makes the move safe if the table was
-- already populated (e.g. a re-run after a partial apply); the
-- following DELETE still removes the phantom row, since its data is
-- already in shipping_bookings.
INSERT INTO shipping_bookings (
  booking_id, shipment_id, carrier, container_number, seal_number,
  origin, destination, estimated_departure, actual_departure,
  estimated_arrival, actual_arrival, delivery_date, status,
  created_at, updated_at
)
SELECT
  shipment_id, contract_id, carrier, container_number, seal_number,
  origin, destination, estimated_departure, actual_departure,
  estimated_arrival, actual_arrival, delivery_date,
  COALESCE(status, 'BOOKED'), created_at, updated_at
FROM shipments
WHERE shipment_id LIKE 'BOOK-%'
ON CONFLICT (booking_id) DO NOTHING;

DELETE FROM shipments WHERE shipment_id LIKE 'BOOK-%';
