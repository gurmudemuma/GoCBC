#!/bin/bash

OUTPUT="/tmp/diagnostic-output.txt"

{
  echo "=========================================="
  echo "FINAL DIAGNOSTIC - $(date)"
  echo "=========================================="
  echo ""
  
  echo "1. Checking Node processes:"
  ps aux | grep -E "node|ts-node" | grep -v grep
  echo ""
  
  echo "2. Checking PID file:"
  if [ -f /tmp/cecbs-api.pid ]; then
    PID=$(cat /tmp/cecbs-api.pid)
    echo "PID: $PID"
    if ps -p $PID > /dev/null 2>&1; then
      echo "✓ Process is running"
      ps -p $PID -o pid,cmd
    else
      echo "✗ Process is NOT running"
    fi
  else
    echo "✗ No PID file"
  fi
  echo ""
  
  echo "3. Testing health endpoint:"
  curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3001/health
  echo ""
  
  echo "4. Database check (contracts for EXP001):"
  docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) as count FROM contracts WHERE UPPER(exporter_id) = 'EXP001';"
  echo ""
  
  echo "5. Checking if compiled code has the fix:"
  grep -n "UPPER(exporter_id)" /home/guda/GoCBC/api/dist/routes/exporters.js | head -2
  echo ""
  
  echo "6. Testing login:"
  TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"exp001","password":"password123"}' | jq -r '.token // empty')
  
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✓ Login successful, token: ${TOKEN:0:30}..."
    
    echo ""
    echo "7. Testing contracts endpoint with auth:"
    curl -s -w "\nHTTP Status: %{http_code}\n" \
      -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/v1/exporters/contracts | jq .
  else
    echo "✗ Login failed"
    echo "Response was: $TOKEN"
  fi
  
  echo ""
  echo "=========================================="
  echo "END DIAGNOSTIC"
  echo "=========================================="
  
} > "$OUTPUT" 2>&1

cat "$OUTPUT"
echo ""
echo "Output saved to: $OUTPUT"
