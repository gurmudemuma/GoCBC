#!/bin/bash

echo "========================================"
echo "Restarting Frontend Dev Server"
echo "========================================"
echo ""

# Kill any existing Next.js processes
echo "Stopping any running frontend processes..."
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2

# Clear cache
echo "Clearing Next.js cache..."
cd /home/guda/GoCBC/ui
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null

# Start dev server
echo "Starting Next.js dev server..."
cd /home/guda/GoCBC/ui
nohup npm run dev > /tmp/frontend-dev.log 2>&1 &
DEV_PID=$!
echo $DEV_PID > /tmp/frontend-dev.pid

echo ""
echo "Frontend dev server starting..."
echo "PID: $DEV_PID"
echo "Logs: /tmp/frontend-dev.log"
echo ""
echo "Wait 10 seconds for server to start..."
sleep 10

# Check if it's running
if kill -0 $DEV_PID 2>/dev/null; then
    echo "✅ Frontend dev server is running!"
    echo ""
    echo "Access the application at: http://localhost:3000"
    echo ""
    echo "Check logs with: tail -f /tmp/frontend-dev.log"
else
    echo "❌ Frontend dev server failed to start"
    echo ""
    echo "Check logs:"
    tail -30 /tmp/frontend-dev.log
fi
