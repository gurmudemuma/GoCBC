#!/bin/bash

echo "=========================================="
echo "CECBS API - Complete Restart"
echo "=========================================="

# Kill any existing API processes
echo "Stopping any existing API processes..."
pkill -9 -f "node.*server.js" 2>/dev/null
pkill -9 -f "node.*dist/server" 2>/dev/null
sleep 2

# Rebuild
echo "Rebuilding API..."
cd /home/guda/GoCBC/api
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Start API
echo "Starting API server..."
cd /home/guda/GoCBC/api

JWT_SECRET="cecbs-secret-key-change-in-production-use-at-least-32-characters" \
DOCUMENT_ENCRYPTION_KEY="cecbs_document_encryption_key_2026_change_in_production_64chars" \
NODE_ENV="development" \
nohup node dist/server.js > /tmp/api-running.log 2>&1 &

API_PID=$!
echo $API_PID > /tmp/cecbs-api.pid

echo "API starting with PID: $API_PID"
echo "Waiting for API to initialize..."
sleep 6

# Check if it's running
if kill -0 $API_PID 2>/dev/null; then
    echo "✅ API process is running"
    
    # Test health endpoint
    HEALTH=$(curl -s http://localhost:3001/health 2>&1)
    if echo "$HEALTH" | grep -q "healthy"; then
        echo "✅ API is HEALTHY!"
        echo "$HEALTH"
    else
        echo "⚠️  API process running but health check failed"
        echo "Response: $HEALTH"
        echo ""
        echo "Last 20 lines of log:"
        tail -20 /tmp/api-running.log
    fi
else
    echo "❌ API process failed to start"
    echo ""
    echo "Last 30 lines of log:"
    tail -30 /tmp/api-running.log
    exit 1
fi

echo ""
echo "=========================================="
echo "API Information:"
echo "  URL: http://localhost:3001"
echo "  PID: $API_PID"
echo "  Logs: /tmp/api-running.log"
echo "=========================================="
