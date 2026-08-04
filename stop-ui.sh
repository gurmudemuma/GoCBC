#!/bin/bash
# Stop UI Server Only

echo "🛑 Stopping CECBS UI Server..."

if [ -f /tmp/cecbs-ui.pid ]; then
  PID=$(cat /tmp/cecbs-ui.pid)
  if ps -p $PID > /dev/null 2>&1; then
    kill $PID
    echo "✅ UI server stopped (PID: $PID)"
  else
    echo "⚠️  UI server not running"
  fi
  rm /tmp/cecbs-ui.pid
else
  echo "⚠️  UI PID file not found"
fi
