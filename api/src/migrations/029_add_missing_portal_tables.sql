-- Migration: Add missing portal tables for shipping, certificates, and customs management
-- Date: 2026-10-30

-- Add missing columns to existing shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier VARCHAR(200);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS container_number VARCHAR(50);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS seal_number VARCHAR(50);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50) DEFAULT 'LAND_SEA';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_location VARCHAR(200);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_departure TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_departure TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMP;

-- Export Permits table
CREATE TABLE IF NOT EXISTS export_permits (
    id SERIAL PRIMARY KEY,
    permit_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    permit_type VARCHAR(50) DEFAULT 'EXPORT',
    status VARCHAR(50) DEFAULT 'APPROVED',
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    quantity DECIMAL(15, 2),
    approved_by VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permits_status ON export_permits(status);
CREATE INDEX IF NOT EXISTS idx_permits_contract ON export_permits(contract_id);

-- Phytosanitary Certificates table
CREATE TABLE IF NOT EXISTS phytosanitary_certificates (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ISSUED',
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    treatment_type VARCHAR(100),
    inspection_result VARCHAR(50),
    certifying_officer VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phyto_status ON phytosanitary_certificates(status);
CREATE INDEX IF NOT EXISTS idx_phyto_contract ON phytosanitary_certificates(contract_id);

-- Certificate of Origin table
CREATE TABLE IF NOT EXISTS certificate_of_origin (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ISSUED',
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    origin VARCHAR(100) DEFAULT 'ETHIOPIA',
    certifying_authority VARCHAR(200) DEFAULT 'ECTA',
    certifying_officer VARCHAR(200),
    hs_code VARCHAR(20) DEFAULT '0901.21',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coo_status ON certificate_of_origin(status);
CREATE INDEX IF NOT EXISTS idx_coo_contract ON certificate_of_origin(contract_id);

-- Customs Assessments table
CREATE TABLE IF NOT EXISTS customs_assessments (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(100) UNIQUE NOT NULL,
    declaration_number VARCHAR(100),
    contract_id VARCHAR(100),
    assessed_value DECIMAL(15, 2),
    duty_amount DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'ETB',
    assessed_by VARCHAR(200),
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_assess_decl ON customs_assessments(declaration_number);
CREATE INDEX IF NOT EXISTS idx_customs_assess_status ON customs_assessments(status);

-- Payment Methods Tables
CREATE TABLE IF NOT EXISTS documentary_collections (
    id SERIAL PRIMARY KEY,
    collection_id VARCHAR(100) UNIQUE NOT NULL,
    lc_id VARCHAR(100),
    contract_id VARCHAR(100),
    amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING',
    collection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bank_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advance_payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    percentage_advance DECIMAL(5, 2) DEFAULT 30.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consignment_payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    contract_id VARCHAR(100),
    amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING',
    consignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settlement_terms VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documentary_collections_lc ON documentary_collections(lc_id);
CREATE INDEX IF NOT EXISTS idx_documentary_collections_status ON documentary_collections(status);
CREATE INDEX IF NOT EXISTS idx_advance_payments_contract ON advance_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_status ON advance_payments(status);
CREATE INDEX IF NOT EXISTS idx_consignment_payments_contract ON consignment_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_consignment_payments_status ON consignment_payments(status);

-- Add comments
COMMENT ON TABLE shipments IS 'Shipping lifecycle tracking - 9 stages from customs clearance to delivery';
COMMENT ON TABLE export_permits IS 'ECTA export permits for coffee shipments';
COMMENT ON TABLE phytosanitary_certificates IS 'Phytosanitary certificates for plant health compliance';
COMMENT ON TABLE certificate_of_origin IS 'Certificates of Origin proving Ethiopian origin';
COMMENT ON TABLE customs_assessments IS 'Customs duty and tax assessments';
COMMENT ON TABLE documentary_collections IS 'Documentary collection payments (D/P, D/A)';
COMMENT ON TABLE advance_payments IS 'Advance payment transactions (pre-shipment financing)';
COMMENT ON TABLE consignment_payments IS 'Consignment payment arrangements';
