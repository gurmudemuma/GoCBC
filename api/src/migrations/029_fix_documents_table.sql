-- Migration: Fix Documents Table
-- Description: Adds missing columns to documents table
-- Date: 2026-10-16

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_shipment_id ON documents(shipment_id);
