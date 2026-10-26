-- Quality Control & Certification Tables

-- Enhance Quality Inspections table (already exists from base schema)
ALTER TABLE quality_inspections 
ADD COLUMN IF NOT EXISTS inspection_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS coffee_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS sample_size DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS requested_date DATE,
ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS screen_size INTEGER,
ADD COLUMN IF NOT EXISTS passed BOOLEAN,
ADD COLUMN IF NOT EXISTS certification_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

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
