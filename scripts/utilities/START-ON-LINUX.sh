#!/bin/bash
# Simple startup script for CECBS on Linux

set -e

echo ""
echo "=================================================="
echo "  Starting CECBS System on Linux"
echo "=================================================="
echo ""

# Step 1: Start Blockchain Network (if not running)
echo "Step 1: Starting Blockchain Network..."
echo "----------------------------------------"
if docker ps | grep -q "peer0.ecta"; then
    echo "✅ Blockchain network is already running"
else
    echo "🚀 Starting blockchain network with Docker Compose..."
    docker-compose -f docker-compose-fabric.yml up -d
    echo "⏳ Waiting for blockchain to initialize (30 seconds)..."
    sleep 30
fi

# Step 2: Start PostgreSQL (if using Docker)
echo ""
echo "Step 2: Checking PostgreSQL..."
echo "----------------------------------------"
if docker ps | grep -q postgres; then
    echo "✅ PostgreSQL is already running"
elif docker ps -a | grep -q postgres; then
    echo "🚀 Starting PostgreSQL container..."
    docker start $(docker ps -a | grep postgres | awk '{print $1}')
else
    echo "⚠️  PostgreSQL container not found"
    echo "   If using system PostgreSQL, ensure it's running:"
    echo "   sudo systemctl start postgresql"
fi

# Step 3: Start API Server
echo ""
echo "Step 3: Starting API Server..."
echo "----------------------------------------"
bash start-api.sh

# Step 4: Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
sleep 5

# Step 5: Start UI Server
echo ""
echo "Step 4: Starting UI Server..."
echo "----------------------------------------"
bash start-ui.sh

# Step 6: Show status
echo ""
echo "=================================================="
echo "  ✅ CECBS System Started Successfully!"
echo "=================================================="
echo ""
echo "📋 System Status:"
echo "   • Blockchain Network: Running (6 peers + orderer)"
echo "   • API Server: http://localhost:3001"
echo "   • UI Server: http://localhost:3000"
echo ""
echo "🔗 Access the application:"
echo "   Open browser: http://localhost:3000"
echo ""
echo "📊 Check logs:"
echo "   API: tail -f logs/api.log"
echo "   UI:  tail -f logs/ui.log"
echo ""
echo "🛑 To stop services:"
echo "   bash stop-api.sh"
echo "   bash stop-ui.sh"
echo "   docker-compose -f docker-compose-fabric.yml down"
echo ""
