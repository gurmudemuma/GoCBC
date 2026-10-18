-- Add entity_type and entity_id columns to documents table for compatibility

-- Add entity_type column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE documents ADD COLUMN entity_type VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
        RAISE NOTICE 'Added entity_type column';
    END IF;
END $$;

-- Add entity_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN entity_id VARCHAR(100);
        RAISE NOTICE 'Added entity_id column';
    END IF;
END $$;

-- Update existing documents to have entity_type and entity_id based on contract_id
UPDATE documents 
SET entity_type = 'CONTRACT', entity_id = contract_id
WHERE contract_id IS NOT NULL 
  AND (entity_type IS NULL OR entity_id IS NULL);

-- Verify
SELECT COUNT(*) as total_docs,
       COUNT(CASE WHEN entity_type IS NOT NULL THEN 1 END) as with_entity_type,
       COUNT(CASE WHEN entity_id IS NOT NULL THEN 1 END) as with_entity_id,
       COUNT(CASE WHEN contract_id IS NOT NULL THEN 1 END) as with_contract_id
FROM documents;
