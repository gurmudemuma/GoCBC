-- Check the status of CONTRACT_READY_FOR_APPROVAL

SELECT 
  contract_id,
  status,
  exporter_id,
  buyer_id,
  created_at::DATE as created_date,
  (SELECT COUNT(*) FROM documents WHERE contract_id = contracts.contract_id) as doc_count
FROM contracts
WHERE contract_id = 'CONTRACT_READY_FOR_APPROVAL';

-- Also check all contracts to see what we have
SELECT 
  contract_id,
  status,
  created_at::DATE as created_date,
  (SELECT COUNT(*) FROM documents d WHERE d.contract_id = contracts.contract_id) as doc_count
FROM contracts
ORDER BY created_at DESC
LIMIT 10;
