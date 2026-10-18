-- Insert sample documents for the most recent contract
DO $$
DECLARE
  v_contract_id TEXT;
  v_doc_id TEXT;
  v_timestamp BIGINT;
BEGIN
  -- Get the most recent contract
  SELECT contract_id INTO v_contract_id
  FROM contracts
  WHERE LOWER(status) IN ('registered', 'approved', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_contract_id IS NOT NULL THEN
    v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    
    -- Add CONTRACT_SIGNED
    INSERT INTO documents (document_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
    VALUES ('DOC_' || v_timestamp || '_cs', v_contract_id, 'CONTRACT_SIGNED', 'Sample_CONTRACT_SIGNED.pdf', 'hash_cs', 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf', 'system', 'active', 'verified', NOW())
    ON CONFLICT DO NOTHING;
    
    -- Add QUALITY_CERTIFICATE
    INSERT INTO documents (document_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
    VALUES ('DOC_' || (v_timestamp + 1) || '_qc', v_contract_id, 'QUALITY_CERTIFICATE', 'Sample_QUALITY_CERTIFICATE.pdf', 'hash_qc', 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf', 'system', 'active', 'pending', NOW())
    ON CONFLICT DO NOTHING;
    
    -- Add CERTIFICATE_OF_ORIGIN
    INSERT INTO documents (document_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
    VALUES ('DOC_' || (v_timestamp + 2) || '_co', v_contract_id, 'CERTIFICATE_OF_ORIGIN', 'Sample_CERTIFICATE_OF_ORIGIN.pdf', 'hash_co', 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf', 'system', 'active', 'pending', NOW())
    ON CONFLICT DO NOTHING;
    
    -- Add EXPORT_PERMIT
    INSERT INTO documents (document_id, contract_id, document_type, file_name, file_hash, mime_type, file_size, file_path, uploaded_by, status, verification_status, uploaded_at)
    VALUES ('DOC_' || (v_timestamp + 3) || '_ep', v_contract_id, 'EXPORT_PERMIT', 'Sample_EXPORT_PERMIT.pdf', 'hash_ep', 'application/pdf', 850, '/home/guda/GoCBC/api/uploads/documents/Sample_EXPORT_PERMIT.pdf', 'system', 'active', 'pending', NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Added documents to contract: %', v_contract_id;
  END IF;
END $$;

-- Verify
SELECT c.contract_id, c.status, COUNT(d.document_id) as docs
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id, c.status
ORDER BY c.created_at DESC
LIMIT 5;
