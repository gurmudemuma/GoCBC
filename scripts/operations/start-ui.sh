#!/bin/bash
# Start UI Server Only

set -e

echo "=================================================="
echo "  Starting CECBS UI Server"
echo "=================================================="

cd ui

# Reuse a healthy Next.js process. Never kill a process just because it owns
# the configured port.
UI_HEADERS=$(curl --max-time 2 -fsSI http://localhost:3000/ 2>/dev/null || true)
if printf '%s' "$UI_HEADERS" | grep -qi '^x-powered-by: Next.js'; then
  echo "✅ CECBS UI is already running on port 3000; leaving it running"
  exit 0
fi

if [ -f /tmp/cecbs-ui.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-ui.pid)
  if [[ "$OLD_PID" =~ ^[0-9]+$ ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "❌ UI PID $OLD_PID is still running but did not identify as Next.js; leaving it untouched"
    exit 1
  fi
  rm -f /tmp/cecbs-ui.pid
fi

if command -v lsof >/dev/null 2>&1; then
  PORT_PID=$(lsof -ti:3000 2>/dev/null || true)
  if [ -n "$PORT_PID" ]; then
    echo "❌ Port 3000 is occupied by PID(s) $PORT_PID; no process was stopped"
    exit 1
  fi
elif command -v ss >/dev/null 2>&1 && ss -ltnH 'sport = :3000' 2>/dev/null | grep -q .; then
  echo "❌ Port 3000 is occupied; no process was stopped"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing UI dependencies..."
  npm install
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
