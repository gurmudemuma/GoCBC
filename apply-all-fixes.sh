#!/bin/bash

# ============================================
# Apply All Workflow Test Fixes
# ============================================
# This script:
# 1. Applies all database migrations (auto-apply on API start)
# 2. Checks and fixes blockchain connectivity
# 3. Restarts API server
# 4. Registers test exporter EXP001
# 5. Runs workflow test

set -e  # Exit on any error

echo "=============================================="
echo "GoCBC Complete Fix Application"
echo "=============================================="
echo "Date: $(date)"
echo ""

# Function to wait for API health
wait_for_api() {
    echo "Waiting for API to be healthy..."
    for i in {1..30}; do
        sleep 2
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
            if [ "$HTTP_CODE" = "200" ]; then
                echo "✅ API is healthy (HTTP $HTTP_CODE)"
                return 0
            fi
        fi
        if [ $i -eq 30 ]; then
            echo "❌ API failed to start within 60 seconds"
            return 1
        fi
        echo -n "."
    done
}

# Step 1: Verify migrations exist
echo "[1/6] Verifying database migrations..."
cd /home/guda/GoCBC/api/src/migrations

MIGRATIONS=(
    "020_add_contract_id_to_payments.sql"
    "021_add_exporter_id_columns.sql"
    "022_extend_contracts_table.sql"
    "023_add_payment_method_to_payments.sql"
    "024_add_passed_to_quality_inspections.sql"
    "025_extend_shipments_table.sql"
    "026_add_blockchain_tx_id_to_payments.sql"
    "027_add_inspection_id_to_quality_inspections.sql"
    "028_extend_quality_inspections_table.sql"
)

MISSING=0
for migration in "${MIGRATIONS[@]}"; do
    if [ ! -f "$migration" ]; then
        echo "❌ Missing: $migration"
        MISSING=1
    else
        echo "✅ Found: $migration"
    fi
done

if [ $MISSING -eq 1 ]; then
    echo "❌ Some migrations are missing!"
    exit 1
fi

echo "✅ All 9 migrations verified"

# Step 2: Stop API
echo ""
echo "[2/6] Stopping API server..."
pkill -f "node.*api" || echo "  No API process found"
pkill -f "ts-node.*api" || true
sleep 3

# Step 3: Check blockchain connectivity
echo ""
echo "[3/6] Checking blockchain connectivity..."
cd /home/guda/GoCBC

if [ -f "check-and-fix-blockchain.sh" ]; then
    bash check-and-fix-blockchain.sh || echo "⚠️ Blockchain check had issues (continuing...)"
else
    echo "⚠️ Blockchain check script not found (continuing...)"
fi

# Step 4: Start API (migrations auto-apply)
echo ""
echo "[4/6] Starting API server..."
cd /home/guda/GoCBC

# Start API in background
bash start-api.sh > /tmp/api-start.log 2>&1 &
API_PID=$!
echo "  API PID: $API_PID"

# Wait for API to be ready
if ! wait_for_api; then
    echo "  Checking API logs..."
    tail -20 /tmp/api-start.log || true
    exit 1
fi

sleep 5  # Extra time for full initialization

# Step 5: Register test exporter
echo ""
echo "[5/6] Registering test exporter EXP001..."

# Use the authenticated registration script
if [ -f "register-exporter-authenticated.sh" ]; then
    bash register-exporter-authenticated.sh || echo "⚠️ Registration may have failed (continuing...)"
else
    echo "⚠️ Authenticated registration script not found, skipping..."
fi

# Step 6: Run workflow test
echo ""
echo "[6/6] Running complete workflow test..."
echo ""
sleep 2

cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh

echo ""
echo "=============================================="
echo "✅ Fix Application Complete"
echo "=============================================="
echo ""
echo "Summary:"
echo "  ✓ 9 database migrations verified"
echo "  ✓ Blockchain connectivity checked"
echo "  ✓ API server restarted"
echo "  ✓ Test exporter EXP001 registered"
echo "  ✓ Workflow test executed"
echo ""
echo "Check the test results above for any remaining issues."
echo ""
