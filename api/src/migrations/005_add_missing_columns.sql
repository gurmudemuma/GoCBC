-- Add missing columns to fix test failures

-- Add latest_shipment_date to letters_of_credit
ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS latest_shipment_date DATE;

-- Add delivery_date to shipments
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;

-- Add any other missing columns for LC
ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS lc_id VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS request_date TIMESTAMP;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS terms TEXT;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS approved_by_msp VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS rejected_by_msp VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS document_rejection_reason TEXT;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS document_rejected_by VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS document_rejected_by_msp VARCHAR(100);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS document_rejection_date TIMESTAMP;

-- Add shipping-related columns to LC
ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS port_of_discharge VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS partial_shipment_allowed BOOLEAN DEFAULT false;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS transshipment_allowed BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_lc_contract_id ON letters_of_credit(contract_id);
CREATE INDEX IF NOT EXISTS idx_lc_exporter_id ON letters_of_credit(exporter_id);
CREATE INDEX IF NOT EXISTS idx_lc_id ON letters_of_credit(lc_id);

-- Add more missing columns to letters_of_credit
ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS partial_shipment BOOLEAN DEFAULT false;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS transshipment BOOLEAN DEFAULT false;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS transhipment BOOLEAN DEFAULT false;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP;

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS issued_by VARCHAR(255);

ALTER TABLE letters_of_credit 
ADD COLUMN IF NOT EXISTS issued_by_msp VARCHAR(100);

-- Add missing columns to forex_allocations table
ALTER TABLE forex_allocations
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

ALTER TABLE forex_allocations
ADD COLUMN IF NOT EXISTS repatriation_date TIMESTAMP;

ALTER TABLE forex_allocations
ADD COLUMN IF NOT EXISTS repatriation_amount DECIMAL(15,2);

ALTER TABLE forex_allocations
ADD COLUMN IF NOT EXISTS repatriation_reference VARCHAR(255);
