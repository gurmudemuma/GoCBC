-- Migration 057: create the forex_repatriations table.
--
-- POST /nbe/forex/:forexId/repatriation inserts into this table, but no
-- migration ever created it, so the insert always failed and the handler
-- silently fell back to updating forex_allocations. Create the table the
-- handler was written against (columns matching its INSERT), plus the
-- repatriation id and chain-sync bookkeeping.
CREATE TABLE IF NOT EXISTS forex_repatriations (
    id SERIAL PRIMARY KEY,
    repatriation_id VARCHAR(100),
    forex_allocation_id VARCHAR(100) NOT NULL,
    repatriation_amount DECIMAL(15, 2),
    repatriation_date DATE,
    bank_reference VARCHAR(100),
    repatriation_method VARCHAR(50) DEFAULT 'Wire Transfer',
    status VARCHAR(50) DEFAULT 'COMPLETED',
    blockchain_synced BOOLEAN DEFAULT FALSE,
    blockchain_tx_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forex_repatriations_allocation ON forex_repatriations(forex_allocation_id);
CREATE INDEX IF NOT EXISTS idx_forex_repatriations_id ON forex_repatriations(repatriation_id);

COMMENT ON TABLE forex_repatriations IS 'NBE forex repatriation records; mirrored to the ledger by POST /nbe/forex/:forexId/repatriation';
