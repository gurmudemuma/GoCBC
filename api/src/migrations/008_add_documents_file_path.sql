-- Migration: Add file_path column to documents table
-- This stores the physical file location on disk

-- Add file_path column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'file_path'
    ) THEN
        ALTER TABLE documents ADD COLUMN file_path TEXT;
        
        -- Add index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
    END IF;
END $$;

-- Update existing documents with placeholder paths (they don't have actual files)
UPDATE documents 
SET file_path = '/placeholder/' || document_id 
WHERE file_path IS NULL AND status = 'active';

COMMENT ON COLUMN documents.file_path IS 'Physical file path on server disk';
