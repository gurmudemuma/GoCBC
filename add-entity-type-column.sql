-- Add entity_type column to documents table

DO $$
BEGIN
    -- Add entity_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='entity_type'
    ) THEN
        ALTER TABLE documents ADD COLUMN entity_type VARCHAR(100);
        RAISE NOTICE 'Added entity_type column to documents table';
    END IF;
    
    -- Add entity_id column if it doesn't exist (for flexibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='documents' AND column_name='entity_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN entity_id VARCHAR(255);
        RAISE NOTICE 'Added entity_id column to documents table';
    END IF;
END$$;

-- Update existing documents to set entity_type = 'CONTRACT' based on contract_id
UPDATE documents 
SET entity_type = 'CONTRACT', 
    entity_id = contract_id
WHERE contract_id IS NOT NULL 
  AND (entity_type IS NULL OR entity_type = '');

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_documents_entity_type ON documents(entity_type);
CREATE INDEX IF NOT EXISTS idx_documents_entity_id ON documents(entity_id);

-- Add comment
COMMENT ON COLUMN documents.entity_type IS 'Type of entity the document belongs to (CONTRACT, APPLICATION, SHIPMENT, etc.)';
COMMENT ON COLUMN documents.entity_id IS 'ID of the entity (contract_id, application_id, shipment_id, etc.)';

-- Show results
SELECT 
    document_id, 
    document_type, 
    entity_type, 
    entity_id,
    contract_id
FROM documents 
LIMIT 5;

DO $$
BEGIN
    RAISE NOTICE '✅ entity_type and entity_id columns added successfully!';
    RAISE NOTICE '   - Existing documents updated with entity_type=CONTRACT';
END$$;
