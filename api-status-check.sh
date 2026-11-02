#!/bin/bash

OUTPUT_FILE="/home/guda/GoCBC/api-status-report.txt"

echo "API Status Check - $(date)" > "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check if process is running
echo "1. Process Check:" >> "$OUTPUT_FILE"
if pgrep -f "node dist/server" > /dev/null; then
    echo "   ✓ Node server process is running" >> "$OUTPUT_FILE"
    pgrep -f "node dist/server" >> "$OUTPUT_FILE"
else
    echo "   ✗ Node server process NOT running" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Check if port is listening
echo "2. Port Check:" >> "$OUTPUT_FILE"
if ss -tuln | grep ":3000" > /dev/null 2>&1; then
    echo "   ✓ Port 3000 is listening" >> "$OUTPUT_FILE"
else
    echo "   ✗ Port 3000 is NOT listening" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test health endpoint
echo "3. Health Endpoint Test:" >> "$OUTPUT_FILE"
HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/health 2>&1)
echo "$HEALTH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Test a data endpoint
echo "4. Banks LC Endpoint Test:" >> "$OUTPUT_FILE"
LC_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "http://localhost:3000/api/banking/lcs?portalId=test-bank" 2>&1 | head -n 20)
echo "$LC_RESPONSE" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "========================================" >> "$OUTPUT_FILE"
echo "Report saved to: $OUTPUT_FILE" >> "$OUTPUT_FILE"

cat "$OUTPUT_FILE"
