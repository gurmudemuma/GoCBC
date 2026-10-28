#!/bin/bash
# Restart UI Server

set -e

echo "🔄 Restarting CECBS UI Server..."

# Kill ALL processes on port 3000
echo "🛑 Killing all processes on port 3000..."
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS=$(lsof -ti:3000 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "📍 Found processes on port 3000: $PORT_PIDS"
    for pid in $PORT_PIDS; do
      kill -9 $pid 2>/dev/null && echo "  ✓ Killed PID $pid" || true
    done
  fi
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
fi

# Also kill any node processes running Next.js
UI_PIDS=$(ps aux | grep -E "next-server|next dev|npm.*dev.*ui" | grep -v grep | awk '{print $2}' || true)
if [ -n "$UI_PIDS" ]; then
  echo "📍 Found UI node processes: $UI_PIDS"
  for pid in $UI_PIDS; do
    kill -9 $pid 2>/dev/null && echo "  ✓ Killed UI PID $pid" || true
  done
fi

# Remove PID file
rm -f /tmp/cecbs-ui.pid

# Wait for port to be free
sleep 2

echo "✅ All UI processes stopped"

# Start UI using the start script
echo "🚀 Starting UI..."
cd /home/guda/GoCBC
bash scripts/operations/start-ui.sh

echo "✅ UI restart complete"
