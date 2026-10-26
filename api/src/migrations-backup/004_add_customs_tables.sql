-- Customs Operations Tables

-- Customs Risk Assessments (new table)
CREATE TABLE IF NOT EXISTS customs_risk_assessments (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(50) UNIQUE NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    exporter_id VARCHAR(50) NOT NULL,
    risk_factors JSONB NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    inspection_required BOOLEAN DEFAULT false,
    assessed_by VARCHAR(100) NOT NULL,
    assessment_date TIMESTAMP DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhance Customs Clearances table (already exists from base schema)
ALTER TABLE customs_clearances
ADD COLUMN IF NOT EXISTS clearance_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS cleared_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS cleared_date DATE,
ADD COLUMN IF NOT EXISTS duty_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Customs Inspections (new table)
CREATE TABLE IF NOT EXISTS customs_inspections (
    id SERIAL PRIMARY KEY,
    inspection_id VARCHAR(50) UNIQUE NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    clearance_id VARCHAR(50),
    inspection_type VARCHAR(50) NOT NULL,
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(100) NOT NULL,
    inspection_result VARCHAR(50) NOT NULL,
    findings TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_shipment ON customs_risk_assessments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_clearances_shipment ON customs_clearances(shipment_id);
CREATE INDEX IF NOT EXISTS idx_clearances_status ON customs_clearances(status);
CREATE INDEX IF NOT EXISTS idx_inspections_shipment ON customs_inspections(shipment_id);
