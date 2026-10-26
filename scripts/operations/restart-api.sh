#!/bin/bash
# Restart API Server Script
# Ethiopian Coffee Export Consortium Blockchain System

echo "🔄 Restarting API Server..."

# Find API process
API_PID=$(ps aux | grep "node dist/server.js" | grep -v grep | awk '{print $2}')

if [ -n "$API_PID" ]; then
  echo "📍 Found API running with PID: $API_PID"
  echo "🛑 Stopping API..."
  kill $API_PID
  sleep 2
  
  # Check if still running
  if ps -p $API_PID > /dev/null 2>&1; then
    echo "⚠️  API didn't stop gracefully, forcing..."
    kill -9 $API_PID
  fi
  echo "✅ API stopped"
else
  echo "ℹ️  API not currently running"
fi

# Start API
echo "🚀 Starting API..."
cd /home/guda/GoCBC/api

# Run in background and redirect logs
nohup node dist/server.js > ../api.log 2>&1 &
NEW_PID=$!

echo "✅ API started with PID: $NEW_PID"
echo "📝 Logs: /home/guda/GoCBC/api.log"

# Wait a moment and check if it's running
sleep 3

if ps -p $NEW_PID > /dev/null 2>&1; then
  echo "✅ API is running successfully!"
  echo "🔗 API URL: http://localhost:3001"
  echo "📊 Test endpoint: curl http://localhost:3001/api/v1/banking/lc"
else
  echo "❌ API failed to start. Check logs:"
  echo "   tail -f /home/guda/GoCBC/api.log"
  exit 1
fi
