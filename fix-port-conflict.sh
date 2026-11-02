#!/bin/bash

echo "Fixing Port Conflicts..."
echo "========================"

# Check what's on port 3001
echo "1. Checking port 3001..."
PORT_3001=$(lsof -ti:3001 2>/dev/null)
if [ ! -z "$PORT_3001" ]; then
    echo "   Found process $PORT_3001 on port 3001"
    echo "   Killing it..."
    kill -9 $PORT_3001 2>/dev/null
    sleep 2
    echo "   ✓ Port 3001 cleared"
else
    echo "   Port 3001 is free"
fi

# Check what's on port 3000
echo "2. Checking port 3000..."
PORT_3000=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_3000" ]; then
    echo "   Found process $PORT_3000 on port 3000"  
else
    echo "   Port 3000 is free"
fi

# Kill any old API server processes
echo "3. Cleaning up old API processes..."
pkill -f "node dist/server" 2>/dev/null
sleep 1

# Start API server
echo "4. Starting API server on port 3001..."
cd /home/guda/GoCBC/api
node dist/server.js > /tmp/api-server.log 2>&1 &
API_PID=$!
echo $API_PID > /home/guda/GoCBC/.api.pid
echo "   Started with PID: $API_PID"

# Wait for startup
sleep 5

# Check if it's running
if ps -p $API_PID > /dev/null; then
    echo "   ✓ API server is running"
    
    # Test the endpoints
    echo "5. Testing API endpoints..."
    HEALTH=$(curl -s http://localhost:3001/api/health 2>&1 | head -c 100)
    if echo "$HEALTH" | grep -q "<!DOCTYPE"; then
        echo "   ✗ Still getting HTML"
    else
        echo "   ✓ API health endpoint responding"
    fi
else
    echo "   ✗ API server crashed - check logs"
    tail -n 20 /tmp/api-server.log
fi

echo ""
echo "========================"
