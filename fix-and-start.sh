#!/bin/bash
# Complete fix and restart script

set -e

echo "========================================="
echo "  CECBS Complete Fix and Restart"
echo "========================================="
echo ""

cd /home/guda/GoCBC

# Step 1: Kill everything
echo "Step 1: Stopping all services..."
./kill-ports.sh 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
pkill -f "ts-node-dev" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 3

# Step 2: Start Docker containers
echo ""
echo "Step 2: Starting Docker containers..."
if [ -f "docker-compose-fabric.yml" ]; then
    docker-compose -f docker-compose-fabric.yml up -d
    echo "✓ Docker containers started"
else
    echo "✗ docker-compose-fabric.yml not found!"
    exit 1
fi

# Step 3: Wait for containers
echo ""
echo "Step 3: Waiting for containers to initialize (30 seconds)..."
sleep 30

# Step 4: Check container status
echo ""
echo "Step 4: Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(peer0|orderer|postgres|redis|couchdb)" || true

# Step 5: Start API
echo ""
echo "Step 5: Starting API..."
cd api
nohup npm run dev > ../logs/api.log 2>&1 &
API_PID=$!
echo $API_PID > /tmp/cecbs-api.pid
echo "✓ API started (PID: $API_PID)"
cd ..

# Step 6: Wait for API
echo ""
echo "Step 6: Waiting for API to initialize (10 seconds)..."
sleep 10

# Step 7: Start UI
echo ""
echo "Step 7: Starting UI..."
cd ui
nohup npm run dev > ../logs/ui.log 2>&1 &
UI_PID=$!
echo $UI_PID > /tmp/cecbs-ui.pid
echo "✓ UI started (PID: $UI_PID)"
cd ..

echo ""
echo "========================================="
echo "  ✓ All Services Started"
echo "========================================="
echo ""
echo "Access:"
echo "  UI:  http://localhost:3000"
echo "  API: http://localhost:3001"
echo ""
echo "Logs:"
echo "  API: tail -f logs/api.log"
echo "  UI:  tail -f logs/ui.log"
echo ""
echo "Next steps:"
echo "  1. Wait 30 seconds for everything to initialize"
echo "  2. Hard refresh browser (Ctrl+Shift+R)"
echo "  3. Try the reject action"
echo ""
