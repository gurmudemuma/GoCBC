#!/bin/bash
set -x  # Show all commands

echo "=== EMERGENCY API FIX ==="
cd /home/guda/GoCBC

# Kill everything
killall node 2>/dev/null || true
killall ts-node 2>/dev/null || true
sleep 3

# Rebuild API
echo "Building API..."
cd /home/guda/GoCBC/api
rm -rf dist
npm run build

# Check if build succeeded
if [ ! -f "dist/routes/exporters.js" ]; then
    echo "ERROR: Build failed - dist/routes/exporters.js not found"
    exit 1
fi

# Verify the fix is in compiled code
echo "Checking compiled code for UPPER(exporter_id) fix..."
grep -n "UPPER(exporter_id)" dist/routes/exporters.js || echo "WARNING: Fix not found in compiled code!"

# Start API using compiled code
echo "Starting API..."
cd /home/guda/GoCBC
NODE_ENV=production node api/dist/server.js > /tmp/cecbs-api.log 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID"
echo $API_PID > /tmp/cecbs-api.pid

# Wait for API to start
sleep 5

# Test it
echo "Testing API..."
curl -v http://localhost:3001/health 2>&1 | grep -E "HTTP|status|healthy"

echo ""
echo "=== API LOG (last 30 lines) ==="
tail -30 /tmp/cecbs-api.log

echo ""
echo "=== DONE ==="
echo "If you see 'healthy' above, the API is running."
echo "Now test in browser: http://localhost:3000"
