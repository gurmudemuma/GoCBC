-- Enhance Payments table (already exists from base schema)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_exporter ON payments(exporter_id);
CREATE INDEX IF NOT EXISTS idx_payments_lc ON payments(lc_number);
