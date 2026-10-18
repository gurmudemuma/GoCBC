#!/bin/bash
#
# Quick Health Check for GoCBC System
#

echo "==================================="
echo "  GoCBC Quick Health Check"
echo "==================================="
echo ""

# Check Docker containers
echo "Checking Docker containers..."
CONTAINER_COUNT=$(docker ps --format "{{.Names}}" | wc -l)
echo "  Running containers: $CONTAINER_COUNT"

# Check specific services
echo ""
echo "Checking critical services..."

if docker ps | grep -q "orderer.cecbs.et"; then
    echo "  ✓ Orderer running"
else
    echo "  ✗ Orderer NOT running"
fi

if docker ps | grep -q "peer0.ecta.cecbs.et"; then
    echo "  ✓ Peer ECTA running"
else
    echo "  ✗ Peer ECTA NOT running"
fi

if docker ps | grep -q "coffee-chaincode"; then
    echo "  ✓ Chaincode running"
else
    echo "  ✗ Chaincode NOT running"
fi

if docker ps | grep -q "cecbs-postgres"; then
    echo "  ✓ PostgreSQL running"
else
    echo "  ✗ PostgreSQL NOT running"
fi

# Check processes
echo ""
echo "Checking Node.js processes..."
API_PID=$(ps aux | grep "node.*api/dist/index.js" | grep -v grep | awk '{print $2}' | head -1)
UI_PID=$(ps aux | grep "next.*start" | grep -v grep | awk '{print $2}' | head -1)

if [ ! -z "$API_PID" ]; then
    echo "  ✓ API running (PID: $API_PID)"
else
    echo "  ✗ API NOT running"
fi

if [ ! -z "$UI_PID" ]; then
    echo "  ✓ UI running (PID: $UI_PID)"
else
    echo "  ✗ UI NOT running"
fi

# Test HTTP endpoints
echo ""
echo "Testing HTTP endpoints..."

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
    echo "  ✓ API responding on port 3001"
else
    echo "  ✗ API NOT responding on port 3001"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "  ✓ UI responding on port 3000"
else
    echo "  ✗ UI NOT responding on port 3000"
fi

echo ""
echo "==================================="
echo "  Health check complete!"
echo "==================================="
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:3001"
echo "  API Docs: http://localhost:3001/api-docs"
echo ""
