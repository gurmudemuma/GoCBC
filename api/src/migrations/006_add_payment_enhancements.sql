-- Payment Processing Enhancement Tables

-- Payment Confirmations
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

-- Forex Allocations
CREATE TABLE IF NOT EXISTS forex_allocations (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(50) UNIQUE NOT NULL,
    lc_number VARCHAR(50),
    contract_id VARCHAR(50) NOT NULL,
    exporter_id VARCHAR(50) NOT NULL,
    amount_usd DECIMAL(15, 2) NOT NULL,
    exchange_rate DECIMAL(10, 4) NOT NULL,
    amount_etb DECIMAL(15, 2) NOT NULL,
    allocation_date DATE NOT NULL,
    approved_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'allocated',
    utilized_amount DECIMAL(15, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_payment ON payment_confirmations(payment_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_contract ON forex_allocations(contract_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_exporter ON forex_allocations(exporter_id);
CREATE INDEX IF NOT EXISTS idx_forex_allocations_status ON forex_allocations(status);
