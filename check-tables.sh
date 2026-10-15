#!/bin/bash

echo "Checking both contract tables..."
echo ""

echo "1. Table: contracts"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT COUNT(*) as count, status 
FROM contracts 
GROUP BY status;
" 2>&1

echo ""
echo "2. Table: sales_contracts"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT COUNT(*) as count, contract_status 
FROM sales_contracts 
GROUP BY contract_status;
" 2>&1 || echo "Table 'sales_contracts' does not exist"

echo ""
echo "3. List all tables:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\dt" 2>&1 | grep -E "contracts|sales"
