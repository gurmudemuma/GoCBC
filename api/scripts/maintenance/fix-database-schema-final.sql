-- Final Database Schema Fix
-- Addresses missing tables and columns identified in logs

-- 1. Fix audit_log table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_log' AND column_name = 'ip_address') THEN
        ALTER TABLE audit_log ADD COLUMN ip_address VARCHAR(45);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_log' AND column_name = 'user_agent') THEN
        ALTER TABLE audit_log ADD COLUMN user_agent TEXT;
    END IF;
END$$;

-- 2. Create blockchain_signatures table
CREATE TABLE IF NOT EXISTS blockchain_signatures (
    id SERIAL PRIMARY KEY,
    signature_id VARCHAR(100) UNIQUE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    signer_username VARCHAR(100) NOT NULL,
    signer_org VARCHAR(100) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_entity ON blockchain_signatures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_tx ON blockchain_signatures(blockchain_tx_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sigs_signer ON blockchain_signatures(signer_username);

-- 3. Fix document_verifications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'verification_id') THEN
        ALTER TABLE document_verifications ADD COLUMN verification_id VARCHAR(100) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'verified_by_org') THEN
        ALTER TABLE document_verifications ADD COLUMN verified_by_org VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'verified') THEN
        ALTER TABLE document_verifications ADD COLUMN verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'remarks') THEN
        ALTER TABLE document_verifications ADD COLUMN remarks TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'blockchain_tx_id') THEN
        ALTER TABLE document_verifications ADD COLUMN blockchain_tx_id VARCHAR(255);
    END IF;
    
    -- Ensure verified_by is VARCHAR if it was INTEGER in some versions
    -- (The app uses user.username which is a string)
    ALTER TABLE document_verifications ALTER COLUMN verified_by TYPE VARCHAR(100);
END$$;

-- 4. Ensure documents table has all required columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'contract_id') THEN
        ALTER TABLE documents ADD COLUMN contract_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'exporter_id') THEN
        ALTER TABLE documents ADD COLUMN exporter_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'file_name') THEN
        ALTER TABLE documents ADD COLUMN file_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'mime_type') THEN
        ALTER TABLE documents ADD COLUMN mime_type VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'file_size') THEN
        ALTER TABLE documents ADD COLUMN file_size BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'file_path') THEN
        ALTER TABLE documents ADD COLUMN file_path VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'description') THEN
        ALTER TABLE documents ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'blockchain_tx_id') THEN
        ALTER TABLE documents ADD COLUMN blockchain_tx_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'entity_type') THEN
        ALTER TABLE documents ADD COLUMN entity_type VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'entity_id') THEN
        ALTER TABLE documents ADD COLUMN entity_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'verification_status') THEN
        ALTER TABLE documents ADD COLUMN verification_status VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'verified_at') THEN
        ALTER TABLE documents ADD COLUMN verified_at TIMESTAMP;
    END IF;
    
    -- Fix uploaded_by type if needed
    ALTER TABLE documents ALTER COLUMN uploaded_by TYPE VARCHAR(100);
END$$;
