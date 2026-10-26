-- Keep authenticated uploads addressable by every portal entity type.
-- Note: documents table only has shipment_id, not contract_id
-- contract_id exists in the separate contract_documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);

UPDATE documents
SET entity_type = CASE
      WHEN shipment_id IS NOT NULL THEN 'SHIPMENT'
      ELSE entity_type
    END,
    entity_id = COALESCE(entity_id, shipment_id)
WHERE entity_type IS NULL OR entity_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_entity_linkage
  ON documents(entity_type, entity_id);
