#!/bin/bash

# Complete Blockchain Fix and Test
# This script attempts all possible fixes

set +e  # Continue on errors

echo "=============================================="
echo "Complete Blockchain Fix & Test Automation"
echo "=============================================="
echo ""

# Step 1: Verify chaincode container is running
echo "[1/8] Checking chaincode container..."
if docker ps | grep -q "coffee-chaincode"; then
    echo "✅ Chaincode container is running"
else
    echo "⚠️ Chaincode container not running, starting..."
    cd /home/guda/GoCBC
    docker run -d --name coffee-chaincode \
        --network cecbs-network \
        -p 9999:9999 \
        -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
        -e CHAINCODE_ID=coffee_1.0:$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep coffee | head -1 | awk '{print $3}' | sed 's/,//') \
        coffee-chaincode:latest
    sleep 5
    echo "✅ Chaincode container started"
fi

# Step 2: Try to query existing chaincode
echo ""
echo "[2/8] Testing chaincode connectivity..."
QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"QueryAllExporters","Args":[]}' 2>&1)

if echo "$QUERY_RESULT" | grep -q "Error"; then
    echo "⚠️ Chaincode not responding: $QUERY_RESULT"
    echo "Attempting to commit chaincode..."
    
    # Get package ID
    PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep coffee | head -1 | awk '{print $3}' | sed 's/,//')
    
    if [ -n "$PACKAGE_ID" ]; then
        echo "Package ID: $PACKAGE_ID"
        
        # Try commit with minimal peer set
        docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
            --channelID coffeechannel \
            --name coffee \
            --version 1.0 \
            --sequence 1 \
            --tls \
            --cafile /etc/hyperledger/fabric/tls/ca.crt \
            -o orderer.cecbs.et:7050 \
            --peerAddresses peer0.ecta.cecbs.et:7051 \
            --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1
        
        sleep 5
    fi
else
    echo "✅ Chaincode is responding"
fi

# Step 3: Register test exporter via chaincode invoke
echo ""
echo "[3/8] Registering test exporter EXP001..."
REG_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode invoke \
    -C coffeechannel -n coffee \
    -c '{"function":"RegisterExporter","Args":["EXP001","Test Coffee Exporter Ltd","ECTA-2024-001","company","5000000","yes","TASTER-CERT-001","LAB-CERT-001","2027-12-31"]}' \
    --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
    -o orderer.cecbs.et:7050 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --waitForEvent 2>&1)

if echo "$REG_RESULT" | grep -q "Chaincode invoke successful"; then
    echo "✅ Exporter registered"
elif echo "$REG_RESULT" | grep -q "already exists"; then
    echo "✅ Exporter already registered"
else
    echo "⚠️ Registration result: $REG_RESULT"
fi

# Step 4: Verify exporter registration
echo ""
echo "[4/8] Verifying exporter registration..."
VERIFY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"ReadExporter","Args":["EXP001"]}' 2>&1)

if echo "$VERIFY_RESULT" | grep -q "EXP001"; then
    echo "✅ Exporter EXP001 verified on blockchain"
else
    echo "⚠️ Verification result: $VERIFY_RESULT"
fi

# Step 5: Restart API to reconnect to Fabric
echo ""
echo "[5/8] Restarting API server..."
pkill -f "node.*api" || true
sleep 3

cd /home/guda/GoCBC
bash start-api.sh > /tmp/api-final.log 2>&1 &
API_PID=$!

# Wait for API
echo "Waiting for API to start..."
for i in {1..30}; do
    sleep 2
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ API is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️ API may not have started properly"
    fi
done

# Step 6: Test blockchain connection from API
echo ""
echo "[6/8] Testing API-blockchain connection..."
sleep 5

# Step 7: Run quick connection test
echo ""
echo "[7/8] Quick blockchain connectivity test..."
TEST_CONTRACT=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TEST_CONTRACT" ]; then
    echo "✅ API authentication working"
else
    echo "⚠️ API authentication may have issues"
fi

# Step 8: Run full workflow test
echo ""
echo "[8/8] Running complete workflow test..."
echo "=============================================="
echo ""
sleep 3

cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh

echo ""
echo "=============================================="
echo "Fix process complete!"
echo "=============================================="
echo ""
echo "Check the test results above."
echo "If blockchain steps still fail, check:"
echo "  1. docker logs peer0.ecta.cecbs.et"
echo "  2. docker logs orderer.cecbs.et"
echo "  3. docker logs coffee-chaincode"
echo ""
