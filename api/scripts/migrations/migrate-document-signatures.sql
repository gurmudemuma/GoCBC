-- Document Signature Tracking Migration
-- Adds document_signatures table for blockchain-backed cryptographic signatures
-- with visual PDF stamp tracking

-- ==================== CREATE DOCUMENT_SIGNATURES TABLE ====================

CREATE TABLE IF NOT EXISTS document_signatures (
    id SERIAL PRIMARY KEY,
    signature_id VARCHAR(255) UNIQUE NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    signer_id VARCHAR(255) NOT NULL,
    signer_org VARCHAR(255) NOT NULL,
    signature_type VARCHAR(50) NOT NULL CHECK (signature_type IN ('UPLOAD', 'VERIFY', 'APPROVE', 'REJECT')),
    certificate_id TEXT,
    remarks TEXT,
    blockchain_tx_id VARCHAR(255),
    visual_signature_added BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ADD INDEXES FOR PERFORMANCE ====================

CREATE INDEX IF NOT EXISTS idx_doc_sig_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_signer ON document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_org ON document_signatures(signer_org);
CREATE INDEX IF NOT EXISTS idx_doc_sig_type ON document_signatures(signature_type);
CREATE INDEX IF NOT EXISTS idx_doc_sig_signed_at ON document_signatures(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_sig_blockchain_tx ON document_signatures(blockchain_tx_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_doc_signer ON document_signatures(document_id, signer_id, signed_at DESC);

-- ==================== ADD FOREIGN KEY CONSTRAINTS ====================

-- Link to documents table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_doc_sig_document'
    ) THEN
        ALTER TABLE document_signatures 
        ADD CONSTRAINT fk_doc_sig_document 
        FOREIGN KEY (document_id) 
        REFERENCES documents(document_id) 
        ON DELETE CASCADE;
    END IF;
END$$;

-- ==================== ADD MISSING COLUMNS TO DOCUMENTS TABLE ====================

-- Add signature tracking fields to documents table if they don't exist
DO $$
BEGIN
    -- Check if signature_count column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='signature_count'
    ) THEN
        ALTER TABLE documents ADD COLUMN signature_count INTEGER DEFAULT 0;
    END IF;

    -- Check if last_signed_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='last_signed_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN last_signed_at TIMESTAMP;
    END IF;

    -- Check if last_signed_by column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='last_signed_by'
    ) THEN
        ALTER TABLE documents ADD COLUMN last_signed_by VARCHAR(255);
    END IF;

    -- Check if is_signed column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='is_signed'
    ) THEN
        ALTER TABLE documents ADD COLUMN is_signed BOOLEAN DEFAULT FALSE;
    END IF;

    -- Check if blockchain_synced column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='blockchain_synced'
    ) THEN
        ALTER TABLE documents ADD COLUMN blockchain_synced BOOLEAN DEFAULT FALSE;
    END IF;

    -- Check if blockchain_tx_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='blockchain_tx_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN blockchain_tx_id VARCHAR(255);
    END IF;
END$$;

-- ==================== ADD TRIGGERS FOR AUTOMATIC UPDATES ====================

-- Trigger to update document signature count
CREATE OR REPLACE FUNCTION update_document_signature_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE documents 
    SET 
        signature_count = (
            SELECT COUNT(*) 
            FROM document_signatures 
            WHERE document_id = NEW.document_id
        ),
        last_signed_at = NEW.signed_at,
        last_signed_by = NEW.signer_id,
        is_signed = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE document_id = NEW.document_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_doc_sig_count ON document_signatures;
CREATE TRIGGER trigger_update_doc_sig_count
    AFTER INSERT ON document_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_document_signature_count();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_doc_sig_updated_at ON document_signatures;
CREATE TRIGGER trigger_doc_sig_updated_at
    BEFORE UPDATE ON document_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ==================== ADD COMMENTS FOR DOCUMENTATION ====================

COMMENT ON TABLE document_signatures IS 'Blockchain-backed cryptographic signatures for documents with visual PDF stamps';
COMMENT ON COLUMN document_signatures.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN document_signatures.signature_id IS 'Unique signature identifier (SIG-{documentId}-{org}-{timestamp})';
COMMENT ON COLUMN document_signatures.document_id IS 'Reference to signed document';
COMMENT ON COLUMN document_signatures.signer_id IS 'User ID or certificate subject who signed';
COMMENT ON COLUMN document_signatures.signer_org IS 'Organization/MSP ID of signer';
COMMENT ON COLUMN document_signatures.signature_type IS 'Type of signature: UPLOAD, VERIFY, APPROVE, REJECT';
COMMENT ON COLUMN document_signatures.certificate_id IS 'X.509 certificate ID from blockchain identity';
COMMENT ON COLUMN document_signatures.remarks IS 'Optional remarks or reason for signature';
COMMENT ON COLUMN document_signatures.blockchain_tx_id IS 'Blockchain transaction ID where signature is recorded';
COMMENT ON COLUMN document_signatures.visual_signature_added IS 'Whether visual signature stamp was added to PDF';
COMMENT ON COLUMN document_signatures.signed_at IS 'Timestamp when document was signed';

