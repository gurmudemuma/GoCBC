-- Get a valid user ID first
SELECT user_id, username FROM users WHERE username = 'ectaAdmin' LIMIT 1;

-- Insert documents with correct uploaded_by (integer user_id or NULL)
BEGIN;

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
  NULL,  -- uploaded_by as NULL since it expects integer
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
  NULL,
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
  NULL,
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
  NULL,
  'active',
  NOW()
);

COMMIT;

-- Verify
SELECT document_id, contract_id, document_type, file_name, status
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL'
ORDER BY document_type;

SELECT COUNT(*) as total FROM documents;
