-- 1. Add missing documents to CONTRACT_READY_FOR_APPROVAL
INSERT INTO documents (
  document_id, entity_type, entity_id, contract_id,
  document_type, file_name, file_hash, mime_type, file_size,
  file_path, uploaded_by, status, verification_status, uploaded_at
) 
SELECT 
  'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000 + n)::BIGINT || '_' || substr(md5(random()::text), 1, 6),
  'CONTRACT',
  'CONTRACT_READY_FOR_APPROVAL',
  'CONTRACT_READY_FOR_APPROVAL',
  doc_type,
  'Sample_' || doc_type || '.pdf',
  md5(random()::text),
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_' || doc_type || '.pdf',
  'system',
  'active',
  CASE WHEN doc_type = 'CONTRACT_SIGNED' THEN 'verified' ELSE 'pending' END,
  NOW()
FROM unnest(ARRAY['CONTRACT_SIGNED', 'QUALITY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_PERMIT']) WITH ORDINALITY AS t(doc_type, n)
WHERE NOT EXISTS (
  SELECT 1 FROM documents 
  WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL' 
  AND document_type = t.doc_type
);

-- 2. Ensure contract has proper status for ECTA review
UPDATE contracts 
SET status = 'REGISTERED'
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL'
  AND status != 'REGISTERED';

-- 3. Show final status
SELECT 
  contract_id,
  status,
  exporter_id,
  buyer_id,
  created_at::TIMESTAMP as created_at,
  (SELECT COUNT(*) FROM documents WHERE contract_id = contracts.contract_id) as total_docs,
  (SELECT STRING_AGG(document_type, ', ') FROM documents WHERE contract_id = contracts.contract_id) as doc_types
FROM contracts
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';
