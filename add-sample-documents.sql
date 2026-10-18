-- Add sample documents to contracts that don't have them
-- Run with: PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f add-sample-documents.sql

\echo '=== Adding Sample Documents to Contracts ==='
\echo ''

-- First, show contracts and their document counts
\echo 'Current contracts and document counts:'
SELECT 
  c.contract_id, 
  c.status, 
  COUNT(d.document_id) as doc_count
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id, c.status
ORDER BY c.created_at DESC
LIMIT 10;

\echo ''
\echo 'Adding documents...'
\echo ''

-- Create a temporary function to add documents
DO $$
DECLARE
  contract_record RECORD;
  doc_type TEXT;
  doc_id TEXT;
  doc_exists BOOLEAN;
  docs_added INTEGER := 0;
  docs_skipped INTEGER := 0;
BEGIN
  -- Loop through contracts
  FOR contract_record IN 
    SELECT contract_id, status 
    FROM contracts 
    WHERE LOWER(status) IN ('registered', 'approved', 'pending')
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    RAISE NOTICE 'Processing: %', contract_record.contract_id;
    
    -- Add each required document type
    FOREACH doc_type IN ARRAY ARRAY['CONTRACT_SIGNED', 'QUALITY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_PERMIT']
    LOOP
      -- Check if document already exists
      SELECT EXISTS(
        SELECT 1 FROM documents 
        WHERE contract_id = contract_record.contract_id 
        AND document_type = doc_type
      ) INTO doc_exists;
      
      IF doc_exists THEN
        RAISE NOTICE '  ⏭  % (exists)', doc_type;
        docs_skipped := docs_skipped + 1;
      ELSE
        -- Generate document ID
        doc_id := 'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_' || substr(md5(random()::text), 1, 9);
        
        -- Insert document record
        INSERT INTO documents (
          document_id,
          contract_id,
          document_type,
          file_name,
          file_hash,
          mime_type,
          file_size,
          file_path,
          uploaded_by,
          status,
          verification_status,
          uploaded_at
        ) VALUES (
          doc_id,
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
        
        RAISE NOTICE '  ✓ % added', doc_type;
        docs_added := docs_added + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================';
  RAISE NOTICE 'Documents added: %', docs_added;
  RAISE NOTICE 'Documents skipped: %', docs_skipped;
  RAISE NOTICE '====================';
END $$;

\echo ''
\echo 'Verification - Contracts with documents:'
SELECT 
  c.contract_id, 
  COUNT(d.document_id) as doc_count,
  STRING_AGG(d.document_type, ', ') as doc_types
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id
ORDER BY c.created_at DESC
LIMIT 10;

\echo ''
\echo '=== Complete ==='
