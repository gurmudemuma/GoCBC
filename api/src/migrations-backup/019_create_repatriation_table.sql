-- Create Export Proceeds Repatriation table
-- Purpose: Track NBE compliance for 40% retention and 60% conversion within 120 days

CREATE TABLE IF NOT EXISTS export_proceeds_repatriation (
    repatriation_id VARCHAR(50) PRIMARY KEY,
    payment_id VARCHAR(50),
    contract_id VARCHAR(50),
    shipment_id VARCHAR(50),
    exporter_id VARCHAR(50),
    
    -- Export Details
    export_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- NBE Requirements (FXD/01/2024)
    required_retention DECIMAL(15, 2),
    required_conversion DECIMAL(15, 2),
    retention_percentage DECIMAL(5, 2) DEFAULT 40.0,
    conversion_percentage DECIMAL(5, 2) DEFAULT 60.0,
    
    -- Actual Repatriation
    repatriated_amount DECIMAL(15, 2) DEFAULT 0,
    converted_amount DECIMAL(15, 2) DEFAULT 0,
    converted_amount_birr DECIMAL(15, 2) DEFAULT 0,
    exchange_rate DECIMAL(10, 4),
    
    -- FCY Account Details
    fcy_account_number VARCHAR(50),
    fcy_bank VARCHAR(100),
    fcy_bank_bic VARCHAR(20),
    
    -- Compliance Tracking
    status VARCHAR(30) DEFAULT 'PENDING',
    compliance_deadline TIMESTAMP NOT NULL,
    shipment_date DATE,
    repatriation_date TIMESTAMP,
    compliance_date TIMESTAMP,
    days_remaining INTEGER,
    is_overdue BOOLEAN DEFAULT FALSE,
    
    -- NBE Verification
    verified_by TEXT,
    verified_by_msp VARCHAR(50),
    verification_date TIMESTAMP,
    verification_ref VARCHAR(100),
    verification_notes TEXT,
    
    -- Non-Compliance Handling
    penalty_amount DECIMAL(15, 2),
    penalty_currency VARCHAR(10),
    waiver_requested BOOLEAN DEFAULT FALSE,
    waiver_approved BOOLEAN DEFAULT FALSE,
    waiver_reason TEXT,
    waiver_date TIMESTAMP,
    
    -- SWIFT Evidence
    swift_references JSONB DEFAULT '[]'::jsonb,
    bank_certificate TEXT,
    
    -- Audit Trail
    recorded_by TEXT,
    recorded_by_msp VARCHAR(50),
    last_updated_by TEXT,
    last_updated_by_msp VARCHAR(50),
    comments TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repatriation_payment ON export_proceeds_repatriation(payment_id);
CREATE INDEX IF NOT EXISTS idx_repatriation_contract ON export_proceeds_repatriation(contract_id);
CREATE INDEX IF NOT EXISTS idx_repatriation_shipment ON export_proceeds_repatriation(shipment_id);
CREATE INDEX IF NOT EXISTS idx_repatriation_exporter ON export_proceeds_repatriation(exporter_id);
CREATE INDEX IF NOT EXISTS idx_repatriation_status ON export_proceeds_repatriation(status);
CREATE INDEX IF NOT EXISTS idx_repatriation_deadline ON export_proceeds_repatriation(compliance_deadline);
CREATE INDEX IF NOT EXISTS idx_repatriation_overdue ON export_proceeds_repatriation(is_overdue) WHERE is_overdue = TRUE;

-- Add foreign key constraints (if tables exist)
ALTER TABLE export_proceeds_repatriation
    ADD CONSTRAINT fk_repatriation_exporter 
    FOREIGN KEY (exporter_id) REFERENCES exporters(exporter_id) ON DELETE SET NULL;

-- Comments for documentation
COMMENT ON TABLE export_proceeds_repatriation IS 'Tracks export proceeds repatriation compliance (NBE Directive FXD/01/2024)';
COMMENT ON COLUMN export_proceeds_repatriation.retention_percentage IS '40% USD retention requirement';
COMMENT ON COLUMN export_proceeds_repatriation.conversion_percentage IS '60% Birr conversion requirement';
COMMENT ON COLUMN export_proceeds_repatriation.compliance_deadline IS '120 days from shipment date';
COMMENT ON COLUMN export_proceeds_repatriation.is_overdue IS 'Automatically set if deadline passed without compliance';
