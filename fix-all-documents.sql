-- Fix all existing documents and add samples with proper columns

-- First, update all existing documents to have entity_type and entity_id
UPDATE documents 
SET entity_type = 'CONTRACT', 
    entity_id = contract_id
WHERE contract_id IS NOT NULL 
  AND (entity_type IS NULL OR entity_type != 'CONTRACT' OR entity_id IS NULL OR entity_id != contract_id);

-- Now add sample documents to contracts that don't have them
DO $$
DECLARE
  contract_record RECORD;
  doc_type TEXT;
  doc_id TEXT;
  doc_exists BOOLEAN;
  v_timestamp BIGINT;
BEGIN
  FOR contract_record IN 
    SELECT contract_id, status 
    FROM contracts 
    WHERE LOWER(status) IN ('registered', 'approved', 'pending')
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    
    FOREACH doc_type IN ARRAY ARRAY['CONTRACT_SIGNED', 'QUALITY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_PERMIT']
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM documents 
        WHERE contract_id = contract_record.contract_id 
        AND document_type = doc_type
      ) INTO doc_exists;
      
      IF NOT doc_exists THEN
        doc_id := 'DOC_' || v_timestamp || '_' || substr(md5(random()::text || doc_type), 1, 9);
        v_timestamp := v_timestamp + 1;
        
        INSERT INTO documents (
          document_id, entity_type, entity_id, contract_id,
          document_type, file_name, file_hash, mime_type, file_size,
          file_path, uploaded_by, status, verification_status, uploaded_at
        ) VALUES (
          doc_id,
          'CONTRACT',
          contract_record.contract_id,
          contract_record.contract_id,
          doc_type,
          'Sample_' || doc_type || '_' || contract_record.contract_id || '.pdf',
          md5(random()::text || doc_type),
          'application/pdf',
          850,
          '/home/guda/GoCBC/api/uploads/documents/Sample_' || doc_type || '.pdf',
          'system',
          'active',
          CASE WHEN doc_type = 'CONTRACT_SIGNED' THEN 'verified' ELSE 'pending' END,
          NOW()
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Show results
SELECT 
  c.contract_id, 
  COUNT(d.document_id) as total_docs,
  STRING_AGG(d.document_type, ', ' ORDER BY d.document_type) as doc_types
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id
ORDER BY c.created_at DESC
LIMIT 5;
