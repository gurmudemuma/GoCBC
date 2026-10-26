-- Migration 043: Fix Status Enums for Shipments and Payments
-- Purpose: Align frontend and backend status values
-- Date: 2026-10-23

-- ============================================================================
-- SHIPMENT STATUS STANDARDIZATION
-- ============================================================================

-- Add logistics_status column for shipping tracking (separate from registration status)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS logistics_status VARCHAR(50) DEFAULT 'PENDING';

-- Update existing shipment status values to match backend service
-- Backend uses: REGISTERED, QUALITY_PENDING
-- Frontend needs: CREATED, BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED, SHIPPED

-- Strategy: Keep backend status for workflow, add logistics_status for shipping tracking

-- Valid shipment statuses (workflow):
-- - DRAFT: Initial creation (not yet registered)
-- - REGISTERED: Officially registered with authorities
-- - QUALITY_PENDING: Waiting for quality inspection
-- - QUALITY_APPROVED: Quality inspection passed
-- - QUALITY_REJECTED: Quality inspection failed
-- - CUSTOMS_CLEARED: Customs clearance granted
-- - COMPLETED: Shipment delivered and confirmed

-- Valid logistics statuses (tracking):
-- - PENDING: Not yet booked
-- - BOOKED: Shipping booked
-- - LOADED: Loaded onto vessel/aircraft
-- - DEPARTED: Departed from origin port
-- - IN_TRANSIT: Currently in transit
-- - ARRIVED: Arrived at destination port
-- - DELIVERED: Delivered to buyer
-- - CONFIRMED: Delivery confirmed by buyer

COMMENT ON COLUMN shipments.status IS 'Workflow status: DRAFT, REGISTERED, QUALITY_PENDING, QUALITY_APPROVED, QUALITY_REJECTED, CUSTOMS_CLEARED, COMPLETED';
COMMENT ON COLUMN shipments.logistics_status IS 'Logistics tracking status: PENDING, BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED, CONFIRMED';

-- ============================================================================
-- PAYMENT STATUS STANDARDIZATION
-- ============================================================================

-- Update payment status column comment to reflect actual backend values
-- Backend uses: RECEIVED, SPLIT, RETENTION_CONVERTED, RELEASED
-- These are the authoritative status values

-- Valid payment statuses:
-- - PENDING: Payment not yet received
-- - RECEIVED: Payment received from buyer
-- - SPLIT: Payment split into release (60%) and retention (40%)
-- - RETENTION_CONVERTED: Retention amount converted to USD
-- - RELEASED: Payment released to exporter
-- - COMPLETED: Payment fully processed and closed

COMMENT ON COLUMN payments.status IS 'Payment status: PENDING, RECEIVED, SPLIT, RETENTION_CONVERTED, RELEASED, COMPLETED';

-- Add payment_tracking_status for document workflow (separate from payment processing)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_tracking_status VARCHAR(50) DEFAULT 'PENDING';

COMMENT ON COLUMN payments.payment_tracking_status IS 'Document tracking: PENDING, DOCUMENTS_SUBMITTED, VERIFIED, SWIFT_INITIATED, SWIFT_RECEIVED, SETTLED';

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Migrate any old shipment status values
UPDATE shipments SET status = 'REGISTERED' WHERE status IN ('created', 'CREATED');
UPDATE shipments SET status = 'QUALITY_PENDING' WHERE status IN ('quality_pending', 'pending');
UPDATE shipments SET status = 'COMPLETED' WHERE status IN ('delivered', 'DELIVERED', 'completed', 'COMPLETED');

-- Set logistics_status based on current status
UPDATE shipments SET logistics_status = 'PENDING' WHERE status = 'DRAFT';
UPDATE shipments SET logistics_status = 'BOOKED' WHERE status = 'REGISTERED';
UPDATE shipments SET logistics_status = 'IN_TRANSIT' WHERE status IN ('QUALITY_APPROVED', 'CUSTOMS_CLEARED');
UPDATE shipments SET logistics_status = 'DELIVERED' WHERE status = 'COMPLETED';

-- Migrate any old payment status values to backend standard
UPDATE payments SET status = 'PENDING' WHERE status IN ('draft', 'DRAFT', 'pending', 'PENDING');
UPDATE payments SET status = 'RECEIVED' WHERE status IN ('received', 'RECEIVED', 'paid', 'PAID');
UPDATE payments SET status = 'RELEASED' WHERE status IN ('released', 'RELEASED', 'settled', 'SETTLED', 'completed', 'COMPLETED');

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shipments_logistics_status ON shipments(logistics_status);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_status ON payments(payment_tracking_status);

-- ============================================================================
-- VALIDATION (Optional - uncomment if you want strict validation)
-- ============================================================================

-- Uncomment to add CHECK constraints for strict validation:

-- ALTER TABLE shipments DROP CONSTRAINT IF EXISTS chk_shipment_status;
-- ALTER TABLE shipments ADD CONSTRAINT chk_shipment_status 
--     CHECK (status IN ('DRAFT', 'REGISTERED', 'QUALITY_PENDING', 'QUALITY_APPROVED', 'QUALITY_REJECTED', 'CUSTOMS_CLEARED', 'COMPLETED'));

-- ALTER TABLE shipments DROP CONSTRAINT IF EXISTS chk_logistics_status;
-- ALTER TABLE shipments ADD CONSTRAINT chk_logistics_status 
--     CHECK (logistics_status IN ('PENDING', 'BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CONFIRMED'));

-- ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status;
-- ALTER TABLE payments ADD CONSTRAINT chk_payment_status 
--     CHECK (status IN ('PENDING', 'RECEIVED', 'SPLIT', 'RETENTION_CONVERTED', 'RELEASED', 'COMPLETED'));

-- ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_tracking_status;
-- ALTER TABLE payments ADD CONSTRAINT chk_payment_tracking_status 
--     CHECK (payment_tracking_status IN ('PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED'));
