#!/bin/bash

echo "Starting log monitor and test..."
echo ""

# Start monitoring logs in background
docker logs cecbs-api --follow 2>&1 | tee /tmp/live_monitor.log &
LOG_PID=$!

sleep 2

echo "Sending test request..."
curl -v -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1 | tee /tmp/curl_result.txt

sleep 2

# Stop log monitoring
kill $LOG_PID 2>/dev/null

echo ""
echo "========== CURL RESULT =========="
cat /tmp/curl_result.txt
echo ""
echo "========== RECENT LOGS =========="
tail -50 /tmp/live_monitor.log
