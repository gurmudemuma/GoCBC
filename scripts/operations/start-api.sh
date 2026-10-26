#!/bin/bash
# Start API Server Only

set -e

echo "=================================================="
echo "  Starting CECBS API Server"
echo "=================================================="

cd api

# Reuse a live API process, including the Docker-managed API. Liveness is
# separate from Fabric readiness: /ready may return 503 while the API itself
# is healthy, and must not cause a second server to be started on the same port.
API_HEALTH=$(curl --max-time 2 -fsS http://localhost:3001/health 2>/dev/null || true)
if printf '%s' "$API_HEALTH" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
  echo "✅ CECBS API is already healthy on port 3001; leaving it running"
  if curl --max-time 3 -fsS http://localhost:3001/ready >/dev/null 2>&1; then
    echo "✅ CECBS API and Fabric ledger are ready"
  else
    echo "⚠️  API is healthy but Fabric is not ready yet; keeping the existing API process"
  fi
  exit 0
fi

if [ -f /tmp/cecbs-api.pid ]; then
  OLD_PID=$(cat /tmp/cecbs-api.pid)
  if [[ "$OLD_PID" =~ ^[0-9]+$ ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "❌ API PID $OLD_PID is still running but did not pass /health; leaving it untouched"
    exit 1
  fi
  rm -f /tmp/cecbs-api.pid
fi

if command -v lsof >/dev/null 2>&1; then
  PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
  if [ -n "$PORT_PID" ]; then
    echo "❌ Port 3001 is occupied by PID(s) $PORT_PID; no process was stopped"
    exit 1
  fi
elif command -v ss >/dev/null 2>&1 && ss -ltnH 'sport = :3001' 2>/dev/null | grep -q .; then
  echo "❌ Port 3001 is occupied; no process was stopped"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing API dependencies..."
  npm install
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
