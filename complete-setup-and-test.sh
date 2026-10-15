#!/bin/bash

# Complete Setup and Test Script
# This script ensures blockchain, database, and API are all ready before testing

set -e

echo "=============================================="
echo "GoCBC Complete Setup and Workflow Test"
echo "=============================================="
echo ""

cd /home/guda/GoCBC

echo "[1/6] Checking Prerequisites..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"

# Check if PostgreSQL is accessible
if command -v psql > /dev/null 2>&1; then
    if psql -U postgres -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
        echo "✅ PostgreSQL is accessible"
    else
        echo "⚠️  PostgreSQL not accessible (might need to start)"
    fi
else
    echo "⚠️  psql command not found"
fi

echo ""
echo "[2/6] Checking Blockchain Network..."
echo ""

PEER_COUNT=$(docker ps --filter "name=peer" --format "{{.Names}}" | wc -l)
ORDERER_COUNT=$(docker ps --filter "name=orderer" --format "{{.Names}}" | wc -l)

if [ "$PEER_COUNT" -gt 0 ] && [ "$ORDERER_COUNT" -gt 0 ]; then
    echo "✅ Blockchain network is running ($PEER_COUNT peers, $ORDERER_COUNT orderers)"
else
    echo "⚠️  Blockchain network might not be fully running"
    echo "   Peers: $PEER_COUNT, Orderers: $ORDERER_COUNT"
    echo ""
    echo "   To start the blockchain network, run:"
    echo "   cd /home/guda/GoCBC/blockchain && docker-compose up -d"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "[3/6] Deploying Chaincode..."
echo ""

if [ -f "deploy-chaincode.sh" ]; then
    echo "  Deploying chaincode (this may take 1-2 minutes)..."
    bash deploy-chaincode.sh > /tmp/chaincode-deploy.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Chaincode deployed successfully"
    else
        echo "⚠️  Chaincode deployment had issues"
        echo "   Check logs: tail -f /tmp/chaincode-deploy.log"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo "⚠️  deploy-chaincode.sh not found"
    echo "   Chaincode might already be deployed"
fi

echo ""
echo "[4/6] Applying Database Migrations..."
echo ""

cd /home/guda/GoCBC/api

if command -v psql > /dev/null 2>&1 && psql -U postgres -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    echo "  Applying migration 020..."
    psql -U postgres -d cecbs -f src/migrations/020_add_contract_id_to_payments.sql 2>&1 | grep -E "(NOTICE|ERROR)" || true
    
    echo "  Applying migration 021..."
    psql -U postgres -d cecbs -f src/migrations/021_add_exporter_id_columns.sql 2>&1 | grep -E "(NOTICE|ERROR)" || true
    
    echo "  Applying migration 022..."
    psql -U postgres -d cecbs -f src/migrations/022_extend_contracts_table.sql 2>&1 | grep -E "(NOTICE|ERROR)" || true
    
    echo "✅ Migrations applied"
else
    echo "⚠️  Cannot apply migrations directly, will auto-apply on API start"
fi

echo ""
echo "[5/6] Building and Starting API..."
echo ""

cd /home/guda/GoCBC/api

# Stop any existing API
if pgrep -f "node.*server" > /dev/null; then
    echo "  Stopping existing API..."
    pkill -f "node.*server" || true
    sleep 2
fi

# Build TypeScript
echo "  Building TypeScript..."
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "⚠️  Build had warnings (check /tmp/build.log)"
fi

# Start API
cd /home/guda/GoCBC
if [ -f "start-api.sh" ]; then
    bash start-api.sh > /tmp/api-restart.log 2>&1 &
else
    cd api
    npm start > /tmp/api-restart.log 2>&1 &
fi

echo "  Waiting for API to be ready..."
API_READY=false
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        API_READY=true
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ "$API_READY" = true ]; then
    echo "✅ API is healthy"
    curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
else
    echo "❌ API did not become healthy within 30 seconds"
    echo "   Check logs: tail -f /tmp/api-restart.log"
    exit 1
fi

echo ""
echo "[6/6] Running Workflow Test..."
echo ""
echo "=============================================="

cd /home/guda/GoCBC

# Run the workflow test
./complete-workflow-test-fixed.sh

echo ""
echo "=============================================="
echo "Test Complete!"
echo "=============================================="
echo ""
echo "Check results above or in: workflow-test-fixed-output.log"
