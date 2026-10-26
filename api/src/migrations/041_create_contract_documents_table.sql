-- Migration: Create Contract Documents Junction Table
-- Description: Creates junction table to link contracts with documents (many-to-many relationship)
-- Date: 2026-10-22
-- Version: 1.0

-- ============================================================================
-- CONTRACT DOCUMENTS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_documents (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(100) NOT NULL,
    document_id VARCHAR(100) NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_by INTEGER,
    notes TEXT,
    UNIQUE(contract_id, document_id),
    CONSTRAINT fk_contract 
        FOREIGN KEY (contract_id) 
        REFERENCES contracts(contract_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_document 
        FOREIGN KEY (document_id) 
        REFERENCES documents(document_id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id 
    ON contract_documents(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_documents_document_id 
    ON contract_documents(document_id);

-- Add comment for documentation
COMMENT ON TABLE contract_documents IS 'Junction table linking contracts to their related documents';
COMMENT ON COLUMN contract_documents.contract_id IS 'Reference to the contract';
COMMENT ON COLUMN contract_documents.document_id IS 'Reference to the associated document';
COMMENT ON COLUMN contract_documents.linked_at IS 'Timestamp when the document was linked to the contract';
COMMENT ON COLUMN contract_documents.linked_by IS 'User ID who linked the document';
