-- First, check what columns actually exist in documents table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- Show current documents
SELECT document_id, contract_id, document_type, file_name
FROM documents;

-- Delete any existing test documents for CONTRACT_READY_FOR_APPROVAL
DELETE FROM documents WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';

-- Now insert fresh documents with only the columns that exist
INSERT INTO documents (
  document_id, contract_id, document_type, file_name,
  file_hash, mime_type, file_size, file_path,
  uploaded_by, status, uploaded_at
) VALUES 
(
  'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_001',
  'CONTRACT_READY_FOR_APPROVAL',
  'CONTRACT_SIGNED',
  'Sample_CONTRACT_SIGNED.pdf',
  md5(random()::text),
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_CONTRACT_SIGNED.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_002',
  'CONTRACT_READY_FOR_APPROVAL',
  'QUALITY_CERTIFICATE',
  'Sample_QUALITY_CERTIFICATE.pdf',
  md5(random()::text),
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_003',
  'CONTRACT_READY_FOR_APPROVAL',
  'CERTIFICATE_OF_ORIGIN',
  'Sample_CERTIFICATE_OF_ORIGIN.pdf',
  md5(random()::text),
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf',
  'system',
  'active',
  NOW()
),
(
  'DOC_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_004',
  'CONTRACT_READY_FOR_APPROVAL',
  'EXPORT_PERMIT',
  'Sample_EXPORT_PERMIT.pdf',
  md5(random()::text),
  'application/pdf',
  850,
  '/home/guda/GoCBC/api/uploads/documents/Sample_EXPORT_PERMIT.pdf',
  'system',
  'active',
  NOW()
);

-- Verify documents were added
SELECT document_id, contract_id, document_type, file_name, status
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL'
ORDER BY document_type;
