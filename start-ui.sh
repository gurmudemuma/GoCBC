#!/bin/bash
# Start UI Server Only

set -e

echo "=================================================="
echo "  Starting CECBS UI Server"
echo "=================================================="

cd ui

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing UI dependencies..."
  npm install
fi

# Kill any existing UI process by PID file
if [ -f /tmp/cecbs-ui.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-ui.pid)
  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "🛑 Stopping existing UI server (PID: $OLD_PID)..."
    kill -9 $OLD_PID 2>/dev/null || true
    sleep 2
  fi
  rm /tmp/cecbs-ui.pid
fi

# Kill any process on port 3000 (handles zombie processes)
echo "🧹 Clearing port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
  echo "  Killing process $PORT_PID on port 3000..."
  kill -9 $PORT_PID 2>/dev/null || true
  sleep 2
fi

# Clean Next.js cache
if [ -d ".next" ]; then
  echo "🧹 Cleaning Next.js cache..."
  rm -rf .next
fi

# Ensure .env.local exists
if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local not found, copying from .env.example"
  cp .env.example .env.local
fi

# Start UI server in background
echo "🚀 Starting UI server on port 3000..."
nohup npm run dev > ../logs/ui.log 2>&1 &
UI_PID=$!
echo $UI_PID > /tmp/cecbs-ui.pid

echo "✅ UI server started (PID: $UI_PID)"
echo "📋 Logs: tail -f logs/ui.log"
echo "🔗 UI URL: http://localhost:3000"
echo ""
