#!/bin/bash

echo "=== Complete API Restart ===" > /tmp/api-complete-restart.txt

# Kill by port
echo "1. Killing process on port 3001..." >> /tmp/api-complete-restart.txt
lsof -ti:3001 | xargs -r kill -9 2>&1 >> /tmp/api-complete-restart.txt
sleep 2

# Kill by process name
echo "2. Killing ts-node-dev processes..." >> /tmp/api-complete-restart.txt
pkill -9 -f "ts-node-dev" 2>&1 >> /tmp/api-complete-restart.txt
sleep 2

# Verify port is free
echo "3. Verifying port 3001 is free..." >> /tmp/api-complete-restart.txt
PORT_CHECK=$(lsof -ti:3001 2>&1)
if [ -z "$PORT_CHECK" ]; then
  echo "✅ Port 3001 is free" >> /tmp/api-complete-restart.txt
else
  echo "❌ Port 3001 still in use by PID: $PORT_CHECK" >> /tmp/api-complete-restart.txt
  kill -9 $PORT_CHECK 2>&1 >> /tmp/api-complete-restart.txt
  sleep 2
fi

# Start API
echo "4. Starting API..." >> /tmp/api-complete-restart.txt
cd /home/guda/GoCBC/api
nohup npm run dev > /tmp/api-clean.log 2>&1 &
NEW_PID=$!
echo "Started with PID: $NEW_PID" >> /tmp/api-complete-restart.txt

# Wait for startup
echo "5. Waiting 12 seconds for startup..." >> /tmp/api-complete-restart.txt
sleep 12

# Test
echo "6. Testing API..." >> /tmp/api-complete-restart.txt
HEALTH=$(curl -s http://localhost:3001/health 2>&1)
echo "$HEALTH" >> /tmp/api-complete-restart.txt

if echo "$HEALTH" | grep -q "healthy"; then
  echo "✅ API is healthy" >> /tmp/api-complete-restart.txt
else
  echo "❌ API health check failed" >> /tmp/api-complete-restart.txt
  echo "Last 30 log lines:" >> /tmp/api-complete-restart.txt
  tail -30 /tmp/api-clean.log >> /tmp/api-complete-restart.txt
fi

cat /tmp/api-complete-restart.txt
