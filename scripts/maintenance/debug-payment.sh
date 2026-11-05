#!/bin/bash

OUTPUT_FILE="/tmp/payment-debug.txt"

echo "=== Payment Debug Report ===" > "$OUTPUT_FILE"
echo "Time: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check API logs for payment issues
echo "=== Recent API Logs (last 200 lines, payment-related) ===" >> "$OUTPUT_FILE"
docker logs cecbs-api 2>&1 | tail -200 | grep -i "payment\|error\|timeout" >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"
echo "=== API Container Status ===" >> "$OUTPUT_FILE"
docker ps --filter "name=cecbs-api" --format "{{.Names}}: {{.Status}}" >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"
echo "=== Test Payment Request ===" >> "$OUTPUT_FILE"

# Try to get LC data first
echo "Fetching LC data..." >> "$OUTPUT_FILE"
LC_RESPONSE=$(curl -s -X GET http://localhost:3001/api/letters-of-credit \
  -H "Authorization: Bearer $(cat /tmp/bank_token.txt 2>/dev/null || echo 'TOKEN_MISSING')" 2>&1)
echo "LC Response: $LC_RESPONSE" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "=== Check Database Connections ===" >> "$OUTPUT_FILE"
docker exec cecbs-postgres psql -U postgres -d cecbs -c "SELECT COUNT(*) as lc_count FROM letters_of_credit;" 2>&1 >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "=== Blockchain Peer Status ===" >> "$OUTPUT_FILE"
docker exec peer0.banks.cecbs.et peer channel list 2>&1 | head -5 >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "=== Payment Route Handler Check ===" >> "$OUTPUT_FILE"
curl -s -X GET http://localhost:3001/api/payments -H "Content-Type: application/json" 2>&1 | head -20 >> "$OUTPUT_FILE"

cat "$OUTPUT_FILE"
