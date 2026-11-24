#!/bin/bash

echo "🔄 Restarting API Server..."
echo ""

# Kill all ts-node-dev processes running server.ts
echo "1. Stopping all running API instances..."
pkill -f "ts-node-dev.*server.ts" && echo "   ✓ Stopped existing processes" || echo "   ℹ No processes found"

# Wait a moment for ports to be released
sleep 2

# Verify port 3001 is free
if ss -tln | grep -q ":3001 "; then
    echo "   ⚠ Port 3001 still in use, forcing cleanup..."
    fuser -k 3001/tcp 2>/dev/null
    sleep 1
fi

echo ""
echo "2. Starting API server..."
cd /home/guda/GoCBC/api
npm run dev > api.log 2>&1 &
API_PID=$!

echo "   ✓ API started (PID: $API_PID)"
echo ""
echo "3. Waiting for API to be ready..."

# Wait up to 30 seconds for API to respond
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✓ API is responding!"
        echo ""
        echo "✅ API successfully restarted"
        echo ""
        echo "Health check:"
        curl -s http://localhost:3001/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/health
        exit 0
    fi
    printf "."
    sleep 1
done

echo ""
echo "   ⚠ API is not responding yet. Check logs with:"
echo "      tail -f /home/guda/GoCBC/api/api.log"
exit 1
