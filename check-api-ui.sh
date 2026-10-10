#!/bin/bash
echo "=== CHECKING API/UI STATUS ==="
echo ""

# Check PID files
echo "PID Files:"
if [ -f /tmp/cecbs-api.pid ]; then
  API_PID=$(cat /tmp/cecbs-api.pid)
  echo "  API PID file exists: $API_PID"
  if ps -p $API_PID > /dev/null 2>&1; then
    echo "    ✅ Process is running"
  else
    echo "    ❌ Process NOT running"
  fi
else
  echo "  ❌ No API PID file"
fi

if [ -f /tmp/cecbs-ui.pid ]; then
  UI_PID=$(cat /tmp/cecbs-ui.pid)
  echo "  UI PID file exists: $UI_PID"
  if ps -p $UI_PID > /dev/null 2>&1; then
    echo "    ✅ Process is running"
  else
    echo "    ❌ Process NOT running"
  fi
else
  echo "  ❌ No UI PID file"
fi

echo ""
echo "API Log (last 20 lines):"
if [ -f logs/api.log ]; then
  tail -20 logs/api.log
else
  echo "  ❌ No API log found"
fi

echo ""
echo "UI Log (last 20 lines):"
if [ -f logs/ui.log ]; then
  tail -20 logs/ui.log
else
  echo "  ❌ No UI log found"
fi

echo ""
echo "Node processes:"
ps aux | grep -E "node.*api|node.*ui|npm.*dev" | grep -v grep || echo "  No node processes found"
