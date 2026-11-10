-- Migration 060: extend the 059 status CHECKs with legitimate states the
-- 059 sets omitted.
--
-- Found by the 2026-11-09 handoff live run (HANDOFF1447): step 33
-- (booking arrive) returned 500 "new row for relation \"shipments\"
-- violates check constraint \"chk_shipments_status\"" — the arrive handler
-- (shipping.ts:562-573) writes 'ARRIVED' to shipments.status, a value
-- the chaincode closed set (main.go validShipmentStatuses), the shipments
-- status-update validator and the logistics machine all accept, but 059
-- left out of the CHECK because no stored row had it yet. A CHECK must
-- cover the values the code writes, not only the values stored so far.
--
-- The same class of omission applies to the other states below: each is
-- assigned by the chaincode (the 059 header's stated principle is that
-- the set is the union of chaincode-assigned values, the statusManager
-- tables and the values API code writes) and would break the first PG
-- mirror that writes it. All are added here with the reason each is
-- legitimate; no stored value is excluded by this migration.
--
--   shipments.status 'ARRIVED' — written by the booking arrive handler
--     (shipping.ts) and accepted by the chaincode validShipmentStatuses
--     set. Proven missing by the handoff run, step 33.
--   shipments.status 'CUSTOMS_DECLARED' — assigned on-chain by
--     SubmitCustomsDeclaration (customs.go) and present in the
--     statusManager SHIPMENT table; no API mirror writes it yet, but a
--     mirror would be rejected without it.
--   shipment_status_history.status — mirrors shipments.status; same two
--     values added for the same reason.
--   forex_allocations.status 'REJECTED' — assigned on-chain by the new
--     RejectForex (forex.go) and now mirrored to PG by the banking forex
--     reject route (banking.ts), matching the NBE approve route's mirror.
--   contracts.status 'COMPLETED' — assigned on-chain by CompleteContract
--     / UpdateContractStatus (main.go); closeContract calls it on-chain.
--     No contracts PG row is written today (contract create writes no PG
--     row), but the state is legitimate and a future mirror must not fail.
--   payments.status 'CONFIRMED' — assigned on-chain by the new
--     ConfirmSettlement (payment.go, SETTLED -> CONFIRMED). The settle
--     route mirrors SETTLED to PG today; CONFIRMED is the next state of
--     the same machine.
--   phytosanitary_certificates.status 'INSPECTED' — assigned on-chain by
--     the new InspectPhytosanitaryCertificate (phytosanitary.go,
--     PENDING -> INSPECTED). The phyto inspect route is chaincode-only
--     today (no PG mirror), but the state is legitimate for this entity.
--
-- Every statement is idempotent in the sense that re-running it fails
-- loudly on the duplicate constraint name rather than silently
-- double-applying; the runner tracks this file by name, so it runs once.

-- 1. Shipments: ARRIVED (proven) + CUSTOMS_DECLARED (chaincode-assigned)
--    + QUALITY_PENDING and COMPLETED (found in host DB with actual data).
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS chk_shipments_status;
ALTER TABLE shipments
  ADD CONSTRAINT chk_shipments_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED',
                    'ARRIVED', 'DELIVERED', 'LOADED', 'CANCELLED',
                    'QUALITY_PENDING', 'COMPLETED'));

-- 2. Shipment status history mirrors shipments.status: same values including
--    QUALITY_PENDING and COMPLETED.
ALTER TABLE shipment_status_history DROP CONSTRAINT IF EXISTS chk_shipment_status_history_status;
ALTER TABLE shipment_status_history
  ADD CONSTRAINT chk_shipment_status_history_status
  CHECK (status IN ('CREATED', 'REGISTERED', 'FREIGHT_BOOKED', 'BOOKED',
                    'PERMIT_ISSUED', 'CUSTOMS_CLEARED', 'CUSTOMS_REJECTED',
                    'CUSTOMS_DECLARED', 'INSPECTION_PENDING', 'LAND_TRANSPORT',
                    'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED',
                    'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED',
                    'ARRIVED', 'DELIVERED', 'LOADED', 'CANCELLED',
                    'QUALITY_PENDING', 'COMPLETED'));

-- 3. Forex allocations: REJECTED (new RejectForex + PG mirror).
ALTER TABLE forex_allocations DROP CONSTRAINT IF EXISTS chk_forex_allocations_status;
ALTER TABLE forex_allocations
  ADD CONSTRAINT chk_forex_allocations_status
  CHECK (status IN ('REQUESTED', 'CONFIRMED', 'ALLOCATED', 'UTILIZED',
                    'APPROVED', 'REPATRIATED', 'REJECTED'));

-- 4. Contracts: COMPLETED (new CompleteContract / UpdateContractStatus).
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_status;
ALTER TABLE contracts
  ADD CONSTRAINT chk_contracts_status
  CHECK (status IN ('PENDING', 'REGISTERED', 'APPROVED', 'REJECTED',
                    'CANCELLED', 'COMPLETED'));

-- 5. Payments: CONFIRMED (new ConfirmSettlement, SETTLED -> CONFIRMED).
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_status;
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_status
  CHECK (status IN ('PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'REJECTED',
                    'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SWIFT_FAILED',
                    'SETTLED', 'CONFIRMED', 'DOCUMENTS_RELEASED', 'COMPLETED',
                    'CANCELLED', 'RECEIVED', 'SPLIT', 'RETENTION_CONVERTED',
                    'RELEASED'));

-- 6. Phytosanitary certificates: INSPECTED (new InspectPhytosanitaryCertificate).
ALTER TABLE phytosanitary_certificates DROP CONSTRAINT IF EXISTS chk_phytosanitary_certificates_status;
ALTER TABLE phytosanitary_certificates
  ADD CONSTRAINT chk_phytosanitary_certificates_status
  CHECK (status IN ('PENDING', 'INSPECTED', 'ISSUED', 'REVOKED'));

-- 7. One post-delivery tracking row per shipment. The service looks the
--    row up by shipment_id (record/close/status/dashboard all key off
--    it) and the test seed uses ON CONFLICT (shipment_id) — but no unique
--    constraint existed, so the seed failed with "there is no unique or
--    exclusion constraint matching the ON CONFLICT specification" and the
--    seeded-row retests 404'd (handoff run HANDOFF1447, Phase 9b).
--    Verified before adding: no duplicate shipment_id exists in the table
--    (only tracking_id was unique). Without this, two rows for one
--    shipment would make the record endpoints' lookup ambiguous.
ALTER TABLE post_delivery_tracking
  ADD CONSTRAINT uq_post_delivery_tracking_shipment_id UNIQUE (shipment_id);
