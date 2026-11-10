-- Migration 059: add CHECK constraints on status columns.
--
-- 2026-11-10 HOST FIX: this file first failed on the live Docker host
-- (error 23514, chk_quality_inspections_status) because the CHECK sets
-- below were built from the current code + an empty test DB, while the
-- host's real rows were written by the pre-fix code and hold statuses
-- the sets omitted. Fixed here (verified by reproducing the failure on
-- a seeded test DB before editing):
--   quality_inspections 'SCHEDULED' — written by the old qualityService
--     schedule mirror; the set now matches migration 061 exactly.
--   shipments / shipment_status_history 'ARRIVED' + 'CUSTOMS_DECLARED'
--     — written by the booking arrive handler / SubmitCustomsDeclaration;
--     the set now matches migration 060 exactly. (059 runs before 060,
--     so 059 must already contain them.)
--   customs_declarations 'INSPECTING' / 'INSPECTION_COMPLETE' — written
--     by the old customsService / customs route; the current machine
--     uses UNDER_INSPECTION / UNDER_REVIEW instead, so the legacy rows
--     are NORMALISED to those values just below (INSPECTING ->
--     UNDER_INSPECTION, INSPECTION_COMPLETE -> UNDER_REVIEW) instead of
--     being frozen into the CHECK. The runner wraps each file in a
--     transaction, so the host's failed run rolled back cleanly and a
--     re-run of this corrected file applies from scratch.
--
-- TEST-STATUS-MATRIX §17 #13: Postgres had no live CHECK or enum on any
-- status column in the 15 matrix entities — every status column was an
-- unrestricted VARCHAR, so a typo or a stale lowercase write silently
-- created a state no state machine produces. The legitimate set per
-- column below is the union of the chaincode-assigned values, the
-- statusManager tables (api/src/utils/statusManager.ts) and the values
-- current API code writes. CHECKs pass on NULL, so nullable columns need
-- no explicit NULL arm.
--
-- Stored values verified against the live DB before writing this file
-- (2026-11-09; 47 migrations applied, test data only). Every stored value
-- is inside its CHECK set — see the per-column notes for the out-of-machine
-- values that were deliberately KEPT, not excluded:
--   shipments.status 'BOOKED'            — shipping.ts inserts one
--     shipments row per freight booking with status BOOKED (2 rows).
--   shipments.status 'REGISTERED'        — shipmentService.createShipment
--     inserts the PG row as REGISTERED (a second create path beside the
--     route, which writes CREATED; no REGISTERED rows stored right now).
--   forex_allocations.status 'APPROVED'   — legacy rows from the old NBE
--     approve route, which wrote PG-only APPROVED before it was fixed to
--     write CONFIRMED (matrix §4); no new rows are written.
--   forex_allocations.status 'REPATRIATED' — PG-only terminal marker
--     written by the NBE repatriation handler (nbe.ts); chaincode has no
--     such forex state. No rows stored right now.
--   forex_allocations.retention_status '' — the initial value: RequestForex
--     never sets RetentionStatus (forex.go), so rows start empty (3 rows).
--   forex_repatriations.status 'COMPLETED' — PG-only completion marker
--     written by the NBE repatriation handler (nbe.ts); the chaincode
--     repatriation machine has no COMPLETED (2 rows).
--   post_delivery_tracking.status 'pending' — orphan column, never written
--     by any code (matrix §15); its only observed value is its lowercase
--     default (4 rows). The CHECK freezes it to that value.
--   exporters.license_status: the live chk_license_status CHECK omits
--     REVOKED (matrix §2 claimed it allowed REVOKED — it does not), so a
--     REVOKED licence could never be mirrored to PG. It is dropped and
--     recreated with REVOKED below.
--
-- Defaults fixed in the same pass (same class as migration 058 — a default
-- outside the CHECK set would make the next INSERT fail):
--   forex_allocations.status 'pending' (lowercase) -> 'REQUESTED'
--   customs_declarations.status 'pending'          -> 'SUBMITTED'
--   customs_clearances.status 'pending'            -> 'SUBMITTED'
--   ecx_lots.status 'AVAILABLE'                    -> 'WAREHOUSED'
--     (AVAILABLE is the dead value the audit removed from the intake
--     mirror; the route now writes WAREHOUSED explicitly)
--   documentary_collections.status 'PENDING'       -> 'SENT'
--     (the chaincode collection machine starts at SENT)
-- Deliberately NOT constrained here (value set unknown or out of scope):
--   post_delivery_tracking.quality_recheck_status (all NULL, no writer in
--     code), users/documents/audit status columns (not matrix entities),
--   blockchain_* mirror tables, swift/border tables (do not exist).

