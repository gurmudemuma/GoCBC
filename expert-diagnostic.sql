-- EXPERT DIAGNOSTIC: Complete system check

\echo '=== 1. DATABASE SCHEMA CHECK ==='
\d documents

\echo ''
\echo '=== 2. CONTRACT EXISTS? ==='
SELECT contract_id, status, exporter_id, created_at
FROM contracts
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';

\echo ''
\echo '=== 3. DOCUMENTS FOR THIS CONTRACT ==='
SELECT document_id, contract_id, document_type, file_name, status, uploaded_at
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';

\echo ''
\echo '=== 4. ALL DOCUMENTS IN SYSTEM ==='
SELECT COUNT(*), STRING_AGG(DISTINCT contract_id, ', ') as contract_ids
FROM documents;

\echo ''
\echo '=== 5. FILE SYSTEM CHECK ==='
\! ls -lh /home/guda/GoCBC/api/uploads/documents/Sample_*.pdf 2>&1 || echo "Sample files missing"
