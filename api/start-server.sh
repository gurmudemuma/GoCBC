#!/bin/bash

# Start CECBS API Server
cd /home/guda/GoCBC/api

echo "================================"
echo "Starting CECBS API Server"
echo "================================"
echo "Time: $(date)"
echo "Directory: $(pwd)"
echo ""

# Check Node.js
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

# Check environment
if [ -f .env ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file missing"
    exit 1
fi

if [ -f dist/server.js ]; then
    echo "✅ dist/server.js found"
else
    echo "❌ dist/server.js missing - run 'npm run build' first"
    exit 1
fi

echo ""
echo "Starting API server..."
echo "Logs will be written to: /tmp/cecbs-api-server.log"
echo ""

# Start the server
exec node dist/server.js 2>&1 | tee /tmp/cecbs-api-server.log
