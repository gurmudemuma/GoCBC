#!/bin/bash
#############################################################################
# Restart API Server
# Kills existing API process and starts fresh
#############################################################################

echo "Stopping API server..."
pkill -f "ts-node.*api/src/server.ts" || pkill -f "node.*api.*server" || true
sleep 2

echo "Starting API server..."
cd /home/guda/GoCBC/api
npm run dev > ../logs/api.log 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID"

# Wait for API to be ready
echo "Waiting for API to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "✅ API is ready!"
    exit 0
  fi
  sleep 1
done

echo "❌ API failed to start within 30 seconds"
exit 1
