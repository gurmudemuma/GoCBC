-- Migration: Post-Delivery Workflow Tracking
-- Description: Track payment settlement, forex repatriation, LC settlement, ECTA audit, and contract closure
-- Created: 2026-09-02

-- ====================================================================
-- POST-DELIVERY TRACKING TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS post_delivery_tracking (
  id SERIAL PRIMARY KEY,
  shipment_id VARCHAR(100) NOT NULL UNIQUE,
  contract_id VARCHAR(100) NOT NULL,
  exporter_id VARCHAR(100) NOT NULL,
  delivery_date TIMESTAMP NOT NULL,
  
  -- Payment Settlement
  payment_received BOOLEAN DEFAULT FALSE,
  payment_received_date TIMESTAMP,
  payment_amount DECIMAL(15, 2),
  payment_currency VARCHAR(3),
  swift_reference VARCHAR(100),
  
  -- Forex Repatriation
  forex_repatriated BOOLEAN DEFAULT FALSE,
  forex_repatriation_date TIMESTAMP,
  forex_amount DECIMAL(15, 2),
  forex_rate DECIMAL(10, 4),
  
  -- LC Settlement
  lc_used BOOLEAN DEFAULT FALSE,
  lc_settled BOOLEAN DEFAULT FALSE,
  lc_settlement_date TIMESTAMP,
  lc_reference VARCHAR(100),
  
  -- ECTA Audit
  ecta_audit_completed BOOLEAN DEFAULT FALSE,
  ecta_audit_date TIMESTAMP,
  ecta_audit_result VARCHAR(20) CHECK (ecta_audit_result IN ('PASSED', 'FAILED', 'PENDING')),
  ecta_audit_notes TEXT,
  
  -- Contract Closure
  contract_closed BOOLEAN DEFAULT FALSE,
  contract_closure_date TIMESTAMP,
  
  -- Workflow Status
  overall_status VARCHAR(20) DEFAULT 'PENDING' CHECK (overall_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ISSUE')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  expected_completion_date TIMESTAMP,
  
  -- Audit Trail
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_post_delivery_shipment ON post_delivery_tracking(shipment_id);
CREATE INDEX IF NOT EXISTS idx_post_delivery_contract ON post_delivery_tracking(contract_id);
CREATE INDEX IF NOT EXISTS idx_post_delivery_exporter ON post_delivery_tracking(exporter_id);
CREATE INDEX IF NOT EXISTS idx_post_delivery_status ON post_delivery_tracking(overall_status);
CREATE INDEX IF NOT EXISTS idx_post_delivery_delivery_date ON post_delivery_tracking(delivery_date);

-- ====================================================================
-- POST-DELIVERY CHECKLIST TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS post_delivery_checklist (
  id SERIAL PRIMARY KEY,
  shipment_id VARCHAR(100) NOT NULL REFERENCES post_delivery_tracking(shipment_id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  notes TEXT,
  
  CONSTRAINT unique_checklist_item UNIQUE (shipment_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_checklist_shipment ON post_delivery_checklist(shipment_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completed ON post_delivery_checklist(completed);

-- ====================================================================
-- POST-DELIVERY ISSUES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS post_delivery_issues (
  id SERIAL PRIMARY KEY,
  shipment_id VARCHAR(100) NOT NULL REFERENCES post_delivery_tracking(shipment_id) ON DELETE CASCADE,
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('PAYMENT_OVERDUE', 'FOREX_DELAYED', 'LC_ISSUE', 'AUDIT_REQUIRED', 'COMPLIANCE_ISSUE')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_active_issue UNIQUE (shipment_id, issue_type)
);

CREATE INDEX IF NOT EXISTS idx_issues_shipment ON post_delivery_issues(shipment_id);
CREATE INDEX IF NOT EXISTS idx_issues_resolved ON post_delivery_issues(resolved);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON post_delivery_issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_type ON post_delivery_issues(issue_type);

-- ====================================================================
-- POST-DELIVERY NOTIFICATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS post_delivery_notifications (
  id SERIAL PRIMARY KEY,
  shipment_id VARCHAR(100) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  recipient_role VARCHAR(50) NOT NULL CHECK (recipient_role IN ('BANK', 'NBE', 'ECTA', 'EXPORTER', 'ADMIN')),
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_shipment ON post_delivery_notifications(shipment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON post_delivery_notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON post_delivery_notifications(sent);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON post_delivery_notifications(read);

-- ====================================================================
-- VIEWS FOR DASHBOARD
-- ====================================================================

-- View: Pending Payment Shipments
CREATE OR REPLACE VIEW v_pending_payments AS
SELECT 
  pdt.shipment_id,
  pdt.contract_id,
  pdt.exporter_id,
  pdt.delivery_date,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.delivery_date)) as days_since_delivery,
  pdt.expected_completion_date,
  CASE 
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.delivery_date)) > 90 THEN 'OVERDUE'
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.delivery_date)) > 60 THEN 'AT_RISK'
    ELSE 'ON_TRACK'
  END as payment_status
FROM post_delivery_tracking pdt
WHERE pdt.payment_received = FALSE
  AND pdt.overall_status != 'COMPLETED'
ORDER BY pdt.delivery_date ASC;

-- View: Pending Forex Repatriation
CREATE OR REPLACE VIEW v_pending_forex AS
SELECT 
  pdt.shipment_id,
  pdt.contract_id,
  pdt.exporter_id,
  pdt.payment_received_date,
  pdt.payment_amount,
  pdt.payment_currency,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.payment_received_date)) as days_since_payment,
  CASE 
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.payment_received_date)) > 7 THEN 'OVERDUE'
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.payment_received_date)) > 5 THEN 'AT_RISK'
    ELSE 'ON_TRACK'
  END as forex_status
