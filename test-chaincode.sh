#!/bin/bash

echo "==================================================================="
echo "  Coffee Chaincode Connection Test"
echo "==================================================================="
echo ""

# Test 1: Check if peer is running
echo "Test 1: Checking if peer0.ecta.cecbs.et is running..."
if docker ps | grep -q "peer0.ecta.cecbs.et"; then
    echo "✓ Peer is running"
else
    echo "✗ Peer is NOT running"
    exit 1
fi
echo ""

# Test 2: Check if chaincode container is running
echo "Test 2: Checking if coffee-chaincode container is running..."
if docker ps | grep -q "coffee-chaincode"; then
    echo "✓ Chaincode container is running"
else
    echo "✗ Chaincode container is NOT running"
    exit 1
fi
echo ""

# Test 3: Check chaincode installation
echo "Test 3: Checking installed chaincode packages..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1
echo ""

# Test 4: Check committed chaincode
echo "Test 4: Checking committed chaincode on channel..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1
echo ""

# Test 5: Test actual query
echo "Test 5: Testing chaincode query (QueryAllLCs)..."
echo "This will timeout if the peer can't connect to chaincode..."
timeout 20 docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"Args":["QueryAllLCs"]}' 2>&1

QUERY_EXIT=$?
echo ""
if [ $QUERY_EXIT -eq 0 ]; then
    echo "✓ Query succeeded!"
elif [ $QUERY_EXIT -eq 124 ]; then
    echo "✗ Query timed out (connection issue)"
    echo ""
    echo "Checking chaincode logs for connection attempts..."
    docker logs coffee-chaincode --tail 20
else
    echo "✗ Query failed with exit code $QUERY_EXIT"
fi
