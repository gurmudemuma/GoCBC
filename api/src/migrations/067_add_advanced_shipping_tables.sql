-- Migration 067: Add Advanced Shipping Tables
-- 
-- Purpose: Support advanced shipping operations including Bill of Lading,
--          booking amendments, container allocations, and stuffing reports
--
-- Created: 2026-11-10

-- ============================================================================
-- BILLS OF LADING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills_of_lading (
  id SERIAL PRIMARY KEY,
  bl_id VARCHAR(100) UNIQUE NOT NULL,
  bl_number VARCHAR(100) UNIQUE NOT NULL,
  bl_type VARCHAR(50) NOT NULL CHECK (bl_type IN ('NEGOTIABLE', 'NON_NEGOTIABLE', 'SEA_WAYBILL', 'MASTER_BL', 'HOUSE_BL')),
  booking_id VARCHAR(100),
  shipper VARCHAR(255) NOT NULL,
  consignee VARCHAR(255) NOT NULL,
  notify_party VARCHAR(255),
  port_of_loading VARCHAR(255),
  port_of_discharge VARCHAR(255),
  vessel_name VARCHAR(255),
  voyage_number VARCHAR(100),
  container_numbers TEXT,
  seal_numbers TEXT,
  cargo_description TEXT,
  package_count INTEGER DEFAULT 0,
  gross_weight DECIMAL(10, 2) DEFAULT 0,
  measurement DECIMAL(10, 2) DEFAULT 0,
  freight_terms VARCHAR(50) DEFAULT 'PREPAID',
  number_of_originals INTEGER DEFAULT 3,
  issued_at VARCHAR(255),
  issue_date TIMESTAMP NOT NULL,
  on_board_date TIMESTAMP,
  issued_by VARCHAR(100),
  surrendered BOOLEAN DEFAULT FALSE,
  surrender_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ISSUED',
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bl_id ON bills_of_lading(bl_id);
CREATE INDEX IF NOT EXISTS idx_bl_number ON bills_of_lading(bl_number);
CREATE INDEX IF NOT EXISTS idx_bl_booking_id ON bills_of_lading(booking_id);
CREATE INDEX IF NOT EXISTS idx_bl_type ON bills_of_lading(bl_type);
CREATE INDEX IF NOT EXISTS idx_bl_status ON bills_of_lading(status);

COMMENT ON TABLE bills_of_lading IS 'Bills of Lading records for cargo shipments';

-- ============================================================================
-- BOOKING AMENDMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_amendments (
  id SERIAL PRIMARY KEY,
  amendment_id VARCHAR(100) UNIQUE NOT NULL,
  booking_id VARCHAR(100) NOT NULL,
  amendment_reason TEXT NOT NULL,
  amended_by VARCHAR(100),
  old_vessel_name VARCHAR(255),
  new_vessel_name VARCHAR(255),
  old_voyage_number VARCHAR(100),
  new_voyage_number VARCHAR(100),
  old_departure TIMESTAMP,
  new_departure TIMESTAMP,
  old_arrival TIMESTAMP,
  new_arrival TIMESTAMP,
  old_container_type VARCHAR(50),
  new_container_type VARCHAR(50),
  old_container_count INTEGER,
  new_container_count INTEGER,
  additional_notes TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_by VARCHAR(100),
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_amendments_booking_id ON booking_amendments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_amendments_status ON booking_amendments(status);

COMMENT ON TABLE booking_amendments IS 'Booking amendment requests and approvals';

-- ============================================================================
-- CONTAINER ALLOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS container_allocations (
  id SERIAL PRIMARY KEY,
  container_id VARCHAR(100) UNIQUE NOT NULL,
  booking_id VARCHAR(100) NOT NULL,
  container_number VARCHAR(100) NOT NULL,
  container_type VARCHAR(50) NOT NULL,
  size_type VARCHAR(20) NOT NULL CHECK (size_type IN ('20FT', '40FT', '40HC', '45FT', '20RF', '40RF')),
  condition VARCHAR(50) DEFAULT 'GOOD' CHECK (condition IN ('GOOD', 'DAMAGED', 'UNDER_REPAIR')),
  allocated_by VARCHAR(100),
  allocated_date TIMESTAMP NOT NULL,
  released_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ALLOCATED' CHECK (status IN ('ALLOCATED', 'STUFFED', 'LOADED', 'DISCHARGED', 'RELEASED')),
  blockchain_tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_container_allocations_booking_id ON container_allocations(booking_id);
CREATE INDEX IF NOT EXISTS idx_container_allocations_container_number ON container_allocations(container_number);
CREATE INDEX IF NOT EXISTS idx_container_allocations_status ON container_allocations(status);

COMMENT ON TABLE container_allocations IS 'Container assignments to bookings';

-- ============================================================================
-- CONTAINER STUFFING REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS container_stuffing_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(100) UNIQUE NOT NULL,
  container_id VARCHAR(100) NOT NULL,
  container_number VARCHAR(100) NOT NULL,
  stuffing_date TIMESTAMP NOT NULL,
  stuffing_location VARCHAR(255),
  cargo_description TEXT,
  package_count INTEGER DEFAULT 0,
  gross_weight DECIMAL(10, 2) DEFAULT 0,
  net_weight DECIMAL(10, 2) DEFAULT 0,
  volume_cbm DECIMAL(10, 2) DEFAULT 0,
  seal_number VARCHAR(100),
  stuffing_supervisor VARCHAR(100),
  photo_urls JSONB DEFAULT '[]',
  remarks TEXT,
  reported_by VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(100),
  verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stuffing_reports_container_id ON container_stuffing_reports(container_id);
CREATE INDEX IF NOT EXISTS idx_stuffing_reports_container_number ON container_stuffing_reports(container_number);
CREATE INDEX IF NOT EXISTS idx_stuffing_reports_stuffing_date ON container_stuffing_reports(stuffing_date);

COMMENT ON TABLE container_stuffing_reports IS 'Container stuffing/loading reports with cargo details';

-- ============================================================================
-- ALTER EXISTING shipping_bookings TABLE
-- ============================================================================

-- Add cancellation columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipping_bookings' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE shipping_bookings ADD COLUMN cancellation_reason TEXT;
    ALTER TABLE shipping_bookings ADD COLUMN cancelled_by VARCHAR(100);
    ALTER TABLE shipping_bookings ADD COLUMN cancellation_date TIMESTAMP;
  END IF;
END $$;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger for bills_of_lading updated_at
CREATE OR REPLACE FUNCTION update_bills_of_lading_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bills_of_lading_updated_at_trigger ON bills_of_lading;
CREATE TRIGGER bills_of_lading_updated_at_trigger
  BEFORE UPDATE ON bills_of_lading
  FOR EACH ROW
  EXECUTE FUNCTION update_bills_of_lading_timestamp();

-- Trigger for container_allocations updated_at
CREATE OR REPLACE FUNCTION update_container_allocations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS container_allocations_updated_at_trigger ON container_allocations;
CREATE TRIGGER container_allocations_updated_at_trigger
  BEFORE UPDATE ON container_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_container_allocations_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADVANCED SHIPPING TABLES CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '1. bills_of_lading - B/L records (all types)';
  RAISE NOTICE '2. booking_amendments - Booking changes';
  RAISE NOTICE '3. container_allocations - Container assignments';
  RAISE NOTICE '4. container_stuffing_reports - Stuffing reports';
  RAISE NOTICE '';
  RAISE NOTICE 'New API endpoints available:';
  RAISE NOTICE '- POST /api/v1/shipping/bookings/:bookingId/bill-of-lading/issue';
  RAISE NOTICE '- PUT /api/v1/shipping/bookings/:bookingId/amend';
  RAISE NOTICE '- DELETE /api/v1/shipping/bookings/:bookingId/cancel';
  RAISE NOTICE '- POST /api/v1/shipping/bookings/:bookingId/containers/allocate';
  RAISE NOTICE '- POST /api/v1/shipping/containers/:containerId/stuffing-report';
  RAISE NOTICE '- GET /api/v1/shipping/bills-of-lading';
  RAISE NOTICE '';
END $$;
