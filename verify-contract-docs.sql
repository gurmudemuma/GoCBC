-- Check documents for CONTRACT_READY_FOR_APPROVAL

SELECT 
  document_id,
  entity_type,
  entity_id,
  contract_id,
  document_type,
  file_name,
  uploaded_by,
  status,
  verification_status
FROM documents
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL'
   OR entity_id = 'CONTRACT_READY_FOR_APPROVAL'
ORDER BY document_type;

-- Also check if documents exist without proper contract link
SELECT COUNT(*) as total_docs
FROM documents;

-- Check what the contract ID actually is in the contracts table
SELECT contract_id, status, exporter_id, buyer_id
FROM contracts
ORDER BY created_at DESC
LIMIT 5;
