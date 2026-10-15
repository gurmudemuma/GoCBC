-- ============================================================
-- Migration: Add contract_id column to documents table
-- Date: 2026-10-15
-- Purpose: Fix document retrieval for contracts
-- ============================================================

-- Add contract_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'contract_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN contract_id VARCHAR(100);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
        
        -- Add comment
        COMMENT ON COLUMN documents.contract_id IS 'Reference to contract ID for contract-related documents';
        
        RAISE NOTICE 'Added contract_id column to documents table';
    ELSE
        RAISE NOTICE 'contract_id column already exists in documents table';
    END IF;
END $$;

-- Also ensure exporter_id exists (might be needed for other document types)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'exporter_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN exporter_id VARCHAR(50);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_documents_exporter ON documents(exporter_id);
        
        -- Add comment
        COMMENT ON COLUMN documents.exporter_id IS 'Reference to exporter ID for exporter-related documents';
        
        RAISE NOTICE 'Added exporter_id column to documents table';
    ELSE
        RAISE NOTICE 'exporter_id column already exists in documents table';
    END IF;
END $$;

-- Also add file_name column if it doesn't exist (code uses it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE documents ADD COLUMN file_name VARCHAR(255);
        
        RAISE NOTICE 'Added file_name column to documents table';
    ELSE
        RAISE NOTICE 'file_name column already exists in documents table';
    END IF;
END $$;

-- Also add ipfs_cid column if it doesn't exist (code uses it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'ipfs_cid'
    ) THEN
        ALTER TABLE documents ADD COLUMN ipfs_cid VARCHAR(100);
        
        RAISE NOTICE 'Added ipfs_cid column to documents table';
    ELSE
        RAISE NOTICE 'ipfs_cid column already exists in documents table';
    END IF;
END $$;

-- Add blockchain_tx_id if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'blockchain_tx_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN blockchain_tx_id VARCHAR(255);
        
        RAISE NOTICE 'Added blockchain_tx_id column to documents table';
    ELSE
        RAISE NOTICE 'blockchain_tx_id column already exists in documents table';
    END IF;
END $$;

-- Add verification_status if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE documents ADD COLUMN verification_status VARCHAR(50);
        
        RAISE NOTICE 'Added verification_status column to documents table';
    ELSE
        RAISE NOTICE 'verification_status column already exists in documents table';
    END IF;
END $$;

-- Add verified_by if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE documents ADD COLUMN verified_by VARCHAR(100);
        
        RAISE NOTICE 'Added verified_by column to documents table';
    ELSE
        RAISE NOTICE 'verified_by column already exists in documents table';
    END IF;
END $$;

-- Add verified_at if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN verified_at TIMESTAMP;
        
        RAISE NOTICE 'Added verified_at column to documents table';
    ELSE
        RAISE NOTICE 'verified_at column already exists in documents table';
    END IF;
END $$;

-- Show final schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;
