#!/bin/bash

# Restart API with ECTA Portal Fixes
# This script stops the old API and starts the new one with fixes

echo "========================================"
echo "Restarting API with ECTA Portal Fixes"
echo "========================================"

cd /home/guda/GoCBC/api

# Check if build was successful
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build files not found. Running build first..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check for errors."
        exit 1
    fi
    echo "✅ Build successful"
fi

# Stop existing API process
echo ""
echo "Stopping existing API process..."
pkill -f "node.*server.js" 2>/dev/null && echo "✅ Killed node process" || echo "ℹ️  No node process found"
pm2 stop api 2>/dev/null && echo "✅ Stopped PM2 process" || echo "ℹ️  PM2 not managing API"

# Wait for port to be freed
echo ""
echo "Waiting for port 3001 to be freed..."
sleep 2

# Check if port is still in use
if lsof -i :3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 still in use. Forcing kill..."
    fuser -k 3001/tcp 2>/dev/null
    sleep 2
fi

# Start API
echo ""
echo "Starting API with new code..."
cd /home/guda/GoCBC/api

# Try PM2 first, fall back to direct node
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to start API..."
    pm2 start dist/server.js --name api
    if [ $? -eq 0 ]; then
        echo "✅ API started with PM2"
        echo ""
        echo "View logs with: pm2 logs api"
        echo "Check status with: pm2 status"
    else
        echo "❌ PM2 start failed. Trying direct node..."
        nohup node dist/server.js > api.log 2>&1 &
        echo "✅ API started in background (PID: $!)"
        echo "View logs with: tail -f /home/guda/GoCBC/api/api.log"
    fi
else
    echo "PM2 not found. Starting with node directly..."
    nohup node dist/server.js > api.log 2>&1 &
    echo "✅ API started in background (PID: $!)"
    echo "View logs with: tail -f /home/guda/GoCBC/api/api.log"
fi

# Wait for API to start
echo ""
echo "Waiting for API to start..."
sleep 5

# Check if API is responding
echo ""
echo "Checking API health..."
if curl -f http://localhost:3001/api/v1/health >/dev/null 2>&1; then
    echo "✅ API is healthy and responding on port 3001"
else
    echo "⚠️  API health check failed. It may still be starting up."
    echo "Check logs for any errors."
fi

echo ""
echo "========================================"
echo "Restart complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Test ECTA Portal: http://localhost:3000"
echo "2. Try signing a Certificate of Origin document"
echo "3. Check that shipments load without errors"
echo ""
echo "If issues persist, check logs:"
echo "  - API logs: tail -f /home/guda/GoCBC/api/logs/app.log"
echo "  - PM2 logs: pm2 logs api (if using PM2)"
echo ""
