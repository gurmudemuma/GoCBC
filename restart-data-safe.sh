#!/bin/bash
# Quick restart - preserves all database data

echo "🔄 Restarting CECBS (Data Preserved)..."
echo ""

# Stop containers without deleting volumes
docker-compose -f docker-compose-fabric.yml down

# Start containers
docker-compose -f docker-compose-fabric.yml up -d

echo "⏳ Waiting for services (30s)..."
sleep 30

# Restart API and UI
bash restart-all.sh

echo ""
echo "✅ System restarted - all data preserved"
echo "🔗 UI:  http://localhost:3000"
echo "🔗 API: http://localhost:3001"
