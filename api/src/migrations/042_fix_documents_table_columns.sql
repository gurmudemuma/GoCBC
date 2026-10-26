-- Migration: Fix Documents Table Columns
-- Description: Adds entity columns and blockchain fields to documents table
-- Date: 2026-10-23

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50);

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_exporter_id ON documents(exporter_id);
