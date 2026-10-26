-- ============================================================================
-- Check Documents for Exporter Applications
-- ============================================================================
-- This script helps diagnose why documents aren't showing in ECTA portal
-- ============================================================================

\echo '=========================================='
\echo '  Checking Exporter Application Documents'
\echo '=========================================='
\echo ''

-- 1. Check recent applications
\echo '1. Recent Applications:'
\echo '--------------------'
SELECT 
  application_id,
  company_name,
  email,
  status,
  TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted
FROM exporter_applications
ORDER BY submitted_at DESC
LIMIT 5;

\echo ''
\echo '2. Documents Table - All Entity Types:'
\echo '------------------------------------'
SELECT 
  entity_type,
  COUNT(*) as document_count
FROM documents
GROUP BY entity_type
ORDER BY document_count DESC;

\echo ''
\echo '3. Documents for EXPORTER_APPLICATION:'
\echo '-----------------------------------'
SELECT 
  document_id,
  entity_id as application_id,
  document_type,
  file_name,
  file_size,
  TO_CHAR(uploaded_at, 'YYYY-MM-DD HH24:MI:SS') as uploaded
FROM documents
WHERE entity_type = 'EXPORTER_APPLICATION'
ORDER BY uploaded_at DESC
LIMIT 10;

\echo ''
\echo '4. Applications with Document Count:'
\echo '---------------------------------'
SELECT 
  a.application_id,
  a.company_name,
  a.status,
  COUNT(d.document_id) as document_count
FROM exporter_applications a
LEFT JOIN documents d ON d.entity_id = a.application_id 
  AND d.entity_type = 'EXPORTER_APPLICATION'
GROUP BY a.application_id, a.company_name, a.status
ORDER BY a.submitted_at DESC
LIMIT 10;

\echo ''
\echo '5. Case Sensitivity Check:'
\echo '----------------------'
SELECT 
  entity_type,
  COUNT(*) as count,
  CASE 
    WHEN entity_type = 'EXPORTER_APPLICATION' THEN '✓ Correct'
    WHEN UPPER(entity_type) = 'EXPORTER_APPLICATION' THEN '⚠ Case mismatch'
    ELSE '✗ Wrong value'
  END as status
FROM documents
WHERE UPPER(entity_type) LIKE '%EXPORTER%'
GROUP BY entity_type;

\echo ''
\echo '6. Sample Document Details (Most Recent):'
\echo '--------------------------------------'
SELECT 
  d.document_id,
  d.entity_type,
  d.entity_id,
  d.document_type,
  d.file_name,
  d.file_size,
  d.status,
  d.uploaded_by,
  TO_CHAR(d.uploaded_at, 'YYYY-MM-DD HH24:MI:SS') as uploaded,
  a.company_name,
  a.status as application_status
FROM documents d
LEFT JOIN exporter_applications a ON d.entity_id = a.application_id
WHERE d.entity_type = 'EXPORTER_APPLICATION'
ORDER BY d.uploaded_at DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo '  Summary'
\echo '=========================================='
\echo ''
\echo 'If no documents found:'
\echo '  1. Documents are not being uploaded'
\echo '  2. Check browser console during registration'
\echo '  3. Check API logs: pm2 logs gocbc-api'
\echo ''
\echo 'If documents found but wrong entity_type:'
\echo '  1. Case sensitivity issue'
\echo '  2. Fix: Make queries case-insensitive'
\echo ''
\echo 'If documents found with correct entity_type:'
\echo '  1. Check API endpoint response'
\echo '  2. Check browser console in ECTA portal'
\echo '  3. Check network tab for /documents/entity/ request'
\echo ''
