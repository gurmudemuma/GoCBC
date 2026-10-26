-- Add confirmation fields for two-step forex workflow (REQUESTED → CONFIRMED → ALLOCATED)

ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

-- Create index for confirmed_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_forex_allocations_confirmed_at ON forex_allocations(confirmed_at);

-- Add comment for documentation
COMMENT ON COLUMN forex_allocations.confirmed_by IS 'NBE officer who confirmed the forex request (two-step workflow)';
COMMENT ON COLUMN forex_allocations.confirmed_at IS 'Timestamp when forex request was confirmed by NBE';
