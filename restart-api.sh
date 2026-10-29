#!/bin/bash

# Kill existing API
pkill -f "ts-node-dev.*server.ts"
sleep 3

# Start API in background
cd /home/guda/GoCBC/api
nohup npm run dev > /tmp/api-restart.log 2>&1 &

# Wait for API to start
echo "Waiting for API to start..."
sleep 10

# Test API
curl -s http://localhost:3001/health | jq .

echo ""
echo "API logs (last 30 lines):"
tail -30 /tmp/api-restart.log
