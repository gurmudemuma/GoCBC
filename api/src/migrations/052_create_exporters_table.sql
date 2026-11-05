-- Migration 052: Create exporters table
-- This table stores exporter registration and licensing information

CREATE TABLE IF NOT EXISTS exporters (
  id SERIAL PRIMARY KEY,
  exporter_id VARCHAR(100) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  ecta_license_number VARCHAR(100) UNIQUE NOT NULL,
  license_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  capital_requirement DECIMAL(15, 2),
  laboratory_certified BOOLEAN DEFAULT FALSE,
  professional_taster VARCHAR(255),
  taster_certificate VARCHAR(255),
  license_expiry_date TIMESTAMP,
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  bank_branch_code VARCHAR(50),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_license_status CHECK (license_status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exporters_exporter_id ON exporters(exporter_id);
CREATE INDEX IF NOT EXISTS idx_exporters_license_number ON exporters(ecta_license_number);
CREATE INDEX IF NOT EXISTS idx_exporters_license_status ON exporters(license_status);
CREATE INDEX IF NOT EXISTS idx_exporters_company_name ON exporters(company_name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exporters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exporters_updated_at ON exporters;
CREATE TRIGGER trg_exporters_updated_at
  BEFORE UPDATE ON exporters
  FOR EACH ROW
  EXECUTE FUNCTION update_exporters_updated_at();

-- Insert default test exporter for E2E tests
INSERT INTO exporters (
  exporter_id,
  company_name,
  ecta_license_number,
  license_status,
  capital_requirement,
  laboratory_certified,
  professional_taster,
  taster_certificate,
  license_expiry_date,
  bank_name,
  bank_branch,
  email,
  phone,
  address
) VALUES (
  'EXP-E2E-1793732875',
  'E2E Test Coffee Export Company',
  'ECTA-2024-TEST-001',
  'ACTIVE',
  5000000.00,
  TRUE,
  'Test Taster',
  'CERT-TASTER-001',
  '2027-12-31',
  'Commercial Bank of Ethiopia',
  'Addis Ababa Main Branch',
  'test@e2eexporter.et',
  '+251911000000',
  'Addis Ababa, Ethiopia'
) ON CONFLICT (exporter_id) DO NOTHING;

COMMENT ON TABLE exporters IS 'Coffee exporter registration and licensing information managed by ECTA';
COMMENT ON COLUMN exporters.license_status IS 'License status: ACTIVE, SUSPENDED, EXPIRED, PENDING';
COMMENT ON COLUMN exporters.capital_requirement IS 'Minimum capital requirement in ETB';
COMMENT ON COLUMN exporters.laboratory_certified IS 'Whether exporter has certified coffee testing laboratory';
