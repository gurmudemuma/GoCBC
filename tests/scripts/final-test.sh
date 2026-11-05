#!/bin/bash

echo "================================================================"
echo "GOCBC COMPLETE SYSTEM TEST"
echo "================================================================"
echo ""

# 1. Check Docker Containers
echo "1. Docker Containers Status:"
echo "----------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(peer|orderer|couchdb|postgres|redis|kafka)"
RUNNING=$(docker ps | grep -c peer)
echo ""
echo "Peers running: $RUNNING/6"
echo ""

# 2. Check if channel exists and peers joined
echo "2. Channel Status:"
echo "------------------"
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | grep coffeechannel && echo "✓ peer0.ecta joined channel" || echo "✗ peer0.ecta NOT joined"
docker exec peer0.nbe.cecbs.et peer channel list 2>&1 | grep coffeechannel && echo "✓ peer0.nbe joined channel" || echo "✗ peer0.nbe NOT joined"
docker exec peer0.banks.cecbs.et peer channel list 2>&1 | grep coffeechannel && echo "✓ peer0.banks joined channel" || echo "✗ peer0.banks NOT joined"
echo ""

# 3. Check chaincode status
echo "3. Chaincode Status:"
echo "--------------------"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | head -5
echo ""
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel 2>&1 | grep -A 5 "coffee"
echo ""

# 4. Check Database
echo "4. Database Status:"
echo "-------------------"
docker exec cecbs-postgres psql -U postgres -d cecbs -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1 | head -20
echo ""
docker exec cecbs-postgres psql -U postgres -d cecbs -c "SELECT COUNT(*) as user_count FROM users;" 2>&1
echo ""

# 5. Try to start API
echo "5. API Status:"
echo "--------------"
cd /home/guda/GoCBC/api
if [ -f "package.json" ]; then
    echo "API directory found"
    if [ -d "node_modules" ]; then
        echo "✓ Dependencies installed"
    else
        echo "✗ Dependencies NOT installed - run: cd api && npm install"
    fi
else
    echo "✗ API directory not found"
fi
echo ""

# 6. Summary
echo "================================================================"
echo "SUMMARY"
echo "================================================================"
echo ""
echo "To complete the blockchain setup, run:"
echo "  cd /home/guda/GoCBC && bash blockchain-full-setup.sh"
echo ""
echo "To start the API:"
echo "  cd /home/guda/GoCBC/api && npm run dev"
echo ""
echo "To test workflows:"
echo "  bash /home/guda/GoCBC/quick-workflow-test.sh"
echo ""
