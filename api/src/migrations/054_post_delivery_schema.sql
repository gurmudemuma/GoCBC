-- 054: Post-delivery workflow schema
--
-- The post-delivery routes (api/src/routes/postDeliveryWorkflow.ts)
-- and service (api/src/services/postDeliveryWorkflowService.ts) read
-- and write columns and tables that no migration ever created:
--
--   * post_delivery_tracking (created by 000 with only 9 columns)
--     is INSERTed/UPDATEd with contract_id, exporter_id, delivery_date,
--     lc_used, overall_status, completion_percentage,
--     expected_completion_date, created_by, payment_received (+ date /
--     amount / currency / swift_reference), forex_repatriated (+ date /
--     amount / rate), lc_settled (+ date / reference),
--     ecta_audit_completed (+ date / result / notes), contract_closed
--     (+ date), updated_by and updated_at — every one of the
--     POST /post-delivery/:shipmentId/{payment,forex,lc-settlement,
--     ecta-audit} calls failed with `column "payment_received" of
--     relation "post_delivery_tracking" does not exist`.
--   * The INSERT in initializePostDeliveryWorkflow also never supplied
--     tracking_id, which 000 declared NOT NULL with no default, so
--     initialisation could never succeed either. tracking_id is never
--     read by the service; the NOT NULL constraint is dropped.
--   * post_delivery_issues and post_delivery_checklist are queried by
--     getPostDeliveryStatus / createIssue / createChecklistItems /
--     updateChecklistItem but were never created.
--   * The dashboard (GET /post-delivery/dashboard) reads five views
--     (v_post_delivery_summary, v_pending_payments, v_pending_forex,
--     v_pending_ecta_audits, v_ready_for_closure) that never existed.
--
-- This migration adds the missing columns, tables and views. Existing
-- rows keep their 000 values; new workflow columns default to "not
-- done yet" (false / NULL / 'PENDING' / 0).

-- --- post_delivery_tracking: add every column the service uses -------

ALTER TABLE post_delivery_tracking
    ALTER COLUMN tracking_id DROP NOT NULL;

ALTER TABLE post_delivery_tracking
    ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS lc_used BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS overall_status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expected_completion_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS payment_received_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS swift_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS forex_repatriated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS forex_repatriation_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS forex_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS forex_rate DECIMAL(10,4),
    ADD COLUMN IF NOT EXISTS lc_settled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS lc_settlement_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS lc_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ecta_audit_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ecta_audit_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ecta_audit_result VARCHAR(20),
    ADD COLUMN IF NOT EXISTS ecta_audit_notes TEXT,
    ADD COLUMN IF NOT EXISTS contract_closed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS contract_closure_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_post_delivery_shipment
    ON post_delivery_tracking (shipment_id);
CREATE INDEX IF NOT EXISTS idx_post_delivery_overall_status
    ON post_delivery_tracking (overall_status);

-- --- post_delivery_issues: SLA / delay issues raised by the service --
-- One open issue per (shipment, type); ON CONFLICT (shipment_id,
-- issue_type) DO NOTHING in the service relies on this unique key.

CREATE TABLE IF NOT EXISTS post_delivery_issues (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100) NOT NULL,
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20),
    message TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shipment_id, issue_type)
);

CREATE INDEX IF NOT EXISTS idx_post_delivery_issues_shipment
    ON post_delivery_issues (shipment_id, resolved);

-- --- post_delivery_checklist: one row per workflow step --------------
-- Inserted by createChecklistItems, ticked by updateChecklistItem.

CREATE TABLE IF NOT EXISTS post_delivery_checklist (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    description TEXT,
    display_order INTEGER,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shipment_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_post_delivery_checklist_shipment
    ON post_delivery_checklist (shipment_id);

-- --- Dashboard views --------------------------------------------------
-- All read from post_delivery_tracking only; the service's dashboard
-- endpoint selects from each of them (LIMIT 10 on the four lists).

CREATE OR REPLACE VIEW v_post_delivery_summary AS
SELECT
    COUNT(*)::int AS total_shipments,
    COUNT(*) FILTER (WHERE COALESCE(overall_status, 'PENDING') = 'PENDING')::int AS pending,
    COUNT(*) FILTER (WHERE overall_status = 'IN_PROGRESS')::int AS in_progress,
    COUNT(*) FILTER (WHERE overall_status = 'COMPLETED')::int AS completed,
    COUNT(*) FILTER (WHERE overall_status = 'DELAYED')::int AS delayed,
    COUNT(*) FILTER (WHERE COALESCE(payment_received, false))::int AS payments_received,
    COUNT(*) FILTER (WHERE COALESCE(forex_repatriated, false))::int AS forex_repatriated,
    COUNT(*) FILTER (WHERE COALESCE(lc_settled, false))::int AS lc_settled,
    COUNT(*) FILTER (WHERE COALESCE(ecta_audit_completed, false))::int AS ecta_audits_completed,
    COUNT(*) FILTER (WHERE COALESCE(contract_closed, false))::int AS contracts_closed,
    COALESCE(AVG(completion_percentage), 0)::int AS avg_completion_percentage
FROM post_delivery_tracking;

CREATE OR REPLACE VIEW v_pending_payments AS
SELECT shipment_id, contract_id, exporter_id, delivery_date,
       expected_completion_date, overall_status, created_at
FROM post_delivery_tracking
WHERE COALESCE(payment_received, false) = false;

CREATE OR REPLACE VIEW v_pending_forex AS
SELECT shipment_id, contract_id, exporter_id, payment_amount,
       payment_currency, payment_received_date, swift_reference
FROM post_delivery_tracking
WHERE COALESCE(payment_received, false) = true
  AND COALESCE(forex_repatriated, false) = false;

CREATE OR REPLACE VIEW v_pending_ecta_audits AS
SELECT shipment_id, contract_id, exporter_id, payment_received_date,
       forex_repatriation_date, forex_amount
FROM post_delivery_tracking
WHERE COALESCE(forex_repatriated, false) = true
  AND COALESCE(ecta_audit_completed, false) = false;

CREATE OR REPLACE VIEW v_ready_for_closure AS
SELECT shipment_id, contract_id, exporter_id, payment_received_date,
       forex_repatriation_date, lc_reference, ecta_audit_date,
       ecta_audit_result, overall_status, completion_percentage
FROM post_delivery_tracking
WHERE COALESCE(payment_received, false) = true
  AND COALESCE(forex_repatriated, false) = true
  AND (COALESCE(lc_used, false) = false OR COALESCE(lc_settled, false) = true)
  AND COALESCE(ecta_audit_completed, false) = true
  AND COALESCE(contract_closed, false) = false;
