-- Migration: Add retention columns to forex_allocations table
-- These columns track the 40% NBE retention policy for coffee exports

-- Add retention_amount column (USD amount retained per NBE policy)
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS retention_amount DECIMAL(15,2) DEFAULT 0;

-- Add release_amount column (USD amount released to exporter)
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS release_amount DECIMAL(15,2) DEFAULT 0;

-- Add allocated_by column (officer who performed allocation)
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS allocated_by VARCHAR(255);

-- Add allocated_at timestamp
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMP;

-- Add approval_ref column (NBE approval reference)
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS approval_ref VARCHAR(255);

-- Add expiry_date column
ALTER TABLE forex_allocations 
ADD COLUMN IF NOT EXISTS expiry_date DATE;

COMMENT ON COLUMN forex_allocations.retention_amount IS 'Amount retained per NBE 40% retention policy (USD)';
COMMENT ON COLUMN forex_allocations.release_amount IS 'Amount released to exporter after retention (USD)';
COMMENT ON COLUMN forex_allocations.allocated_by IS 'Officer who performed the allocation';
COMMENT ON COLUMN forex_allocations.approval_ref IS 'NBE forex approval reference number';
