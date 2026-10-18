-- Add documents specifically to CONTRACT_READY_FOR_APPROVAL

DO $$
DECLARE
  v_contract_id TEXT := 'CONTRACT_READY_FOR_APPROVAL';
  v_timestamp BIGINT;
  doc_exists BOOLEAN;
BEGIN
  -- Check if contract exists
  IF EXISTS (SELECT 1 FROM contracts WHERE contract_id = v_contract_id) THEN
    v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    
    RAISE NOTICE 'Adding documents to %', v_contract_id;
    
    -- Add CONTRACT_SIGNED
    SELECT EXISTS(SELECT 1 FROM documents WHERE contract_id = v_contract_id AND document_type = 'CONTRACT_SIGNED') INTO doc_exists;
    IF NOT doc_exists THEN
      INSERT INTO documents (
        document_id, entity_type, entity_id, contract_id,
        document_type, file_name, file_hash, mime_type, file_size,
        file_path, uploaded_by, status, verification_status, uploaded_at
      ) VALUES (
        'DOC_' || v_timestamp || '_cs',
        'CONTRACT',
        v_contract_id,
        v_contract_id,
        'CONTRACT_SIGNED',
        'Sample_CONTRACT_SIGNED.pdf',
        md5(random()::text),
        'application/pdf',
        850,
        '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf',
        'system',
        'active',
        'verified',
        NOW()
      );
      RAISE NOTICE '  ✓ CONTRACT_SIGNED added';
    ELSE
      RAISE NOTICE '  ⏭ CONTRACT_SIGNED exists';
    END IF;
    
    -- Add QUALITY_CERTIFICATE
    SELECT EXISTS(SELECT 1 FROM documents WHERE contract_id = v_contract_id AND document_type = 'QUALITY_CERTIFICATE') INTO doc_exists;
    IF NOT doc_exists THEN
      INSERT INTO documents (
        document_id, entity_type, entity_id, contract_id,
        document_type, file_name, file_hash, mime_type, file_size,
        file_path, uploaded_by, status, verification_status, uploaded_at
      ) VALUES (
        'DOC_' || (v_timestamp + 1) || '_qc',
        'CONTRACT',
        v_contract_id,
        v_contract_id,
        'QUALITY_CERTIFICATE',
        'Sample_QUALITY_CERTIFICATE.pdf',
        md5(random()::text),
        'application/pdf',
        850,
        '/home/guda/GoCBC/api/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf',
        'system',
        'active',
        'pending',
        NOW()
      );
      RAISE NOTICE '  ✓ QUALITY_CERTIFICATE added';
    ELSE
      RAISE NOTICE '  ⏭ QUALITY_CERTIFICATE exists';
    END IF;
    
    -- Add CERTIFICATE_OF_ORIGIN
    SELECT EXISTS(SELECT 1 FROM documents WHERE contract_id = v_contract_id AND document_type = 'CERTIFICATE_OF_ORIGIN') INTO doc_exists;
    IF NOT doc_exists THEN
      INSERT INTO documents (
        document_id, entity_type, entity_id, contract_id,
        document_type, file_name, file_hash, mime_type, file_size,
        file_path, uploaded_by, status, verification_status, uploaded_at
      ) VALUES (
        'DOC_' || (v_timestamp + 2) || '_co',
        'CONTRACT',
        v_contract_id,
        v_contract_id,
        'CERTIFICATE_OF_ORIGIN',
        'Sample_CERTIFICATE_OF_ORIGIN.pdf',
        md5(random()::text),
        'application/pdf',
        850,
        '/home/guda/GoCBC/api/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf',
        'system',
        'active',
        'pending',
        NOW()
      );
      RAISE NOTICE '  ✓ CERTIFICATE_OF_ORIGIN added';
    ELSE
      RAISE NOTICE '  ⏭ CERTIFICATE_OF_ORIGIN exists';
    END IF;
    
    -- Add EXPORT_PERMIT
    SELECT EXISTS(SELECT 1 FROM documents WHERE contract_id = v_contract_id AND document_type = 'EXPORT_PERMIT') INTO doc_exists;
    IF NOT doc_exists THEN
      INSERT INTO documents (
        document_id, entity_type, entity_id, contract_id,
        document_type, file_name, file_hash, mime_type, file_size,
        file_path, uploaded_by, status, verification_status, uploaded_at
      ) VALUES (
        'DOC_' || (v_timestamp + 3) || '_ep',
        'CONTRACT',
        v_contract_id,
        v_contract_id,
        'EXPORT_PERMIT',
        'Sample_EXPORT_PERMIT.pdf',
        md5(random()::text),
        'application/pdf',
        850,
        '/home/guda/GoCBC/api/uploads/documents/Sample_EXPORT_PERMIT.pdf',
        'system',
        'active',
        'pending',
        NOW()
      );
      RAISE NOTICE '  ✓ EXPORT_PERMIT added';
    ELSE
      RAISE NOTICE '  ⏭ EXPORT_PERMIT exists';
    END IF;
    
  ELSE
    RAISE NOTICE 'Contract % does not exist!', v_contract_id;
  END IF;
END $$;

-- Verify the documents
SELECT 
  document_id,
  entity_type,
  entity_id,
  document_type,
  verification_status
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL'
ORDER BY document_type;
