-- Migration 077: add export_permit_no to quality_inspections (probe #6)
--
-- POST /quality/inspections/:id/issue-permit writes the issued permit
-- number back to the inspection row (quality.ts issue-permit handler),
-- and the inspection list/detail endpoints already read
-- insp.export_permit_no — but no migration ever added the column, so
-- the unguarded mirror UPDATE failed with
--   column "export_permit_no" of relation "quality_inspections" does not exist
-- AFTER the ledger permit had already issued (shipment PERMIT_ISSUED
-- on-chain), aborting the handler with HTTP 500 and leaving PG stale
-- (inspection APPROVED, shipment INSPECTION_COMPLETE, no export_permits
-- row, auto customs-declaration trigger never run).
-- Idempotent: IF NOT EXISTS, no data is altered. Verified against the
-- live dev database before landing: the column does not exist there.
-- Applied to the live DB by hand (psql + _schema_migrations row) at
-- the same time this file landed, so the API does not re-apply it.

ALTER TABLE quality_inspections
  ADD COLUMN IF NOT EXISTS export_permit_no VARCHAR(100);
