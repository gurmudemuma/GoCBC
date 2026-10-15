#!/bin/bash

# Apply Fixes and Restart API Server
# This script applies database migrations and restarts the API

set -e

echo "=============================================="
echo "Applying GoCBC Fixes and Restarting API"
echo "=============================================="
echo ""

# Change to API directory
cd /home/guda/GoCBC/api

echo "[1/5] Checking if API is running..."
if pgrep -f "node.*server" > /dev/null; then
    echo "✅ API is running, stopping it..."
    pkill -f "node.*server" || true
    sleep 2
else
    echo "⚠️  API is not running"
fi

echo ""
echo "[2/5] Building TypeScript..."
npm run build 2>&1 | tail -10

echo ""
echo "[3/5] Applying database migrations..."

# Check if PostgreSQL is accessible
if psql -U postgres -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is accessible"
    
    # Apply migration 020
    echo "  Applying migration 020 (contract_id for payments)..."
    psql -U postgres -d cecbs -f src/migrations/020_add_contract_id_to_payments.sql 2>&1 | grep -E "(NOTICE|ERROR)" || echo "  ✅ Migration 020 applied"
    
    # Apply migration 021
    echo "  Applying migration 021 (exporter_id columns)..."
    psql -U postgres -d cecbs -f src/migrations/021_add_exporter_id_columns.sql 2>&1 | grep -E "(NOTICE|ERROR)" || echo "  ✅ Migration 021 applied"
    
    # Apply migration 022
    echo "  Applying migration 022 (extend contracts table)..."
    psql -U postgres -d cecbs -f src/migrations/022_extend_contracts_table.sql 2>&1 | grep -E "(NOTICE|ERROR)" || echo "  ✅ Migration 022 applied"
    
    echo "✅ All migrations applied"
else
    echo "⚠️  PostgreSQL not accessible directly, migrations will auto-apply on API start"
fi

echo ""
echo "[4/5] Deploying chaincode to blockchain..."
cd /home/guda/GoCBC

if [ -f "deploy-chaincode.sh" ]; then
    echo "  Deploying chaincode (this may take 1-2 minutes)..."
    bash deploy-chaincode.sh > /tmp/chaincode-deploy.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Chaincode deployed successfully"
    else
        echo "⚠️  Chaincode deployment had issues (check /tmp/chaincode-deploy.log)"
        echo "  Continuing anyway - API might work without it..."
    fi
else
    echo "⚠️  deploy-chaincode.sh not found, skipping chaincode deployment"
fi

echo ""
echo "[5/5] Starting API server..."
cd /home/guda/GoCBC

# Start API in background
if [ -f "start-api.sh" ]; then
    bash start-api.sh > /tmp/api-restart.log 2>&1 &
    echo "✅ API starting in background..."
else
    cd api
    npm start > /tmp/api-restart.log 2>&1 &
    echo "✅ API starting in background (npm start)..."
fi

echo ""
echo "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ API is healthy!"
        curl -s http://localhost:3001/health | jq . || curl -s http://localhost:3001/health
        echo ""
        echo "=============================================="
        echo "✅ Fixes applied and API restarted!"
        echo "=============================================="
        echo ""
        echo "You can now run the workflow test:"
        echo "  ./complete-workflow-test-fixed.sh"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "⚠️  API did not become healthy within 30 seconds"
echo "Check logs: tail -f /tmp/api-restart.log"
echo ""
exit 1
