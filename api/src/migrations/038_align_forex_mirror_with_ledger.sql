-- Align the query-optimized PostgreSQL mirror with the ledger-backed Forex API.
-- allocation_id is retained for legacy reports; forex_id is the canonical API key.
ALTER TABLE forex_allocations
  ADD COLUMN IF NOT EXISTS forex_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS lc_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS requested_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS amount_etb DECIMAL(18, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS retention_rate DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS retention_percentage DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS retention_amount_usd DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS fcy_account_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS retention_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS retention_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS request_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS utilization_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nbe_officer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nbe_approval_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_by_msp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS comments TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_blockchain_sync TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE forex_allocations
SET forex_id = allocation_id
WHERE forex_id IS NULL;

ALTER TABLE forex_allocations
  ALTER COLUMN forex_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_forex_allocations_forex_id
  ON forex_allocations(forex_id);
