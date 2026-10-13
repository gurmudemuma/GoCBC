-- Check if documents table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'documents';

-- Count total documents
SELECT COUNT(*) as total_documents FROM documents;

-- Show all document records
SELECT 
  document_id,
  entity_type,
  entity_id,
  document_type,
  file_name,
  uploaded_at
FROM documents
ORDER BY uploaded_at DESC
LIMIT 20;

-- Check for EXPORTER_APPLICATION documents specifically
SELECT 
  document_id,
  entity_type,
  entity_id,
  document_type,
  file_name,
  uploaded_at
FROM documents
WHERE entity_type = 'EXPORTER_APPLICATION'
ORDER BY uploaded_at DESC;

-- Check with case-insensitive search
SELECT 
  document_id,
  entity_type,
  entity_id,
  document_type,
  file_name,
  uploaded_at
FROM documents
WHERE UPPER(entity_type) = 'EXPORTER_APPLICATION'
ORDER BY uploaded_at DESC;

-- Show recent exporter applications for reference
SELECT 
  application_id,
  company_name,
  email,
  status,
  submitted_at
FROM exporter_applications
ORDER BY submitted_at DESC
LIMIT 5;
