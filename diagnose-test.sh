#!/bin/bash

OUTPUT_FILE="/tmp/diagnose-output.txt"
echo "=== Diagnostic Report $(date) ===" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "1. Checking Docker containers..." >> "$OUTPUT_FILE"
docker ps --format "table {{.Names}}\t{{.Status}}" >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "2. Checking API service..." >> "$OUTPUT_FILE"
curl -s http://localhost:3001/api/v1/health >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "3. Checking CouchDB..." >> "$OUTPUT_FILE"
curl -s http://admin:adminpw@localhost:5984/_all_dbs >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "4. Checking recent API logs..." >> "$OUTPUT_FILE"
tail -50 /home/guda/GoCBC/api/logs/api.log >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "5. Checking blockchain peer status..." >> "$OUTPUT_FILE"
docker ps | grep -c "peer0\." >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "6. Checking if blockchain network is initialized..." >> "$OUTPUT_FILE"
docker ps --format "{{.Names}}" | grep -E "peer|orderer" >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

echo "=== End of Diagnostic ===" >> "$OUTPUT_FILE"

cat "$OUTPUT_FILE"
