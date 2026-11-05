#!/bin/bash

echo "Restarting API Server..."
echo "========================"

# Kill any process on port 3000
echo "1. Checking port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "   Killing process $PORT_PID on port 3000"
    kill -9 $PORT_PID 2>/dev/null
    sleep 2
fi

# Kill any node processes running dist/server.js
echo "2. Killing old API server processes..."
pkill -f "node dist/server" 2>/dev/null
sleep 1

# Clean up old PID file
if [ -f /home/guda/GoCBC/.api.pid ]; then
    rm /home/guda/GoCBC/.api.pid
fi

# Start the API server
echo "3. Starting API server..."
cd /home/guda/GoCBC/api
node dist/server.js > /tmp/api-server.log 2>&1 &
API_PID=$!
echo $API_PID > /home/guda/GoCBC/.api.pid

echo "   API Server started with PID: $API_PID"
sleep 3

# Test the server
echo "4. Testing API server..."
RESPONSE=$(curl -s http://localhost:3000/api/health 2>&1)
if echo "$RESPONSE" | grep -q "<!DOCTYPE html"; then
    echo "   ✗ FAILED: Server returned HTML (frontend is on port 3000)"
    echo "   The frontend is blocking port 3000!"
    echo ""
    echo "   Solution: Stop the UI first, then start API on port 3000"
else
    echo "   ✓ SUCCESS: API server is responding"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "========================"
echo "Server logs: /tmp/api-server.log"