-- 1. Contracts (chaincode main.go: REGISTERED/APPROVED/REJECTED;
--    CANCELLED is the PG-only cancel route; PENDING is the 058 default).
ALTER TABLE contracts
  ADD CONSTRAINT chk_contracts_status
  CHECK (status IN ('PENDING', 'REGISTERED', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- 2. Exporter applications (lowercase by design; no chaincode entity).
ALTER TABLE exporter_applications
  ADD CONSTRAINT chk_exporter_applications_status
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Exporter licences (chaincode main.go UpdateExporterStatus /
--    SuspendExporter / RevokeExporterLicense / RenewExporterLicense).
--    The existing CHECK omits REVOKED; replace it.
ALTER TABLE exporters DROP CONSTRAINT IF EXISTS chk_license_status;
ALTER TABLE exporters
  ADD CONSTRAINT chk_license_status
  CHECK (license_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'));

-- 4. Letters of credit (chaincode banking.go UpdateLCStatus table;
--    PENDING is the 058 default).
ALTER TABLE letters_of_credit
  ADD CONSTRAINT chk_letters_of_credit_status
  CHECK (status IN ('PENDING', 'REQUESTED', 'APPROVED', 'REJECTED', 'ISSUED',
                    'FOREX_ALLOCATED', 'AMENDED', 'UTILIZED', 'PAYMENT_RELEASED',
                    'SETTLED', 'EXPIRED'));

-- 5. Forex allocations (chaincode forex.go; APPROVED is legacy, REPATRIATED
--    is the PG-only NBE marker — see header).
ALTER TABLE forex_allocations ALTER COLUMN status SET DEFAULT 'REQUESTED';
ALTER TABLE forex_allocations
  ADD CONSTRAINT chk_forex_allocations_status
  CHECK (status IN ('REQUESTED', 'CONFIRMED', 'ALLOCATED', 'UTILIZED',
                    'APPROVED', 'REPATRIATED'));

-- 6. Forex retention status (chaincode forex.go RecordForexRetention;
--    '' is the initial value — RequestForex never sets it).
ALTER TABLE forex_allocations
  ADD CONSTRAINT chk_forex_allocations_retention_status
  CHECK (retention_status IN ('', 'PENDING', 'COMPLIED', 'NON_COMPLIANT'));

-- 7. Quality inspections (API machine quality.ts + REQUESTED, which the
--    perform route accepts as a from-state for inspection-flow rows;
--    SCHEDULED is written by the schedule mirror — see header, 2026-11-10
--    host fix; this set now matches migration 061 exactly).
ALTER TABLE quality_inspections
  ADD CONSTRAINT chk_quality_inspections_status
  CHECK (status IN ('PENDING', 'REQUESTED', 'SCHEDULED', 'SAMPLE_COLLECTED',
                    'INSPECTED', 'APPROVED', 'REJECTED', 'PERMIT_ISSUED',
                    'CERTIFICATE_ISSUED', 'COMPLETED'));

-- 8. Shipments (chaincode main.go lifecycle + BOOKED/REGISTERED, see header;
--    CUSTOMS_REJECTED is the customsService mirror of the chaincode cascade,
--    INSPECTION_PENDING is set by chaincode RequestInspection. The
--    QUALITY_PENDING / QUALITY_APPROVED / QUALITY_REJECTED / COMPLETED
--    phase vocabulary from the statusManager comment has no writer and no
--    stored rows, so it is NOT in the set — a future writer must extend it.)
ALTER TABLE shipments
  ADD CONSTRAINT chk_shipments_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'ARRIVED',
                    'DELIVERED', 'LOADED', 'CANCELLED'));

-- 9. Shipment logistics status (shipmentService.validLogisticsStatuses).
ALTER TABLE shipments
  ADD CONSTRAINT chk_shipments_logistics_status
  CHECK (logistics_status IN ('PENDING', 'BOOKED', 'LOADED', 'DEPARTED',
                              'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CONFIRMED'));

-- 10. Customs declarations (chaincode customs.go). Legacy rows written
--    by the pre-fix code use INSPECTING / INSPECTION_COMPLETE, which exist
--    in no current state machine — normalise them to the current machine
--    (INSPECTING -> UNDER_INSPECTION, INSPECTION_COMPLETE -> UNDER_REVIEW)
--    before adding the CHECK, so the rows stay usable by the current
--    review/complete routes. See header, 2026-11-10 host fix.
UPDATE customs_declarations SET status = 'UNDER_INSPECTION' WHERE status = 'INSPECTING';
UPDATE customs_declarations SET status = 'UNDER_REVIEW' WHERE status = 'INSPECTION_COMPLETE';
ALTER TABLE customs_declarations ALTER COLUMN status SET DEFAULT 'SUBMITTED';
ALTER TABLE customs_declarations
  ADD CONSTRAINT chk_customs_declarations_status
  CHECK (status IN ('SUBMITTED', 'UNDER_INSPECTION', 'UNDER_REVIEW', 'CLEARED', 'REJECTED'));

-- 11. Customs clearances (same machine; the create route takes a
--     caller-supplied status defaulting to SUBMITTED).
ALTER TABLE customs_clearances ALTER COLUMN status SET DEFAULT 'SUBMITTED';
ALTER TABLE customs_clearances
  ADD CONSTRAINT chk_customs_clearances_status
  CHECK (status IN ('SUBMITTED', 'UNDER_INSPECTION', 'UNDER_REVIEW', 'CLEARED', 'REJECTED'));

-- 12. Payments — the chaincode settlement machine (payment.go) AND the
--     PG-only retention/split machine share this one column (matrix §17 #8):
--     the settle mirror writes SETTLED over any retention state on the row.
--     No separate retention column exists, so both machines are in the set
--     and the clobber is a known limitation, documented in the matrix.
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_status
  CHECK (status IN ('PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'REJECTED',
                    'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SWIFT_FAILED',
                    'SETTLED', 'DOCUMENTS_RELEASED', 'COMPLETED', 'CANCELLED',
                    'RECEIVED', 'SPLIT', 'RETENTION_CONVERTED', 'RELEASED'));

-- 13. Payment tracking status (payments.ts tracking-status validator).
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_tracking_status
  CHECK (payment_tracking_status IN ('PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED',
                                     'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED'));

-- 14. Forex repatriations (chaincode repatriation.go; COMPLETED is the
--     PG-only NBE handler marker — see header).
ALTER TABLE forex_repatriations
  ADD CONSTRAINT chk_forex_repatriations_status
  CHECK (status IN ('PENDING', 'PARTIAL', 'READY_FOR_VERIFICATION', 'OVERDUE',
                    'COMPLIED', 'NON_COMPLIANT', 'WAIVED', 'COMPLETED'));

-- 15. Export proceeds repatriation (dead table, no writes; chaincode set).
ALTER TABLE export_proceeds_repatriation
  ADD CONSTRAINT chk_export_proceeds_repatriation_status
  CHECK (status IN ('PENDING', 'PARTIAL', 'READY_FOR_VERIFICATION', 'OVERDUE',
                    'COMPLIED', 'NON_COMPLIANT', 'WAIVED'));

-- 16. ECX lots (chaincode ecx.go).
ALTER TABLE ecx_lots ALTER COLUMN status SET DEFAULT 'WAREHOUSED';
ALTER TABLE ecx_lots
  ADD CONSTRAINT chk_ecx_lots_status
  CHECK (status IN ('WAREHOUSED', 'GRADED', 'ASSIGNED', 'RELEASED', 'REJECTED'));

-- 17. Export permits (chaincode permit.go; PENDING is the 058 default).
ALTER TABLE export_permits
  ADD CONSTRAINT chk_export_permits_status
  CHECK (status IN ('PENDING', 'ISSUED', 'UTILIZED', 'SETTLED'));

-- 18. Phytosanitary certificates (chaincode phytosanitary.go; PENDING is
--     the 058 default. EXPIRED is comment-only on-chain — never assigned.)
ALTER TABLE phytosanitary_certificates
  ADD CONSTRAINT chk_phytosanitary_certificates_status
  CHECK (status IN ('PENDING', 'ISSUED', 'REVOKED'));

-- 19. Post-delivery overall status (Postgres-only machine, statusManager
--     POST_DELIVERY; DELAYED is computed at read time, ISSUE is stored by
--     the close guard).
ALTER TABLE post_delivery_tracking
  ADD CONSTRAINT chk_post_delivery_overall_status
  CHECK (overall_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ISSUE'));

-- 20. Post-delivery status (orphan column, never written — see header).
ALTER TABLE post_delivery_tracking
  ADD CONSTRAINT chk_post_delivery_status
  CHECK (status IN ('pending'));

-- 21. Shipment status history (mirrors shipments.status values).
ALTER TABLE shipment_status_history
  ADD CONSTRAINT chk_shipment_status_history_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'ARRIVED',
                    'DELIVERED', 'LOADED', 'CANCELLED'));

-- 22. LC discrepancies (chaincode banking.go Resolve/WaiveLCDiscrepancy).
ALTER TABLE lc_discrepancies
  ADD CONSTRAINT chk_lc_discrepancies_status
  CHECK (status IN ('OPEN', 'RESOLVED', 'WAIVED'));

-- 23. Documentary collections (chaincode collection.go / payment.go
--     UpdateCADStatus target set; default PENDING -> SENT, the chaincode
--     start state).
ALTER TABLE documentary_collections ALTER COLUMN status SET DEFAULT 'SENT';
ALTER TABLE documentary_collections
  ADD CONSTRAINT chk_documentary_collections_status
  CHECK (status IN ('SENT', 'FORWARDED', 'PRESENTED', 'ACCEPTED', 'PAID',
                    'REJECTED', 'RETURNED'));
