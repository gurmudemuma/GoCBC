#!/bin/bash

cd /home/guda/GoCBC/api

echo "======================================"
echo " CECBS API Server Restart Script"
echo "======================================"
echo ""

# Kill any existing API servers
echo "Stopping existing API servers..."
pkill -9 -f "node.*server.js" 2>/dev/null || true
pkill -9 -f "npm start" 2>/dev/null || true
sleep 2

# Check required files
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

if [ ! -f "dist/server.js" ]; then
    echo "ERROR: dist/server.js not found! Run 'npm run build' first."
    exit 1
fi

echo "Starting API server on port 3001..."
echo "Logs: /tmp/cecbs-api-running.log"
echo ""

# Start server with nohup
nohup node dist/server.js > /tmp/cecbs-api-running.log 2>&1 &
API_PID=$!

echo "API server started with PID: $API_PID"
echo ""

# Wait and check if it's running
sleep 5

if ps -p $API_PID > /dev/null; then
    echo "✅ API server is running (PID: $API_PID)"
    echo ""
    echo "Testing health endpoint..."
    sleep 2
    curl -s http://localhost:3001/health && echo "" && echo "✅ Health check passed!"
else
    echo "❌ API server failed to start!"
    echo ""
    echo "Last 50 lines of log:"
    tail -50 /tmp/cecbs-api-running.log
    exit 1
fi

echo ""
echo "======================================"
echo " API Server Started Successfully!"
echo "======================================"
