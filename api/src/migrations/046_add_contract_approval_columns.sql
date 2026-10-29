-- Migration 046: Add contract approval columns
-- Adds missing columns required for contract approval workflow

-- Add approval tracking columns to contracts table
ALTER TABLE contracts 
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contracts_approved_by ON contracts(approved_by);
CREATE INDEX IF NOT EXISTS idx_contracts_approved_at ON contracts(approved_at);

-- Create blockchain_signatures table (optional but recommended)
CREATE TABLE IF NOT EXISTS blockchain_signatures (
  id SERIAL PRIMARY KEY,
  signature_id VARCHAR(255) UNIQUE NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  signer_username VARCHAR(255),
  signer_org VARCHAR(100),
  signer_role VARCHAR(50),
  certificate_dn TEXT,
  certificate_fingerprint VARCHAR(255),
  blockchain_tx_id VARCHAR(255),
  blockchain_timestamp TIMESTAMP,
  chaincode_name VARCHAR(100),
  chaincode_function VARCHAR(100),
  transaction_args TEXT,
  endorsing_peers TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for blockchain_signatures
CREATE INDEX IF NOT EXISTS idx_blockchain_signatures_entity ON blockchain_signatures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_signatures_tx_id ON blockchain_signatures(blockchain_tx_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_signatures_signer ON blockchain_signatures(signer_username, signer_org);

-- Create approval_requirements table (optional but recommended)
CREATE TABLE IF NOT EXISTS approval_requirements (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  min_approvers INTEGER DEFAULT 1,
  required_roles TEXT[],
  approval_order INTEGER,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_type, entity_type)
);

-- Create index for approval_requirements
CREATE INDEX IF NOT EXISTS idx_approval_requirements_lookup ON approval_requirements(document_type, entity_type, active);

-- Insert default approval requirements
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, description)
VALUES 
  ('CONTRACT_SIGNED', 'CONTRACT', 1, ARRAY['ECTA', 'ECX'], 'Signed contract document required for export approval'),
  ('PROFORMA_INVOICE', 'CONTRACT', 1, ARRAY['ECTA', 'ECX'], 'Proforma invoice required for export approval')
ON CONFLICT (document_type, entity_type) DO NOTHING;

COMMENT ON COLUMN contracts.approved_by IS 'Username of the user who approved the contract';
COMMENT ON COLUMN contracts.approved_at IS 'Timestamp when the contract was approved';
COMMENT ON COLUMN contracts.rejected_by IS 'Username of the user who rejected the contract';
COMMENT ON COLUMN contracts.rejected_at IS 'Timestamp when the contract was rejected';
