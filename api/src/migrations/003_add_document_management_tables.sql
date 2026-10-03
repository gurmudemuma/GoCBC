-- Document Management Tables

-- Enhance Documents table (already exists from base schema)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(100),
ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT NOW();

-- Enhance Document Verifications table (already exists from base schema)
ALTER TABLE document_verifications
ADD COLUMN IF NOT EXISTS verification_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS verified_by_org VARCHAR(50),
ADD COLUMN IF NOT EXISTS verified BOOLEAN,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Update foreign key constraint (drop if exists first to make idempotent)
ALTER TABLE document_verifications 
DROP CONSTRAINT IF EXISTS document_verifications_document_id_fkey;

ALTER TABLE document_verifications 
ADD CONSTRAINT document_verifications_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_shipment ON documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_exporter ON documents(exporter_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_verifications_document ON document_verifications(document_id);
