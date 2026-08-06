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

# Kill any existing API process by PID file
if [ -f /tmp/cecbs-api.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-api.pid)
  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "🛑 Stopping existing API server (PID: $OLD_PID)..."
    kill -9 $OLD_PID 2>/dev/null || true
    sleep 2
  fi
  rm /tmp/cecbs-api.pid
fi

# Kill any process on port 3001 (handles zombie processes)
echo "🧹 Clearing port 3001..."
PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
  echo "  Killing process $PORT_PID on port 3001..."
  kill -9 $PORT_PID 2>/dev/null || true
  sleep 2
fi

# Ensure .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  .env not found, copying from .env.example"
  cp .env.example .env
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
