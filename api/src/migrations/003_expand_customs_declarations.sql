-- Expand customs_declarations table to store all declaration data
ALTER TABLE customs_declarations 
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS declaration_type VARCHAR(50) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS destination VARCHAR(100),
ADD COLUMN IF NOT EXISTS port_of_exit VARCHAR(100),
ADD COLUMN IF NOT EXISTS eudr_compliant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_notes TEXT,
ADD COLUMN IF NOT EXISTS customs_officer VARCHAR(100),
ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT true;

-- Rename clearance_status to status for consistency
ALTER TABLE customs_declarations 
RENAME COLUMN clearance_status TO status;

-- Add updated_at column
ALTER TABLE customs_declarations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index on exporter_id for faster queries
CREATE INDEX IF NOT EXISTS idx_customs_declarations_exporter_id 
ON customs_declarations(exporter_id);

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_customs_declarations_status 
ON customs_declarations(status);
