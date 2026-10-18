-- Verify documents were added
\echo '=== Document Verification ==='
\echo ''

\echo 'Contracts with their document counts:'
SELECT 
  c.contract_id, 
  c.status,
  COUNT(d.document_id) as total_docs,
  COUNT(CASE WHEN d.document_type = 'CONTRACT_SIGNED' THEN 1 END) as has_contract,
  COUNT(CASE WHEN d.document_type = 'QUALITY_CERTIFICATE' THEN 1 END) as has_quality,
  COUNT(CASE WHEN d.document_type = 'CERTIFICATE_OF_ORIGIN' THEN 1 END) as has_origin,
  COUNT(CASE WHEN d.document_type = 'EXPORT_PERMIT' THEN 1 END) as has_permit
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id, c.status
ORDER BY c.created_at DESC
LIMIT 5;

\echo ''
\echo 'Sample of documents added:'
SELECT 
  document_id,
  contract_id,
  document_type,
  file_name,
  verification_status,
  uploaded_by,
  TO_CHAR(uploaded_at, 'YYYY-MM-DD HH24:MI:SS') as uploaded_at
FROM documents
WHERE uploaded_by = 'system'
  AND uploaded_at > NOW() - INTERVAL '5 minutes'
ORDER BY uploaded_at DESC
LIMIT 20;
