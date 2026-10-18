-- Add ECTA Required Documents to Contracts
-- This script adds QUALITY_CERTIFICATE, CERTIFICATE_OF_ORIGIN, and EXPORT_PERMIT
-- to contracts that don't have them yet

-- First, let's see what contracts we have
SELECT 
  'Contracts without ECTA documents:' as info,
  c.contract_id,
  c.contract_status,
  COUNT(d.document_id) as doc_count
FROM contracts c
LEFT JOIN documents d ON (d.entity_id = c.contract_id AND d.entity_type = 'CONTRACT')
GROUP BY c.contract_id
HAVING doc_count < 3
ORDER BY c.created_at DESC;

-- For each contract missing documents, we'll insert sample documents
-- Note: You'll need to run the Node.js script for blockchain registration
-- This SQL just prepares the database records

-- Sample data for one contract (replace CONTRACT_ID with actual contract ID)
-- INSERT INTO documents (
--   document_id,
--   entity_type,
--   entity_id,
--   contract_id,
--   document_type,
--   file_name,
--   file_hash,
--   mime_type,
--   file_size,
--   file_path,
--   uploaded_by,
--   status,
--   description,
--   created_at
-- ) VALUES 
-- ('DOC_' || (strftime('%s','now') * 1000) || '_qc', 'CONTRACT', 'CONTRACT_ID', 'CONTRACT_ID', 'QUALITY_CERTIFICATE', 
--  'QUALITY_CERTIFICATE_CONTRACT_ID.pdf', 'sample_hash_qc', 'application/pdf', 5000, 
--  '/uploads/documents/Sample_QUALITY_CERTIFICATE.pdf', 'ecta_system', 'active',
--  'Official quality inspection certificate', datetime('now')),
-- ('DOC_' || (strftime('%s','now') * 1000 + 1) || '_co', 'CONTRACT', 'CONTRACT_ID', 'CONTRACT_ID', 'CERTIFICATE_OF_ORIGIN',
--  'CERTIFICATE_OF_ORIGIN_CONTRACT_ID.pdf', 'sample_hash_co', 'application/pdf', 5000,
--  '/uploads/documents/Sample_CERTIFICATE_OF_ORIGIN.pdf', 'ecta_system', 'active',
--  'Official certificate of Ethiopian origin', datetime('now')),
-- ('DOC_' || (strftime('%s','now') * 1000 + 2) || '_ep', 'CONTRACT', 'CONTRACT_ID', 'CONTRACT_ID', 'EXPORT_PERMIT',
--  'EXPORT_PERMIT_CONTRACT_ID.pdf', 'sample_hash_ep', 'application/pdf', 5000,
--  '/uploads/documents/Sample_EXPORT_PERMIT.pdf', 'ecta_system', 'active',
--  'Official export authorization permit', datetime('now'));