COMMENT ON COLUMN documents.signature_count IS 'Total number of signatures on this document';
COMMENT ON COLUMN documents.last_signed_at IS 'Timestamp of most recent signature';
COMMENT ON COLUMN documents.last_signed_by IS 'User ID of most recent signer';
COMMENT ON COLUMN documents.is_signed IS 'Whether document has at least one signature';
COMMENT ON COLUMN documents.blockchain_synced IS 'Whether document signatures are synced to blockchain';
COMMENT ON COLUMN documents.blockchain_tx_id IS 'Latest blockchain transaction ID for this document';

-- ==================== CREATE VIEWS FOR REPORTING ====================

-- View: Documents with signature summary
CREATE OR REPLACE VIEW v_documents_with_signatures AS
SELECT 
    d.document_id,
    d.entity_type,
    d.entity_id,
    d.document_type,
    d.file_name,
    d.status,
    d.uploaded_by,
    d.uploaded_at,
    d.signature_count,
    d.last_signed_at,
    d.last_signed_by,
    d.is_signed,
    d.blockchain_synced,
    COUNT(DISTINCT ds.signer_org) as unique_signers,
    STRING_AGG(DISTINCT ds.signature_type, ', ' ORDER BY ds.signature_type) as signature_types,
    MAX(ds.signed_at) as latest_signature_at
FROM documents d
LEFT JOIN document_signatures ds ON d.document_id = ds.document_id
GROUP BY 
    d.document_id, d.entity_type, d.entity_id, d.document_type, 
    d.file_name, d.status, d.uploaded_by, d.uploaded_at,
    d.signature_count, d.last_signed_at, d.last_signed_by,
    d.is_signed, d.blockchain_synced;

COMMENT ON VIEW v_documents_with_signatures IS 'Summary view of documents with signature statistics';

-- View: Signature timeline for audit
CREATE OR REPLACE VIEW v_signature_timeline AS
SELECT 
    ds.signature_id,
    ds.document_id,
    d.file_name,
    d.entity_type,
    d.entity_id,
    ds.signer_id,
    ds.signer_org,
    ds.signature_type,
    ds.remarks,
    ds.blockchain_tx_id,
    ds.visual_signature_added,
    ds.signed_at,
    ROW_NUMBER() OVER (PARTITION BY ds.document_id ORDER BY ds.signed_at) as signature_sequence
FROM document_signatures ds
JOIN documents d ON ds.document_id = d.document_id
ORDER BY ds.signed_at DESC;

COMMENT ON VIEW v_signature_timeline IS 'Chronological timeline of all document signatures';

-- ==================== GRANT PERMISSIONS ====================

-- Grant permissions to application user (adjust username as needed)
DO $$
BEGIN
    -- Grant table permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON document_signatures TO cecbs_user;
    GRANT USAGE, SELECT ON SEQUENCE document_signatures_id_seq TO cecbs_user;
    
    -- Grant view permissions
    GRANT SELECT ON v_documents_with_signatures TO cecbs_user;
    GRANT SELECT ON v_signature_timeline TO cecbs_user;
    
EXCEPTION
    WHEN undefined_object THEN
        -- User might not exist yet, that's okay
        RAISE NOTICE 'User cecbs_user does not exist, skipping permissions';
END$$;

-- ==================== VERIFICATION QUERIES ====================

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'document_signatures'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'document_signatures'
ORDER BY indexname;

-- Verify triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('document_signatures', 'documents')
AND trigger_name LIKE '%sig%'
ORDER BY trigger_name;

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('documents', 'document_signatures')
ORDER BY tablename;

-- ==================== SUCCESS MESSAGE ====================

DO $$
BEGIN
    RAISE NOTICE '✅ Document signature tracking migration completed successfully!';
    RAISE NOTICE '   - document_signatures table created';
    RAISE NOTICE '   - Indexes and constraints added';
    RAISE NOTICE '   - Automatic triggers configured';
    RAISE NOTICE '   - Views created for reporting';
    RAISE NOTICE '   - Ready for blockchain-backed signature tracking';
END$$;
