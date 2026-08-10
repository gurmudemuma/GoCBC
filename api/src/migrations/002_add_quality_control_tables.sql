-- Quality Control & Certification Tables

-- Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
    id SERIAL PRIMARY KEY,
    inspection_id VARCHAR(50) UNIQUE NOT NULL,
    exporter_id VARCHAR(50) NOT NULL,
    contract_id VARCHAR(50),
    shipment_id VARCHAR(50),
    coffee_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    sample_size DECIMAL(10, 2),
    requested_date DATE NOT NULL,
    inspection_date DATE,
    inspector_name VARCHAR(100),
    grade VARCHAR(20),
    cup_quality VARCHAR(50),
    moisture_content DECIMAL(5, 2),
    defect_count INTEGER,
    screen_size INTEGER,
    passed BOOLEAN,
    certification_number VARCHAR(50),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Certificates
CREATE TABLE IF NOT EXISTS quality_certificates (
    id SERIAL PRIMARY KEY,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    inspection_id VARCHAR(50) NOT NULL,
    exporter_id VARCHAR(50) NOT NULL,
    coffee_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    issued_by VARCHAR(100) NOT NULL,
    certificate_hash VARCHAR(128),
    ipfs_cid VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lab Test Results
CREATE TABLE IF NOT EXISTS lab_test_results (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(50) UNIQUE NOT NULL,
    inspection_id VARCHAR(50) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    test_date DATE NOT NULL,
    result VARCHAR(50) NOT NULL,
    details JSONB,
    tested_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_inspections_exporter ON quality_inspections(exporter_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_quality_certificates_exporter ON quality_certificates(exporter_id);
