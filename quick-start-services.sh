#!/bin/bash

# Quick service startup for testing
set -e

echo "Starting PostgreSQL..."
cd /home/guda/GoCBC
docker compose -f docker-compose-fabric.yml up -d postgres
sleep 5

echo "Checking PostgreSQL..."
docker ps --filter "name=postgres"

echo ""
echo "Starting API server (host-based)..."
cd /home/guda/GoCBC/api
pkill -f "node.*dist/server.js" || true
sleep 2
nohup node dist/server.js > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID"

echo "Waiting for API to initialize..."
sleep 5

echo "Checking API health..."
curl -s http://localhost:3001/health | jq '.' || echo "API not ready yet"

echo ""
echo "✓ Services started!"
echo "  - PostgreSQL: docker ps --filter name=postgres"
echo "  - API logs: tail -f /tmp/api-server.log"
echo "  - API health: curl http://localhost:3001/health"
