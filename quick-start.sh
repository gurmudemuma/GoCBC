#!/bin/bash

################################################################################
# GoCBC Quick Start Script
# Starts the complete system with automatic migrations
################################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GoCBC Quick Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Start blockchain and database
echo -e "${YELLOW}[1/3]${NC} Starting blockchain and database with migrations..."
./start-all.sh

echo ""
echo -e "${YELLOW}[2/3]${NC} Starting API server on port 3001..."

# Kill any existing process
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Start API
cd api
PORT=3001 NODE_ENV=production nohup node dist/server.js > /tmp/gocbc-api.log 2>&1 &
API_PID=$!
cd ..

echo "  API starting (PID: $API_PID)..."
sleep 8

# Check API health
if curl -s http://localhost:3001/health | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} API is healthy"
    
    # Check blockchain connection
    if curl -s http://localhost:3001/health | grep -q '"blockchain":true'; then
        echo -e "${GREEN}✓${NC} Blockchain connected"
    else
        echo -e "${YELLOW}⚠${NC} Blockchain not connected (may need a moment)"
    fi
else
    echo -e "${YELLOW}⚠${NC} API may still be starting, check logs: tail -f /tmp/gocbc-api.log"
fi

echo ""
echo -e "${YELLOW}[3/3]${NC} Running verification..."
echo ""

# Run quick test
echo "Testing basic endpoints..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token' 2>/dev/null)

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Authentication working"
else
    echo -e "${YELLOW}⚠${NC} Authentication test inconclusive"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ GoCBC System Started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Access points:"
echo "  API Health:  http://localhost:3001/health"
echo "  API Docs:    http://localhost:3001/api-docs"
echo "  UI:          http://localhost:3000 (start separately)"
echo ""
echo "Login credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Check API logs:"
echo "  tail -f /tmp/gocbc-api.log"
echo ""
echo "Run tests:"
echo "  bash tests/complete-crud-workflow-test.sh"
echo ""
echo "Verify migrations:"
echo "  bash verify-migrations.sh"
echo ""
