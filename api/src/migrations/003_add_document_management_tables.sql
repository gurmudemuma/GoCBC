-- Document Management Tables

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(50) UNIQUE NOT NULL,
    shipment_id VARCHAR(50),
    contract_id VARCHAR(50),
    exporter_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(128) NOT NULL,
    ipfs_cid VARCHAR(100),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(50) NOT NULL,
    upload_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document Verifications
CREATE TABLE IF NOT EXISTS document_verifications (
    id SERIAL PRIMARY KEY,
    verification_id VARCHAR(50) UNIQUE NOT NULL,
    document_id VARCHAR(50) NOT NULL,
    verified_by VARCHAR(50) NOT NULL,
    verified_by_org VARCHAR(50) NOT NULL,
    verification_date TIMESTAMP DEFAULT NOW(),
    verified BOOLEAN NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key only if both tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_verifications') THEN
        ALTER TABLE document_verifications 
        DROP CONSTRAINT IF EXISTS document_verifications_document_id_fkey;
        
        ALTER TABLE document_verifications 
        ADD CONSTRAINT document_verifications_document_id_fkey 
        FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes - only create if column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' AND column_name = 'shipment_id') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_shipment ON documents(shipment_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' AND column_name = 'contract_id') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' AND column_name = 'exporter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_exporter ON documents(exporter_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' AND column_name = 'document_type') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'document_verifications' AND column_name = 'document_id') THEN
        CREATE INDEX IF NOT EXISTS idx_doc_verifications_document ON document_verifications(document_id);
    END IF;
END $$;
