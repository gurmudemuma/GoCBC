#!/bin/bash

echo "=== Force Restarting API ===" > /tmp/api-force-restart.txt

# Kill ALL node processes running the API
echo "1. Killing existing API processes..." >> /tmp/api-force-restart.txt
pkill -9 -f "ts-node-dev.*server.ts" 2>&1 >> /tmp/api-force-restart.txt
pkill -9 -f "node.*api.*server" 2>&1 >> /tmp/api-force-restart.txt
sleep 3

# Verify killed
echo "2. Verifying no API processes remain..." >> /tmp/api-force-restart.txt
ps aux | grep -E "ts-node-dev|api.*server" | grep -v grep >> /tmp/api-force-restart.txt || echo "All API processes killed" >> /tmp/api-force-restart.txt

# Start fresh API
echo "3. Starting API fresh..." >> /tmp/api-force-restart.txt
cd /home/guda/GoCBC/api
nohup npm run dev > /tmp/api-new.log 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID" >> /tmp/api-force-restart.txt

# Wait for startup
echo "4. Waiting 15 seconds for API to start..." >> /tmp/api-force-restart.txt
sleep 15

# Test health
echo "5. Testing API health..." >> /tmp/api-force-restart.txt
curl -s http://localhost:3001/health >> /tmp/api-force-restart.txt 2>&1

echo "" >> /tmp/api-force-restart.txt
echo "6. API startup log (last 20 lines):" >> /tmp/api-force-restart.txt
tail -20 /tmp/api-new.log >> /tmp/api-force-restart.txt

cat /tmp/api-force-restart.txt
