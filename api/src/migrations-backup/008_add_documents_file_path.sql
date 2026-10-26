-- Migration: Add file_path column to documents table
-- This stores the physical file location on disk

-- Add file_path column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);

-- Update existing documents with placeholder paths (they don't have actual files)
UPDATE documents 
SET file_path = '/placeholder/' || document_id 
WHERE file_path IS NULL AND status = 'active';

-- Add comment
COMMENT ON COLUMN documents.file_path IS 'Physical file path on server disk';
