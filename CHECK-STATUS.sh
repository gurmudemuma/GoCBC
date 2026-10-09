#!/bin/bash

OUTPUT_FILE="/tmp/status-check.txt"

echo "=== API STATUS CHECK ===" > "$OUTPUT_FILE"
echo "Timestamp: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check if process is running
if [ -f "/tmp/cecbs-api.pid" ]; then
    PID=$(cat /tmp/cecbs-api.pid)
    echo "PID from file: $PID" >> "$OUTPUT_FILE"
    if kill -0 "$PID" 2>/dev/null; then
        echo "Status: API process is RUNNING" >> "$OUTPUT_FILE"
    else
        echo "Status: API process is NOT RUNNING" >> "$OUTPUT_FILE"
    fi
else
    echo "Status: No PID file found" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"

# Check port
if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
    echo "Port 3001: LISTENING" >> "$OUTPUT_FILE"
else
    echo "Port 3001: NOT LISTENING" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"

# Try API health check
echo "Health check:" >> "$OUTPUT_FILE"
curl -s -m 5 http://localhost:3001/health >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

# Check database
echo "" >> "$OUTPUT_FILE"
echo "=== DATABASE CHECK ===" >> "$OUTPUT_FILE"
PGPASSWORD=password psql -h localhost -U postgres -d cecbs -c "SELECT COUNT(*) as contract_count FROM contracts;" >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"
echo "=== RECENT CONTRACTS ===" >> "$OUTPUT_FILE"
PGPASSWORD=password psql -h localhost -U postgres -d cecbs -c "SELECT contract_id, exporter_id, status, created_at FROM contracts ORDER BY created_at DESC LIMIT 5;" >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"
echo "Check complete. View results: cat $OUTPUT_FILE"

chmod +x "$OUTPUT_FILE"
cat "$OUTPUT_FILE"
