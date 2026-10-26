-- Database Schema Fix - Add missing updated_at columns
-- Addresses 500 errors in triggers and general consistency

-- 1. Fix documents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'updated_at') THEN
        ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- 2. Fix audit_log table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_log' AND column_name = 'updated_at') THEN
        ALTER TABLE audit_log ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- 3. Fix document_verifications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verifications' AND column_name = 'updated_at') THEN
        ALTER TABLE document_verifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- 4. Ensure trigger functions work as expected
-- Re-create the modified column trigger just in case
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to documents
DROP TRIGGER IF EXISTS trigger_doc_updated_at ON documents;
CREATE TRIGGER trigger_doc_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Apply updated_at trigger to document_verifications
DROP TRIGGER IF EXISTS trigger_doc_ver_updated_at ON document_verifications;
CREATE TRIGGER trigger_doc_ver_updated_at
    BEFORE UPDATE ON document_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
