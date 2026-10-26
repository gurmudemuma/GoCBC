-- Extend the base Customs and Letter of Credit tables to match the portal API.

ALTER TABLE customs_declarations
  ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS declaration_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hs_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS customs_value_usd DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS destination VARCHAR(255),
  ADD COLUMN IF NOT EXISTS destination_country VARCHAR(255),
  ADD COLUMN IF NOT EXISTS port_of_exit VARCHAR(255),
  ADD COLUMN IF NOT EXISTS eudr_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT,
  ADD COLUMN IF NOT EXISTS customs_officer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
  ADD COLUMN IF NOT EXISTS duty_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clearance_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE customs_declarations
SET declaration_number = COALESCE(NULLIF(BTRIM(declaration_number), ''), declaration_id),
    customs_value_usd = COALESCE(customs_value_usd, declared_value),
    clearance_date = COALESCE(clearance_date, cleared_date),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_customs_declarations_exporter
  ON customs_declarations(exporter_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_status
  ON customs_declarations(status);

ALTER TABLE customs_clearances
  ADD COLUMN IF NOT EXISTS clearance_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cleared_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cleared_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS duty_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);

ALTER TABLE letters_of_credit
  ADD COLUMN IF NOT EXISTS lc_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS request_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approved_by_msp VARCHAR(100);

UPDATE letters_of_credit
SET lc_id = COALESCE(NULLIF(BTRIM(lc_id), ''), lc_number),
    request_date = COALESCE(request_date, created_at);

UPDATE letters_of_credit lc
SET contract_id = COALESCE(lc.contract_id, s.contract_id),
    exporter_id = COALESCE(lc.exporter_id, s.exporter_id)
FROM shipments s
WHERE lc.shipment_id = s.shipment_id
  AND (lc.contract_id IS NULL OR lc.exporter_id IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_letters_of_credit_lc_id
  ON letters_of_credit(lc_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_contract
  ON letters_of_credit(contract_id);
