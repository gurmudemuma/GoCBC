#!/bin/bash
# Start API Server Only

set -e

echo "=================================================="
echo "  Starting CECBS API Server"
echo "=================================================="

cd api

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing API dependencies..."
  npm install
fi

# Kill any existing API process
if [ -f /tmp/cecbs-api.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-api.pid)
  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "🛑 Stopping existing API server (PID: $OLD_PID)..."
    kill $OLD_PID 2>/dev/null || true
    sleep 2
  fi
  rm /tmp/cecbs-api.pid
fi

# Start API server in background
echo "🚀 Starting API server on port 3001..."
nohup npm run dev > ../logs/api.log 2>&1 &
API_PID=$!
echo $API_PID > /tmp/cecbs-api.pid

echo "✅ API server started (PID: $API_PID)"
echo "📋 Logs: tail -f logs/api.log"
echo "🔗 API URL: http://localhost:3001"
echo ""
