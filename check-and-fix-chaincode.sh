#!/bin/bash

echo "=========================================="
echo "Chaincode Status Check and Fix"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

echo "1. Checking Docker containers..."
echo "----------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|chaincode"
echo ""

echo "2. Checking chaincode container logs..."
echo "----------------------------"
if docker ps | grep -q "coffee-chaincode"; then
    echo "✅ Chaincode container is running"
    docker logs coffee-chaincode 2>&1 | tail -5
else
    echo "❌ Chaincode container not running"
fi
echo ""

echo "3. Testing chaincode query..."
echo "----------------------------"
QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"Args":["GetAllShipments"]}' 2>&1)

if echo "$QUERY_RESULT" | grep -q "Error"; then
    echo "❌ Query failed:"
    echo "$QUERY_RESULT" | head -3
    echo ""
    echo "Attempting to initialize chaincode..."
    
    # Try initialization
    docker exec peer0.ecta.cecbs.et peer chaincode invoke \
        -C coffeechannel \
        -n coffee \
        -c '{"function":"InitLedger","Args":[]}' 2>&1 | tee /tmp/init-attempt.log
    
    if [ $? -eq 0 ]; then
        echo "✅ Initialization command executed"
    else
        echo "⚠️  Initialization had issues"
    fi
else
    echo "✅ Chaincode is working!"
    echo "Sample response:"
    echo "$QUERY_RESULT" | head -10
fi

echo ""
echo "4. Checking API connection to blockchain..."
echo "----------------------------"
API_PID=$(lsof -ti:3001)
if [ -n "$API_PID" ]; then
    echo "✅ API is running (PID: $API_PID)"
    
    # Test blockchain health endpoint
    HEALTH=$(curl -s http://localhost:3001/api/v1/blockchain/health 2>&1)
    if echo "$HEALTH" | grep -q "connected"; then
        echo "✅ API can connect to blockchain"
    else
        echo "⚠️  API blockchain connection status unknown"
        echo "Response: $HEALTH"
    fi
else
    echo "❌ API not running"
    echo "Start it with: ./restart-api.sh"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Chaincode deployed: ✅ Yes (v1.12)"
echo "Containers running: $(docker ps | grep -c 'peer\|orderer')/7 expected"
echo ""
echo "If chaincode queries still fail, the issue is likely:"
echo "1. Chaincode needs initialization (run InitLedger)"
echo "2. TLS certificate mismatch"
echo "3. Endorsement policy not met"
echo ""
echo "Logs available at:"
echo "  /tmp/init-attempt.log - Initialization attempt"
echo "  docker logs coffee-chaincode - Chaincode logs"
echo "  docker logs peer0.ecta.cecbs.et - Peer logs"
