-- Migration 063: split the payments dual machine (TEST-STATUS-MATRIX §17 #8).
--
-- payments.status carried two state machines at once: the chaincode
-- settlement machine (PENDING → DOCUMENTS_SUBMITTED → VERIFIED →
-- SETTLED → DOCUMENTS_RELEASED → COMPLETED) and the PG-only NBE
-- retention machine (RECEIVED → SPLIT → RETENTION_CONVERTED →
-- RELEASED). The settle mirror wrote SETTLED over any retention state
-- on the same row, silently losing it — a payment whose 40% retention
-- had been converted looked merely "settled", and a released payment
-- looked nothing like settled.
--
-- The settlement machine stays on status (it is what the chaincode
-- writes and what statusManager validates). The retention machine moves
-- to the new retention_status column. Both columns are independently
-- CHECK-constrained; the settle mirror now only ever writes status, so
-- it can no longer clobber retention state.
--
-- Backfill: a row already RELEASED is fully settled AND fully released,
-- so it becomes status SETTLED + retention RELEASED. A row in an
-- earlier retention state had its documents verified on-chain before
-- the PG insert (recordPayment verifies, then inserts), so it becomes
-- status VERIFIED + its retention state unchanged.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS retention_status VARCHAR(50);

UPDATE payments SET retention_status = status
  WHERE status IN ('RECEIVED', 'SPLIT', 'RETENTION_CONVERTED', 'RELEASED');
UPDATE payments SET status = 'SETTLED'
  WHERE status = 'RELEASED';
UPDATE payments SET status = 'VERIFIED'
  WHERE status IN ('RECEIVED', 'SPLIT', 'RETENTION_CONVERTED');

-- Narrow the status CHECK to the settlement machine only. (059 had the
-- union of both machines with a comment acknowledging the dual use;
-- that union is what let the clobber happen.)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_status;
ALTER TABLE payments ADD CONSTRAINT chk_payments_status CHECK (status IN (
  'PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'REJECTED',
  'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SWIFT_FAILED',
  'SETTLED', 'CONFIRMED', 'DOCUMENTS_RELEASED', 'COMPLETED', 'CANCELLED'
));

ALTER TABLE payments ADD CONSTRAINT chk_payments_retention_status CHECK (
  retention_status IS NULL OR retention_status IN (
    'RECEIVED', 'SPLIT', 'RETENTION_CONVERTED', 'RELEASED'
  )
);
