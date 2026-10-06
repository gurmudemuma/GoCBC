-- Create Pre-shipment Inspection table
-- Purpose: Track SGS/Intertek/Bureau Veritas quality inspections before shipment

CREATE TABLE IF NOT EXISTS pre_shipment_inspections (
    inspection_id VARCHAR(50) PRIMARY KEY,
    contract_id VARCHAR(50),
    shipment_id VARCHAR(50),
    exporter_id VARCHAR(50),
    
    -- Inspection Agency
    inspection_agency VARCHAR(100),
    inspector_name VARCHAR(200),
    inspector_license VARCHAR(100),
    
    -- Inspection Request
    requested_by TEXT,
    request_date TIMESTAMP,
    inspection_date DATE,
    inspection_location VARCHAR(200),
    
    -- Contract Specifications
    contract_quantity DECIMAL(12, 2),
    contract_grade VARCHAR(50),
    contract_type VARCHAR(50),
    packaging_type VARCHAR(50),
    
    -- Inspection Results - Quantity
    inspected_quantity DECIMAL(12, 2),
    quantity_variance DECIMAL(12, 2),
    quantity_acceptable BOOLEAN DEFAULT FALSE,
    
    -- Inspection Results - Quality
    actual_grade VARCHAR(50),
    cupping_score DECIMAL(5, 2),
    defects_count INTEGER,
    moisture_content DECIMAL(5, 2),
    bean_size VARCHAR(20),
    quality_acceptable BOOLEAN DEFAULT FALSE,
    
    -- Inspection Results - Packaging
    bags_inspected INTEGER,
    packaging_condition VARCHAR(30),
    packaging_acceptable BOOLEAN DEFAULT FALSE,
    
    -- Overall Results
    status VARCHAR(30) DEFAULT 'REQUESTED',
    overall_result VARCHAR(30),
    inspection_notes TEXT,
    recommendations TEXT,
    
    -- Certificate Details
    certificate_number VARCHAR(100),
    certificate_issued TIMESTAMP,
    certificate_expiry DATE,
    certificate_url TEXT,
    
    -- Sample Testing
    samples_taken INTEGER,
    sample_ids JSONB DEFAULT '[]'::jsonb,
    lab_test_required BOOLEAN DEFAULT FALSE,
    lab_test_completed BOOLEAN DEFAULT FALSE,
    lab_test_results TEXT,
    
    -- Compliance Issues
    issues_found JSONB DEFAULT '[]'::jsonb,
    corrective_actions JSONB DEFAULT '[]'::jsonb,
    re_inspection_required BOOLEAN DEFAULT FALSE,
    
    -- Approval Flow
    approved_by TEXT,
    approved_by_msp VARCHAR(50),
    approval_date TIMESTAMP,
    rejected_by TEXT,
    rejected_by_msp VARCHAR(50),
    rejection_reason TEXT,
    
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
CREATE INDEX IF NOT EXISTS idx_inspection_contract ON pre_shipment_inspections(contract_id);
CREATE INDEX IF NOT EXISTS idx_inspection_shipment ON pre_shipment_inspections(shipment_id);
CREATE INDEX IF NOT EXISTS idx_inspection_exporter ON pre_shipment_inspections(exporter_id);
CREATE INDEX IF NOT EXISTS idx_inspection_status ON pre_shipment_inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspection_agency ON pre_shipment_inspections(inspection_agency);
CREATE INDEX IF NOT EXISTS idx_inspection_date ON pre_shipment_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_result ON pre_shipment_inspections(overall_result);

-- Add foreign key constraints (if tables exist)
ALTER TABLE pre_shipment_inspections
    ADD CONSTRAINT fk_inspection_exporter 
    FOREIGN KEY (exporter_id) REFERENCES exporters(exporter_id) ON DELETE SET NULL;

-- Comments for documentation
COMMENT ON TABLE pre_shipment_inspections IS 'Pre-shipment quality inspections by international agencies (SGS, Intertek, Bureau Veritas)';
COMMENT ON COLUMN pre_shipment_inspections.cupping_score IS 'Coffee cupping score (0-100 SCA scale)';
COMMENT ON COLUMN pre_shipment_inspections.moisture_content IS 'Coffee moisture percentage (target: 11-12%)';
COMMENT ON COLUMN pre_shipment_inspections.certificate_expiry IS 'Certificate valid for 90 days from issue';
COMMENT ON COLUMN pre_shipment_inspections.overall_result IS 'PASS, FAIL, or CONDITIONAL_PASS';
