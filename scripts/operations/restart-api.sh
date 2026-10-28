#!/bin/bash
# Restart API Server Script
# Ethiopian Coffee Export Consortium Blockchain System

set -e

echo "🔄 Restarting API Server..."

# Kill ALL processes on port 3001
echo "🛑 Killing all processes on port 3001..."
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS=$(lsof -ti:3001 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "📍 Found processes on port 3001: $PORT_PIDS"
    for pid in $PORT_PIDS; do
      kill -9 $pid 2>/dev/null && echo "  ✓ Killed PID $pid" || true
    done
  fi
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 3001/tcp 2>/dev/null || true
fi

# Also kill any node processes running the API
API_PIDS=$(ps aux | grep -E "node.*dist/server|npm.*dev.*api|ts-node-dev.*server" | grep -v grep | awk '{print $2}' || true)
if [ -n "$API_PIDS" ]; then
  echo "📍 Found API node processes: $API_PIDS"
  for pid in $API_PIDS; do
    kill -9 $pid 2>/dev/null && echo "  ✓ Killed API PID $pid" || true
  done
fi

# Remove PID file
rm -f /tmp/cecbs-api.pid

# Wait for port to be free
sleep 2

echo "✅ All API processes stopped"

# Start API using the start script
echo "🚀 Starting API..."
cd /home/guda/GoCBC
bash scripts/operations/start-api.sh

echo "✅ API restart complete"
