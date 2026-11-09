#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 INVESTIGATING DATA MISMATCHES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

export PGPASSWORD=cecbs123

echo "1️⃣ ECTA Portal - Exporter Applications Status Values:"
echo "─────────────────────────────────────────────────────────────"
psql -h localhost -U cecbs -d cecbs -c "SELECT DISTINCT status, COUNT(*) FROM exporter_applications GROUP BY status ORDER BY status;"
echo ""

echo "2️⃣ ECTA Portal - Check if PENDING vs pending case issue:"
echo "─────────────────────────────────────────────────────────────"
UPPERCASE_COUNT=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'PENDING';" | xargs)
LOWERCASE_COUNT=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending';" | xargs)
echo "UPPERCASE 'PENDING': ${UPPERCASE_COUNT}"
echo "lowercase 'pending': ${LOWERCASE_COUNT}"
echo ""

echo "3️⃣ Banks Portal - Letters of Credit Count:"
echo "─────────────────────────────────────────────────────────────"
psql -h localhost -U cecbs -d cecbs -c "SELECT COUNT(*) as lc_count FROM letters_of_credit;"
echo ""

echo "4️⃣ Banks Portal - Test API endpoint:"
echo "─────────────────────────────────────────────────────────────"
TOKEN=$(curl -s -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')

LC_RESPONSE=$(curl -s -X GET "http://localhost:5000/api/v1/banking/lc" \
  -H "Authorization: Bearer $TOKEN")
  
LC_COUNT=$(echo "$LC_RESPONSE" | jq '.data | length')
echo "API returns: ${LC_COUNT} LCs"
echo ""
echo "First LC from API:"
echo "$LC_RESPONSE" | jq '.data[0]'
echo ""

echo "5️⃣ Check if API is merging blockchain + database:"
echo "─────────────────────────────────────────────────────────────"
echo "LCs might be coming from both PostgreSQL and blockchain..."
echo "Let's check the LC route implementation"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ INVESTIGATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
