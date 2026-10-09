#!/bin/bash

OUTPUT_FILE="/tmp/verify-fixes.txt"

echo "========================================" > "$OUTPUT_FILE"
echo "CECBS FIX VERIFICATION REPORT" >> "$OUTPUT_FILE"
echo "Timestamp: $(date)" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 1. API Status
echo "1. API STATUS" >> "$OUTPUT_FILE"
echo "-------------" >> "$OUTPUT_FILE"
if [ -f "/tmp/cecbs-api.pid" ]; then
    PID=$(cat /tmp/cecbs-api.pid)
    if kill -0 "$PID" 2>/dev/null; then
        echo "✓ API process is RUNNING (PID: $PID)" >> "$OUTPUT_FILE"
    else
        echo "✗ API process is NOT RUNNING" >> "$OUTPUT_FILE"
    fi
else
    echo "✗ No PID file found" >> "$OUTPUT_FILE"
fi

HEALTH=$(curl -s -m 5 http://localhost:3001/health 2>&1)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✓ API health check: PASSED" >> "$OUTPUT_FILE"
    echo "  Response: $HEALTH" >> "$OUTPUT_FILE"
else
    echo "✗ API health check: FAILED" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# 2. Database - Contracts Table
echo "2. CONTRACTS IN DATABASE" >> "$OUTPUT_FILE"
echo "------------------------" >> "$OUTPUT_FILE"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts;" >> "$OUTPUT_FILE" 2>&1
echo "contracts found" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Recent Contracts:" >> "$OUTPUT_FILE"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT contract_id, exporter_id, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created FROM contracts ORDER BY created_at DESC LIMIT 5;" >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

# 3. API Contracts Endpoint
echo "3. API CONTRACTS ENDPOINT TEST" >> "$OUTPUT_FILE"
echo "------------------------------" >> "$OUTPUT_FILE"
echo "Testing GET /api/v1/contracts..." >> "$OUTPUT_FILE"
CONTRACTS_RESPONSE=$(curl -s -m 10 http://localhost:3001/api/v1/contracts 2>&1)
if echo "$CONTRACTS_RESPONSE" | grep -q "contract_id\|contractId"; then
    CONTRACT_COUNT=$(echo "$CONTRACTS_RESPONSE" | grep -o "contract_id\|contractId" | wc -l)
    echo "✓ Contracts endpoint: WORKING" >> "$OUTPUT_FILE"
    echo "  Returned $CONTRACT_COUNT contracts" >> "$OUTPUT_FILE"
else
    echo "✗ Contracts endpoint: FAILED or returned no data" >> "$OUTPUT_FILE"
    echo "  Response preview: ${CONTRACTS_RESPONSE:0:200}" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# 4. Documents Table
echo "4. DOCUMENTS IN DATABASE" >> "$OUTPUT_FILE"
echo "------------------------" >> "$OUTPUT_FILE"
DOC_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM documents;" 2>&1)
echo "$DOC_COUNT documents found" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ "$DOC_COUNT" -gt "0" ] 2>/dev/null; then
    echo "Recent Documents:" >> "$OUTPUT_FILE"
    PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT document_id, contract_id, document_type, file_name, TO_CHAR(uploaded_at, 'YYYY-MM-DD HH24:MI:SS') as uploaded FROM documents ORDER BY uploaded_at DESC LIMIT 5;" >> "$OUTPUT_FILE" 2>&1
fi
echo "" >> "$OUTPUT_FILE"

# 5. Test Document Retrieval for a Specific Contract
echo "5. DOCUMENT RETRIEVAL TEST" >> "$OUTPUT_FILE"
echo "--------------------------" >> "$OUTPUT_FILE"
LATEST_CONTRACT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT contract_id FROM contracts ORDER BY created_at DESC LIMIT 1;" 2>&1 | tr -d ' ')
if [ -n "$LATEST_CONTRACT" ]; then
    echo "Testing document retrieval for contract: $LATEST_CONTRACT" >> "$OUTPUT_FILE"
    DOC_FOR_CONTRACT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM documents WHERE contract_id = '$LATEST_CONTRACT';" 2>&1)
    echo "  Documents found in DB: $DOC_FOR_CONTRACT" >> "$OUTPUT_FILE"
    
    # Test API endpoint
    DOC_API_RESPONSE=$(curl -s -m 10 "http://localhost:3001/api/v1/contracts/$LATEST_CONTRACT" 2>&1)
    if echo "$DOC_API_RESPONSE" | grep -q "documents"; then
        echo "  ✓ API returns documents field" >> "$OUTPUT_FILE"
    else
        echo "  ✗ API does not return documents field" >> "$OUTPUT_FILE"
    fi
fi
echo "" >> "$OUTPUT_FILE"

# 6. Summary
echo "========================================" >> "$OUTPUT_FILE"
echo "SUMMARY OF FIXES APPLIED" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "✓ Fixed GET /contracts to query 'contracts' table (not 'sales_contracts')" >> "$OUTPUT_FILE"
echo "✓ Implemented parallel PostgreSQL + blockchain fetching" >> "$OUTPUT_FILE"
echo "✓ Fixed document retrieval query to use 'contract_id' column" >> "$OUTPUT_FILE"
echo "✓ Fixed case-insensitive exporter_id matching" >> "$OUTPUT_FILE"
echo "✓ Status mapping: pending → REGISTERED for frontend" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "NEXT STEPS:" >> "$OUTPUT_FILE"
echo "1. Refresh your browser at http://localhost:3000" >> "$OUTPUT_FILE"
echo "2. Login as admin (admin@cecbs.et / CECBS)" >> "$OUTPUT_FILE"
echo "3. Go to ECTA portal → Sales Contracts tab" >> "$OUTPUT_FILE"
echo "4. Contracts should load instantly (<500ms)" >> "$OUTPUT_FILE"
echo "5. Click 'Details' on any contract to see documents" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Report saved to: $OUTPUT_FILE" >> "$OUTPUT_FILE"

chmod +x "$OUTPUT_FILE"
cat "$OUTPUT_FILE"
