-- Add missing columns to document_signatures table for approval workflow

DO $$
BEGIN
    -- Add signed_by_role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='document_signatures' AND column_name='signed_by_role'
    ) THEN
        ALTER TABLE document_signatures ADD COLUMN signed_by_role VARCHAR(100);
        RAISE NOTICE 'Added signed_by_role column';
    END IF;

    -- Add approval_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='document_signatures' AND column_name='approval_status'
    ) THEN
        ALTER TABLE document_signatures ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING';
        RAISE NOTICE 'Added approval_status column';
    END IF;

    -- Add approval_level column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='document_signatures' AND column_name='approval_level'
    ) THEN
        ALTER TABLE document_signatures ADD COLUMN approval_level INTEGER DEFAULT 1;
        RAISE NOTICE 'Added approval_level column';
    END IF;

    -- Add signed_by column if it doesn't exist (used by the query)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='document_signatures' AND column_name='signed_by'
    ) THEN
        ALTER TABLE document_signatures ADD COLUMN signed_by VARCHAR(255);
        RAISE NOTICE 'Added signed_by column';
    END IF;
END$$;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_doc_sig_approval_status ON document_signatures(approval_status);
CREATE INDEX IF NOT EXISTS idx_doc_sig_approval_level ON document_signatures(approval_level);
CREATE INDEX IF NOT EXISTS idx_doc_sig_role ON document_signatures(signed_by_role);

-- Add comments for documentation
COMMENT ON COLUMN document_signatures.signed_by_role IS 'Role of the signer (ECTA_INSPECTOR, ECTA_SUPERVISOR, etc.)';
COMMENT ON COLUMN document_signatures.approval_status IS 'Status of approval: PENDING, APPROVED, REJECTED';
COMMENT ON COLUMN document_signatures.approval_level IS 'Sequential approval level (1=first, 2=second, etc.)';
COMMENT ON COLUMN document_signatures.signed_by IS 'Username or identifier of signer';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Missing columns added successfully to document_signatures table';
END$$;
