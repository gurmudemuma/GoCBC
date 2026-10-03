-- Payment Processing Enhancement Tables

-- Payment Confirmations - new table
CREATE TABLE IF NOT EXISTS payment_confirmations (
    id SERIAL PRIMARY KEY,
    confirmation_id VARCHAR(50) UNIQUE NOT NULL,
    payment_id VARCHAR(50) NOT NULL,
    confirmed_by VARCHAR(50) NOT NULL,
    confirmed_by_org VARCHAR(50) NOT NULL,
    confirmation_date TIMESTAMP DEFAULT NOW(),
    confirmation_type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhance Forex Allocations table (already exists from base schema)
ALTER TABLE forex_allocations
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount_etb DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS utilized_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_payment ON payment_confirmations(payment_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_contract ON forex_allocations(contract_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_exporter ON forex_allocations(exporter_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_status ON forex_allocations(status);
