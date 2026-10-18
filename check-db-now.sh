#!/bin/bash
echo "=== Checking Database for Documents ==="
echo ""
echo "Contracts with document counts:"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "
SELECT 
  c.contract_id, 
  c.status,
  COUNT(d.document_id) as docs
FROM contracts c
LEFT JOIN documents d ON d.contract_id = c.contract_id
WHERE LOWER(c.status) IN ('registered', 'approved', 'pending')
GROUP BY c.contract_id, c.status
ORDER BY c.created_at DESC
LIMIT 5;" 2>&1 | grep -v "^$"

echo ""
echo "Recent documents added:"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "
SELECT document_id, contract_id, document_type, uploaded_by
FROM documents
ORDER BY uploaded_at DESC
LIMIT 10;" 2>&1 | grep -v "^$"

echo ""
echo "Total documents in database:"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM documents;" 2>&1 | grep -v "^$"