FROM post_delivery_tracking pdt
WHERE pdt.payment_received = TRUE
  AND pdt.forex_repatriated = FALSE
  AND pdt.overall_status != 'COMPLETED'
ORDER BY pdt.payment_received_date ASC;

-- View: Pending ECTA Audits
CREATE OR REPLACE VIEW v_pending_ecta_audits AS
SELECT 
  pdt.shipment_id,
  pdt.contract_id,
  pdt.exporter_id,
  pdt.delivery_date,
  pdt.payment_received,
  pdt.forex_repatriated,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.delivery_date)) as days_since_delivery
FROM post_delivery_tracking pdt
WHERE pdt.payment_received = TRUE
  AND pdt.forex_repatriated = TRUE
  AND pdt.ecta_audit_completed = FALSE
  AND pdt.overall_status != 'COMPLETED'
ORDER BY pdt.delivery_date ASC;

-- View: Ready for Contract Closure
CREATE OR REPLACE VIEW v_ready_for_closure AS
SELECT 
  pdt.shipment_id,
  pdt.contract_id,
  pdt.exporter_id,
  pdt.delivery_date,
  pdt.payment_received_date,
  pdt.forex_repatriation_date,
  pdt.ecta_audit_date,
  pdt.completion_percentage
FROM post_delivery_tracking pdt
WHERE pdt.payment_received = TRUE
  AND pdt.forex_repatriated = TRUE
  AND (pdt.lc_used = FALSE OR pdt.lc_settled = TRUE)
  AND pdt.ecta_audit_completed = TRUE
  AND pdt.contract_closed = FALSE
ORDER BY pdt.delivery_date ASC;

-- View: Post-Delivery Dashboard Summary
CREATE OR REPLACE VIEW v_post_delivery_summary AS
SELECT 
  pdt.overall_status,
  COUNT(*) as count,
  AVG(pdt.completion_percentage) as avg_completion,
  AVG(EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pdt.delivery_date))) as avg_days_elapsed
FROM post_delivery_tracking pdt
WHERE pdt.overall_status != 'COMPLETED'
GROUP BY pdt.overall_status;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Trigger: Update completion percentage automatically
CREATE OR REPLACE FUNCTION update_post_delivery_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER := 0;
BEGIN
  -- Determine total steps (5 if LC used, 4 if not)
  IF NEW.lc_used THEN
    total_steps := 5;
  ELSE
    total_steps := 4;
  END IF;
  
  -- Count completed steps
  IF NEW.payment_received THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  IF NEW.forex_repatriated THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  IF NOT NEW.lc_used OR NEW.lc_settled THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  IF NEW.ecta_audit_completed THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  IF NEW.contract_closed THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  -- Update completion percentage
  NEW.completion_percentage := ROUND((completed_steps::DECIMAL / total_steps) * 100);
  
  -- Update overall status
  IF NEW.contract_closed THEN
    NEW.overall_status := 'COMPLETED';
  ELSIF completed_steps > 0 THEN
    NEW.overall_status := 'IN_PROGRESS';
  END IF;
  
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_completion ON post_delivery_tracking;

CREATE TRIGGER trg_update_completion
BEFORE UPDATE ON post_delivery_tracking
FOR EACH ROW
EXECUTE FUNCTION update_post_delivery_completion();

-- Trigger: Auto-resolve issues when step is completed
CREATE OR REPLACE FUNCTION auto_resolve_issues()
RETURNS TRIGGER AS $$
BEGIN
  -- Resolve payment overdue issues when payment received
  IF NEW.payment_received = TRUE AND OLD.payment_received = FALSE THEN
    UPDATE post_delivery_issues
    SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
    WHERE shipment_id = NEW.shipment_id AND issue_type = 'PAYMENT_OVERDUE';
  END IF;
  
  -- Resolve forex delay issues when forex repatriated
  IF NEW.forex_repatriated = TRUE AND OLD.forex_repatriated = FALSE THEN
    UPDATE post_delivery_issues
    SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
    WHERE shipment_id = NEW.shipment_id AND issue_type = 'FOREX_DELAYED';
  END IF;
  
  -- Resolve LC issues when LC settled
  IF NEW.lc_settled = TRUE AND OLD.lc_settled = FALSE THEN
    UPDATE post_delivery_issues
    SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
    WHERE shipment_id = NEW.shipment_id AND issue_type = 'LC_ISSUE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_resolve_issues ON post_delivery_tracking;

CREATE TRIGGER trg_auto_resolve_issues
AFTER UPDATE ON post_delivery_tracking
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_issues();

-- ====================================================================
-- COMMENTS
-- ====================================================================

COMMENT ON TABLE post_delivery_tracking IS 'Tracks post-delivery workflow: payment, forex, LC, audit, closure';
COMMENT ON TABLE post_delivery_checklist IS 'Checklist items for post-delivery workflow';
COMMENT ON TABLE post_delivery_issues IS 'Issues and alerts for delayed/problematic post-delivery processes';
COMMENT ON TABLE post_delivery_notifications IS 'Notifications sent to stakeholders during post-delivery workflow';

COMMENT ON VIEW v_pending_payments IS 'Shipments awaiting payment from buyer';
COMMENT ON VIEW v_pending_forex IS 'Payments awaiting forex repatriation';
COMMENT ON VIEW v_pending_ecta_audits IS 'Shipments ready for ECTA final audit';
COMMENT ON VIEW v_ready_for_closure IS 'Shipments ready for contract closure';
COMMENT ON VIEW v_post_delivery_summary IS 'Dashboard summary of post-delivery workflow status';
