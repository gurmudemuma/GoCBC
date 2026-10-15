#!/bin/bash
# Start API in production mode with proper logging

cd /home/guda/GoCBC/api

# Kill any existing
pkill -f "node.*dist/server.js" 2>/dev/null || true
pkill -f "node.*api" 2>/dev/null || true
sleep 2

# Start fresh
echo "Starting API in production mode..."
NODE_ENV=production nohup node dist/server.js > /tmp/api-console.log 2>&1 &
PID=$!
echo $PID > /tmp/cecbs-api.pid

echo "API started with PID: $PID"
sleep 3

# Check if running
if ps -p $PID > /dev/null; then
    echo "✓ API is running (PID: $PID)"
    
    # Test health
    echo "Testing health endpoint..."
    curl -s http://localhost:3001/health | jq . || echo "Health check failed"
    
    echo ""
    echo "API logs: tail -f /tmp/api-console.log"
else
    echo "✗ API failed to start"
    echo "Check logs:"
    tail -50 /tmp/api-console.log
fi
