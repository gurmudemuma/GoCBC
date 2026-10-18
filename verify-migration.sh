#!/bin/bash

echo "=== Verifying Document Signatures Migration ==="
echo ""

echo "1. Checking if document_signatures table exists..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\d document_signatures" 2>&1 | head -20

echo ""
echo "2. Checking indexes..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT indexname FROM pg_indexes WHERE tablename = 'document_signatures';" 2>&1

echo ""
echo "3. Checking triggers..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'document_signatures';" 2>&1

echo ""
echo "4. Checking views..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT table_name FROM information_schema.views WHERE table_name LIKE '%signature%';" 2>&1

echo ""
echo "5. Checking documents table new columns..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name IN ('signature_count', 'last_signed_at', 'last_signed_by', 'is_signed');" 2>&1

echo ""
echo "=== Verification Complete ==="
