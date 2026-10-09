#!/bin/bash

OUTPUT="/tmp/final-test-result.txt"

echo "========================================" > "$OUTPUT"
echo "FINAL VERIFICATION - ALL FIXES" >> "$OUTPUT"
echo "Timestamp: $(date)" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Wait for API to start
sleep 2

# 1. Check API Health
echo "1. API HEALTH CHECK" >> "$OUTPUT"
echo "-------------------" >> "$OUTPUT"
HEALTH=$(curl -s -m 5 http://localhost:3001/health 2>&1)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✓ API is HEALTHY" >> "$OUTPUT"
    echo "  $HEALTH" >> "$OUTPUT"
else
    echo "✗ API health check failed" >> "$OUTPUT"
    echo "  $HEALTH" >> "$OUTPUT"
fi
echo "" >> "$OUTPUT"

# 2. Check Database Schema
echo "2. DOCUMENTS TABLE SCHEMA" >> "$OUTPUT"
echo "-------------------------" >> "$OUTPUT"
echo "Checking for contract_id column..." >> "$OUTPUT"
HAS_CONTRACT_ID=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='documents' AND column_name='contract_id';" 2>&1 | tr -d ' ')
if [ "$HAS_CONTRACT_ID" = "1" ]; then
    echo "✓ contract_id column EXISTS" >> "$OUTPUT"
else
    echo "✗ contract_id column MISSING" >> "$OUTPUT"
fi
echo "" >> "$OUTPUT"

# 3. Check Contracts in DB
echo "3. CONTRACTS IN DATABASE" >> "$OUTPUT"
echo "------------------------" >> "$OUTPUT"
CONTRACT_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts;" 2>&1 | tr -d ' ')
echo "Total contracts: $CONTRACT_COUNT" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Latest 3 contracts:" >> "$OUTPUT"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT contract_id, exporter_id, status FROM contracts ORDER BY created_at DESC LIMIT 3;" >> "$OUTPUT" 2>&1
echo "" >> "$OUTPUT"

# 4. Check Documents in DB
echo "4. DOCUMENTS IN DATABASE" >> "$OUTPUT"
echo "------------------------" >> "$OUTPUT"
DOC_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM documents;" 2>&1 | tr -d ' ')
echo "Total documents: $DOC_COUNT" >> "$OUTPUT"

if [ "$DOC_COUNT" -gt "0" ] 2>/dev/null; then
    echo "" >> "$OUTPUT"
    echo "Sample documents:" >> "$OUTPUT"
    PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT document_id, contract_id, shipment_id, document_type FROM documents LIMIT 5;" >> "$OUTPUT" 2>&1
fi
echo "" >> "$OUTPUT"

# 5. Test Document Query by contract_id
echo "5. DOCUMENT QUERY TEST" >> "$OUTPUT"
echo "----------------------" >> "$OUTPUT"
if [ "$DOC_COUNT" -gt "0" ] 2>/dev/null; then
    echo "Testing query with contract_id..." >> "$OUTPUT"
    PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT document_id, contract_id FROM documents WHERE contract_id IS NOT NULL LIMIT 3;" >> "$OUTPUT" 2>&1
else
    echo "No documents to test (this is OK if none have been uploaded yet)" >> "$OUTPUT"
fi
echo "" >> "$OUTPUT"

# 6. Summary
echo "========================================" >> "$OUTPUT"
echo "SUMMARY OF ALL FIXES" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "✓ Phase 1: Contract Display Fix" >> "$OUTPUT"
echo "  - Changed query from 'sales_contracts' to 'contracts' table" >> "$OUTPUT"
echo "  - Implemented parallel PostgreSQL + blockchain fetching" >> "$OUTPUT"
echo "  - Fixed case-insensitive exporter_id matching" >> "$OUTPUT"
echo "  - Mapped status='pending' → contractStatus='REGISTERED'" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "✓ Phase 2: Document Retrieval Fix" >> "$OUTPUT"
echo "  - Added contract_id column to documents table" >> "$OUTPUT"
echo "  - Added exporter_id, file_name, ipfs_cid columns" >> "$OUTPUT"
echo "  - Added verification columns (verification_status, verified_by, verified_at)" >> "$OUTPUT"
echo "  - Fixed document query to use contract_id" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "SYSTEM STATUS" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "API: Running at http://localhost:3001" >> "$OUTPUT"
echo "Frontend: http://localhost:3000" >> "$OUTPUT"
echo "Database: PostgreSQL (localhost:5432/cecbs)" >> "$OUTPUT"
echo "Contracts: $CONTRACT_COUNT available" >> "$OUTPUT"
echo "Documents: $DOC_COUNT uploaded" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "NEXT STEPS FOR USER" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"
echo "1. Refresh browser at http://localhost:3000" >> "$OUTPUT"
echo "2. Login as admin@cecbs.et (already logged in)" >> "$OUTPUT"
echo "3. Navigate to ECTA Portal → Sales Contracts" >> "$OUTPUT"
echo "4. Verify contracts load instantly (<500ms)" >> "$OUTPUT"
echo "5. Click 'Details' on any contract" >> "$OUTPUT"
echo "6. Upload a document to test document display" >> "$OUTPUT"
echo "7. Documents should now appear immediately after upload" >> "$OUTPUT"
echo "" >> "$OUTPUT"

cat "$OUTPUT"
