-- Add documents to ALL contracts in the database

DO $$
DECLARE
  contract_record RECORD;
  v_timestamp BIGINT;
  docs_added INTEGER := 0;
  docs_skipped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Adding Documents to All Contracts ===';
  
  FOR contract_record IN 
    SELECT contract_id FROM contracts ORDER BY created_at DESC
  LOOP
    v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    RAISE NOTICE 'Processing: %', contract_record.contract_id;
    
    -- CONTRACT_SIGNED
    IF NOT EXISTS(SELECT 1 FROM documents WHERE contract_id = contract_record.contract_id AND document_type = 'CONTRACT_SIGNED') THEN
      INSERT INTO documents (document_id, entity_type, entity_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
      VALUES ('DOC_' || v_timestamp || '_cs', 'CONTRACT', contract_record.contract_id, contract_record.contract_id, 'CONTRACT_SIGNED', 'Sample_CONTRACT_SIGNED.pdf', md5(random()::text), 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf', 'system', 'active', 'verified', NOW());
      docs_added := docs_added + 1;
      RAISE NOTICE '  ✓ CONTRACT_SIGNED';
    ELSE
      docs_skipped := docs_skipped + 1;
    END IF;
    
    -- QUALITY_CERTIFICATE
    IF NOT EXISTS(SELECT 1 FROM documents WHERE contract_id = contract_record.contract_id AND document_type = 'QUALITY_CERTIFICATE') THEN
      INSERT INTO documents (document_id, entity_type, entity_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
      VALUES ('DOC_' || (v_timestamp + 1) || '_qc', 'CONTRACT', contract_record.contract_id, contract_record.contract_id, 'QUALITY_CERTIFICATE', 'Sample_QUALITY_CERTIFICATE.pdf', md5(random()::text), 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf', 'system', 'active', 'pending', NOW());
      docs_added := docs_added + 1;
      RAISE NOTICE '  ✓ QUALITY_CERTIFICATE';
    ELSE
      docs_skipped := docs_skipped + 1;
    END IF;
    
    -- CERTIFICATE_OF_ORIGIN
    IF NOT EXISTS(SELECT 1 FROM documents WHERE contract_id = contract_record.contract_id AND document_type = 'CERTIFICATE_OF_ORIGIN') THEN
      INSERT INTO documents (document_id, entity_type, entity_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
      VALUES ('DOC_' || (v_timestamp + 2) || '_co', 'CONTRACT', contract_record.contract_id, contract_record.contract_id, 'CERTIFICATE_OF_ORIGIN', 'Sample_CERTIFICATE_OF_ORIGIN.pdf', md5(random()::text), 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf', 'system', 'active', 'pending', NOW());
      docs_added := docs_added + 1;
      RAISE NOTICE '  ✓ CERTIFICATE_OF_ORIGIN';
    ELSE
      docs_skipped := docs_skipped + 1;
    END IF;
    
    -- EXPORT_PERMIT
    IF NOT EXISTS(SELECT 1 FROM documents WHERE contract_id = contract_record.contract_id AND document_type = 'EXPORT_PERMIT') THEN
      INSERT INTO documents (document_id, entity_type, entity_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
      VALUES ('DOC_' || (v_timestamp + 3) || '_ep', 'CONTRACT', contract_record.contract_id, contract_record.contract_id, 'EXPORT_PERMIT', 'Sample_EXPORT_PERMIT.pdf', md5(random()::text), 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_EXPORT_PERMIT.pdf', 'system', 'active', 'pending', NOW());
      docs_added := docs_added + 1;
      RAISE NOTICE '  ✓ EXPORT_PERMIT';
    ELSE
      docs_skipped := docs_skipped + 1;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '===================';
  RAISE NOTICE 'Documents added: %', docs_added;
  RAISE NOTICE 'Already existed: %', docs_skipped;
  RAISE NOTICE '===================';
END $$;

-- Show final summary
SELECT 
  c.contract_id,
  COUNT(d.document_id) as total_docs,
  COUNT(CASE WHEN d.document_type = 'CONTRACT_SIGNED' THEN 1 END) as has_contract,
  COUNT(CASE WHEN d.document_type = 'QUALITY_CERTIFICATE' THEN 1 END) as has_quality,
  COUNT(CASE WHEN d.document_type = 'CERTIFICATE_OF_ORIGIN' THEN 1 END) as has_origin,
  COUNT(CASE WHEN d.document_type = 'EXPORT_PERMIT' THEN 1 END) as has_permit
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
GROUP BY c.contract_id
ORDER BY c.created_at DESC;
