#!/bin/bash
# Stop API Server Only

echo "🛑 Stopping CECBS API Server..."

if [ -f /tmp/cecbs-api.pid ]; then
  PID=$(cat /tmp/cecbs-api.pid)
  if ps -p $PID > /dev/null 2>&1; then
    kill $PID
    echo "✅ API server stopped (PID: $PID)"
  else
    echo "⚠️  API server not running"
  fi
  rm /tmp/cecbs-api.pid
else
  echo "⚠️  API PID file not found"
fi
