#!/bin/bash

echo "=== Restarting CECBS API ==="

cd /home/guda/GoCBC/api

# Kill any existing API processes
echo "Stopping any running API processes..."
pkill -f "node.*dist/index.js" || true
pkill -f "ts-node.*src/index.ts" || true
sleep 2

# Rebuild
echo "Rebuilding API..."
npm run build

# Start
echo "Starting API..."
NODE_ENV=production node dist/server.js > /tmp/cecbs-api.log 2>&1 &

API_PID=$!
echo "API started with PID: $API_PID"

# Wait and check
sleep 5

if ps -p $API_PID > /dev/null; then
   echo "✅ API is running (PID: $API_PID)"
   echo "Checking health endpoint..."
   curl -s http://localhost:3001/api/v1/health || echo "Health check failed"
else
   echo "❌ API failed to start"
   echo "Last 20 lines of log:"
   tail -20 /tmp/cecbs-api.log
   exit 1
fi

echo ""
echo "API logs: tail -f /tmp/cecbs-api.log"
