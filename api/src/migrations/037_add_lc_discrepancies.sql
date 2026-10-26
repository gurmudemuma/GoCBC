-- Query optimized mirror of discrepancy records nested in the Fabric LC state.
-- Fabric remains the authoritative state; this table is rebuilt/synced for API fallback.
CREATE TABLE IF NOT EXISTS lc_discrepancies (
  discrepancy_id VARCHAR(100) PRIMARY KEY,
  lc_id VARCHAR(100) NOT NULL,
  discrepancy_type VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
  document TEXT NOT NULL,
  issue TEXT NOT NULL,
  affected_clauses TEXT,
  recommended_action VARCHAR(255),
  status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  reported_by TEXT,
  reported_by_msp VARCHAR(100),
  reported_date TIMESTAMP NOT NULL,
  resolved_by TEXT,
  resolved_by_msp VARCHAR(100),
  resolved_date TIMESTAMP,
  blockchain_tx_id VARCHAR(255),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lc_discrepancies_lc_id ON lc_discrepancies(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_discrepancies_status ON lc_discrepancies(status);
