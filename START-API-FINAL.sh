#!/bin/bash

cd /home/guda/GoCBC/api

echo "Starting API in production mode..."
echo "Working directory: $(pwd)"
echo "NODE_ENV: production"
echo ""

# Start API and redirect output
NODE_ENV=production node dist/server.js > /tmp/api-output.log 2>&1 &
PID=$!

echo "API started with PID: $PID"
echo $PID > /tmp/cecbs-api.pid

# Wait a bit
sleep 5

# Check if still running
if ps -p $PID > /dev/null 2>&1; then
    echo "✓ API process is running"
    
    # Test health
    echo ""
    echo "Testing health endpoint..."
    HEALTH=$(curl -s http://localhost:3001/health)
    echo "$HEALTH"
    
    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        echo ""
        echo "✓✓✓ API IS HEALTHY ✓✓✓"
        echo ""
        echo "You can now:"
        echo "1. Refresh the browser at http://localhost:3000"
        echo "2. Login as exp001 / password123"
        echo "3. Go to Contracts tab - should show 20 contracts!"
        echo ""
        echo "API logs: tail -f /tmp/api-output.log"
    else
        echo "✗ API not responding properly"
    fi
else
    echo "✗ API process died immediately"
    echo ""
    echo "Check logs:"
    tail -50 /tmp/api-output.log
fi
