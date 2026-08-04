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

# Kill any existing UI process
if [ -f /tmp/cecbs-ui.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-ui.pid)
  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "🛑 Stopping existing UI server (PID: $OLD_PID)..."
    kill $OLD_PID 2>/dev/null || true
    sleep 2
  fi
  rm /tmp/cecbs-ui.pid
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
