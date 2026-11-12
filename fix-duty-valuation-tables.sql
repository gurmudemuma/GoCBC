-- Fix duty_calculations table
-- Drop and recreate if it exists with wrong schema
DROP TABLE IF EXISTS duty_calculations CASCADE;

CREATE TABLE duty_calculations (
  id SERIAL PRIMARY KEY,
  calculation_id VARCHAR(255) UNIQUE NOT NULL,
  declaration_id VARCHAR(255) NOT NULL,
  customs_value_usd DECIMAL(15,2) NOT NULL,
  customs_value_etb DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,4) NOT NULL,
  hs_code VARCHAR(50),
  origin_country VARCHAR(100),
  duty_rate DECIMAL(5,4) NOT NULL,
  vat_rate DECIMAL(5,4) NOT NULL,
  excise_rate DECIMAL(5,4) DEFAULT 0,
  duty_amount DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  excise_amount DECIMAL(15,2) DEFAULT 0,
  total_duty DECIMAL(15,2) NOT NULL,
  calculated_by VARCHAR(255),
  calculation_date TIMESTAMP NOT NULL,
  preferences_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fix customs_valuations table
DROP TABLE IF EXISTS customs_valuations CASCADE;

CREATE TABLE customs_valuations (
  id SERIAL PRIMARY KEY,
  valuation_id VARCHAR(255) UNIQUE NOT NULL,
  declaration_id VARCHAR(255) NOT NULL,
  declared_value NUMERIC(20,2) NOT NULL,
  adjusted_value NUMERIC(20,2) NOT NULL,
  adjustment_amount NUMERIC(20,2),
  adjustment_percentage NUMERIC(20,4),
  valuation_method VARCHAR(50) NOT NULL,
  adjustment_reason TEXT,
  basis_of_valuation TEXT,
  comparable_goods TEXT,
  market_research TEXT,
  valuation_officer VARCHAR(255),
  supporting_documents JSONB,
  valuation_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  invoice_value NUMERIC(20,2),
  invoice_currency VARCHAR(10),
  adjustments JSONB,
  is_related_party BOOLEAN DEFAULT FALSE,
  comparable_goods_value NUMERIC(20,2),
  comparable_goods_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_duty_calc_declaration ON duty_calculations(declaration_id);
CREATE INDEX IF NOT EXISTS idx_duty_calc_created ON duty_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_valuation_declaration ON customs_valuations(declaration_id);
CREATE INDEX IF NOT EXISTS idx_valuation_created ON customs_valuations(created_at);
