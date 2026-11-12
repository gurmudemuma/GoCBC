-- Migration 071: extend the shipments status CHECKs with the new
-- INSPECTION_COMPLETE shipment state.
--
-- The chaincode worker added INSPECTION_COMPLETE to the closed shipment
-- set (chaincodes/coffee/main.go validShipmentStatuses): it is set by
-- ApproveQualityInspection (chaincodes/coffee/quality.go) when an
-- inspection is APPROVED, moving the linked shipment out of
-- INSPECTION_PENDING, and the IssueCBEExportPermit cascade
-- (chaincodes/coffee/permit.go) then advances it to PERMIT_ISSUED.
-- Until this migration runs, any Postgres mirror of that state would
-- fail with "new row for relation \"shipments\" violates check
-- constraint \"chk_shipments_status\"" — the same class of omission
-- migration 060 fixed for ARRIVED / CUSTOMS_DECLARED.
--
-- Both CHECKs are redefined with the full 060 value set plus
-- 'INSPECTION_COMPLETE' (placed right after 'INSPECTION_PENDING', the
-- state it follows). No stored value is excluded by this migration.
-- NOTE: the legacy customs_declarations 'INSPECTION_COMPLETE' mentioned
-- in migration 059 is a different entity's old status (remapped there
-- to UNDER_REVIEW) and is not touched here.
--
-- The runner (api/src/utils/runMigrations.ts) reads this directory
-- sorted by filename and tracks applied files by name in
-- _schema_migrations, so 071 runs once, after 070. NOT applied by
-- this change — file only.

-- 1. Shipments: INSPECTION_COMPLETE (set by ApproveQualityInspection).
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS chk_shipments_status;
ALTER TABLE shipments
  ADD CONSTRAINT chk_shipments_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'INSPECTION_COMPLETE', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED',
                    'ARRIVED', 'DELIVERED', 'LOADED', 'CANCELLED',
                    'QUALITY_PENDING', 'COMPLETED'));

-- 2. Shipment status history mirrors shipments.status: same values
--    including INSPECTION_COMPLETE.
ALTER TABLE shipment_status_history DROP CONSTRAINT IF EXISTS chk_shipment_status_history_status;
ALTER TABLE shipment_status_history
  ADD CONSTRAINT chk_shipment_status_history_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'INSPECTION_COMPLETE', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED',
                    'ARRIVED', 'DELIVERED', 'LOADED', 'CANCELLED',
                    'QUALITY_PENDING', 'COMPLETED'));
