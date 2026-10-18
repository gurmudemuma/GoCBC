-- EXPERT FIX: Insert documents with full transaction control and verification

BEGIN;

-- Insert 4 documents
INSERT INTO documents (
  document_id, contract_id, document_type, file_name, file_hash,
  mime_type, file_size, file_path, uploaded_by, status, uploaded_at
) VALUES 
(
  'DOC_CERT_ORIGIN_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  'CONTRACT_READY_FOR_APPROVAL',
  'CERTIFICATE_OF_ORIGIN',
  'Sample_CERTIFICATE_OF_ORIGIN.pdf',
  md5(random()::text),
  'application/pdf',
  938,
  '/home/guda/GoCBC/api/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_CONTRACT_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  'CONTRACT_READY_FOR_APPROVAL',
  'CONTRACT_SIGNED',
  'Sample_CONTRACT_SIGNED.pdf',
  md5(random()::text),
  'application/pdf',
  770,
  '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_EXPORT_PERMIT_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  'CONTRACT_READY_FOR_APPROVAL',
  'EXPORT_PERMIT',
  'Sample_EXPORT_PERMIT.pdf',
  md5(random()::text),
  'application/pdf',
  915,
  '/home/guda/GoCBC/api/uploads/documents/Sample_EXPORT_PERMIT.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_QUALITY_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  'CONTRACT_READY_FOR_APPROVAL',
  'QUALITY_CERTIFICATE',
  'Sample_QUALITY_CERTIFICATE.pdf',
  md5(random()::text),
  'application/pdf',
  929,
  '/home/guda/GoCBC/api/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf',
  'system',
  'active',
  NOW()
);

-- Verify insertion
SELECT document_id, contract_id, document_type, file_name
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';

COMMIT;

-- Final verification
\echo ''
\echo '=== FINAL COUNT ==='
SELECT COUNT(*) as total_docs FROM documents;
SELECT COUNT(*) as contract_docs FROM documents WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';
