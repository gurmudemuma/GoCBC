-- Add LC Discrepancy tracking to existing LC tables
-- Purpose: Track document discrepancies in Letter of Credit transactions (UCP 600)

-- Add discrepancy-related columns to letter_of_credits table (if exists)
ALTER TABLE letter_of_credits
ADD COLUMN IF NOT EXISTS discrepancies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discrepancy_resolved BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS negotiation_status VARCHAR(30) DEFAULT 'NOT_STARTED',
ADD COLUMN IF NOT EXISTS negotiation_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS negotiating_bank VARCHAR(100);

-- Create separate discrepancies table for detailed tracking
CREATE TABLE IF NOT EXISTS lc_discrepancies (
    discrepancy_id VARCHAR(50) PRIMARY KEY,
    lc_id VARCHAR(50) NOT NULL,
    
    -- Discrepancy Details
    document VARCHAR(100),
    issue TEXT,
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP,
    resolution TEXT,
    status VARCHAR(30) DEFAULT 'OPEN',
    
    -- Reporter & Resolver
    reported_by TEXT,
    reported_by_msp VARCHAR(50),
    resolved_by TEXT,
    resolved_by_msp VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lc_negotiation ON letter_of_credits(negotiation_status) 
    WHERE negotiation_status = 'UNDER_NEGOTIATION';
CREATE INDEX IF NOT EXISTS idx_lc_discrepancy_resolved ON letter_of_credits(discrepancy_resolved) 
    WHERE discrepancy_resolved = FALSE;
    
CREATE INDEX IF NOT EXISTS idx_discrepancy_lc ON lc_discrepancies(lc_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_status ON lc_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reported_date ON lc_discrepancies(reported_date);

-- Add foreign key constraint
ALTER TABLE lc_discrepancies
    ADD CONSTRAINT fk_discrepancy_lc 
    FOREIGN KEY (lc_id) REFERENCES letter_of_credits(lc_id) ON DELETE CASCADE;

-- Comments for documentation
COMMENT ON TABLE lc_discrepancies IS 'Letter of Credit document discrepancies (UCP 600 Article 14)';
COMMENT ON COLUMN lc_discrepancies.status IS 'OPEN, RESOLVED, or WAIVED';
COMMENT ON COLUMN letter_of_credits.negotiation_status IS 'NOT_STARTED, UNDER_NEGOTIATION, ACCEPTED, or REJECTED';
COMMENT ON COLUMN letter_of_credits.discrepancy_resolved IS 'TRUE if all discrepancies resolved or waived';

-- Update trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_lc_discrepancy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lc_discrepancy_updated_at
    BEFORE UPDATE ON lc_discrepancies
    FOR EACH ROW
    EXECUTE FUNCTION update_lc_discrepancy_timestamp();
