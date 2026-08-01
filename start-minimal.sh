#!/bin/sh
# Minimal POSIX-compliant startup script (works on any shell)
# Use this if start-all.sh fails on your system

echo "========================================"
echo "CECBS Minimal Startup"
echo "========================================"
echo ""

# Check we're in right directory
if [ ! -f "docker-compose-fabric.yml" ]; then
    echo "ERROR: docker-compose-fabric.yml not found"
    echo "Please run from project root directory"
    exit 1
fi

echo "Step 1: Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker not found"
    exit 1
fi
echo "OK: Docker found"
echo ""

echo "Step 2: Checking Docker daemon..."
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Docker daemon not running"
    echo "Please start Docker and try again"
    exit 1
fi
echo "OK: Docker is running"
echo ""

echo "Step 3: Stopping old containers..."
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
echo "OK: Cleanup done"
echo ""

echo "Step 4: Starting Docker containers..."
echo "(This may take 2-3 minutes on first run)"
if ! docker-compose -f docker-compose-fabric.yml up -d; then
    echo "ERROR: Failed to start containers"
    echo "Run: docker-compose -f docker-compose-fabric.yml logs"
    exit 1
fi
echo "OK: Containers starting"
echo ""

echo "Step 5: Waiting for services (60 seconds)..."
sleep 60
echo "OK: Wait complete"
echo ""

echo "Step 6: Checking container status..."
RUNNING=$(docker ps -q | wc -l | tr -d ' ')
echo "Containers running: $RUNNING"
if [ "$RUNNING" -lt 10 ]; then
    echo "WARNING: Expected more containers"
    echo "Check: docker ps"
fi
echo ""

echo "Step 7: Starting API..."
cd api
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Kill old processes
pkill -9 -f "node.*api" 2>/dev/null || true
sleep 2

echo "Installing dependencies (if needed)..."
npm install --silent 2>&1 | head -20

echo "Starting API in background..."
npm start > /tmp/cecbs-api.log 2>&1 &
API_PID=$!
echo "API PID: $API_PID"
echo "Logs: tail -f /tmp/cecbs-api.log"
cd ..
echo ""

echo "Waiting 10 seconds for API..."
sleep 10
echo ""

echo "Step 8: Starting UI..."
cd ui
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# Kill old processes  
pkill -9 -f "node.*ui\|node.*next" 2>/dev/null || true
sleep 2

echo "Installing dependencies (if needed)..."
npm install --silent 2>&1 | head -20

echo "Starting UI in background..."
npm start > /tmp/cecbs-ui.log 2>&1 &
UI_PID=$!
echo "UI PID: $UI_PID"
echo "Logs: tail -f /tmp/cecbs-ui.log"
cd ..
echo ""

echo "Waiting 10 seconds for UI..."
sleep 10
echo ""

echo "========================================"
echo "Startup Complete!"
echo "========================================"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  API Docs: http://localhost:3001/api-docs"
echo ""
echo "Background processes:"
echo "  API: PID $API_PID"
echo "  UI:  PID $UI_PID"
echo ""
echo "To stop:"
echo "  kill $API_PID $UI_PID"
echo "  docker-compose -f docker-compose-fabric.yml down"
echo ""
