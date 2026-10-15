#!/bin/bash

# Enable Graceful Degradation Mode
# This allows the system to work even if blockchain has issues

echo "=============================================="
echo "Enabling Graceful Blockchain Degradation"
echo "=============================================="
echo ""

# Step 1: Update .env to allow graceful degradation
echo "[1/3] Updating API configuration..."
cd /home/guda/GoCBC/api

# Set FABRIC_REQUIRED to false
if grep -q "FABRIC_REQUIRED=" .env; then
    sed -i 's/FABRIC_REQUIRED=.*/FABRIC_REQUIRED=false/' .env
    echo "✅ Set FABRIC_REQUIRED=false"
else
    echo "FABRIC_REQUIRED=false" >> .env
    echo "✅ Added FABRIC_REQUIRED=false"
fi

# Step 2: Restart API
echo ""
echo "[2/3] Restarting API with graceful degradation..."
pkill -f "node.*api" || true
sleep 3

cd /home/guda/GoCBC
bash start-api.sh > /tmp/api-degraded.log 2>&1 &

# Wait for API
echo "Waiting for API to start..."
for i in {1..30}; do
    sleep 2
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ API is healthy"
        break
    fi
done

# Step 3: Run workflow test
echo ""
echo "[3/3] Running workflow test in degraded mode..."
echo "=============================================="
echo ""
sleep 3

cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh

echo ""
echo "=============================================="
echo "Graceful Degradation Mode Enabled"
echo "=============================================="
echo ""
echo "NOTE: System is running with FABRIC_REQUIRED=false"
echo "This means blockchain operations will be skipped if unavailable."
echo "Database operations will continue to work normally."
echo ""
echo "To restore full blockchain mode:"
echo "  1. Fix the MSP identity issues"
echo "  2. Set FABRIC_REQUIRED=true in api/.env"
echo "  3. Restart API"
echo ""
