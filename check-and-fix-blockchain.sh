#!/bin/bash

# Check and Fix Blockchain Connectivity
# This script checks Fabric network status and fixes common issues

set -e

echo "=============================================="
echo "Blockchain Connectivity Diagnosis & Fix"
echo "=============================================="
echo ""

# Step 1: Check if Docker containers are running
echo "[1/6] Checking Docker containers..."
PEER_COUNT=$(docker ps | grep -c "peer" || echo "0")
ORDERER_COUNT=$(docker ps | grep -c "orderer" || echo "0")

echo "  Peers running: $PEER_COUNT"
echo "  Orderers running: $ORDERER_COUNT"

if [ "$PEER_COUNT" -eq 0 ] || [ "$ORDERER_COUNT" -eq 0 ]; then
    echo "❌ Fabric network not running!"
    echo "   Please start the network first:"
    echo "   cd /home/guda/GoCBC/blockchain && ./network.sh up"
    exit 1
fi

echo "✅ Fabric network is running"

# Step 2: Check if chaincode is deployed
echo ""
echo "[2/6] Checking chaincode deployment..."
CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep -c "coffee" || echo "0")

if [ "$CHAINCODE_CHECK" -eq 0 ]; then
    echo "⚠️ Chaincode 'coffee' not found on peer0.ecta.cecbs.et"
    echo "   Deploying chaincode..."
    cd /home/guda/GoCBC/blockchain
    ./deploy-chaincode.sh
    echo "✅ Chaincode deployed"
else
    echo "✅ Chaincode 'coffee' is installed"
fi

# Step 3: Check chaincode commitment
echo ""
echo "[3/6] Checking chaincode commitment..."
COMMIT_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1 | grep -c "coffee" || echo "0")

if [ "$COMMIT_CHECK" -eq 0 ]; then
    echo "❌ Chaincode 'coffee' not committed on coffeechannel"
    echo "   Please run: cd /home/guda/GoCBC/blockchain && ./deploy-chaincode.sh"
    exit 1
fi

echo "✅ Chaincode is committed on channel"

# Step 4: Test chaincode invocation
echo ""
echo "[4/6] Testing chaincode invocation..."
TEST_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"QueryAllExporters","Args":[]}' 2>&1 || echo "FAILED")

if echo "$TEST_RESULT" | grep -q "FAILED"; then
    echo "⚠️ Chaincode query failed"
    echo "   Response: $TEST_RESULT"
else
    echo "✅ Chaincode is responding"
fi

# Step 5: Check API connection to Fabric
echo ""
echo "[5/6] Checking API Fabric configuration..."
cd /home/guda/GoCBC/api

if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

FABRIC_ENABLED=$(grep "FABRIC_ENABLED" .env | cut -d'=' -f2)
FABRIC_CHANNEL=$(grep "FABRIC_CHANNEL_NAME" .env | cut -d'=' -f2)
FABRIC_CHAINCODE=$(grep "FABRIC_CHAINCODE_NAME" .env | cut -d'=' -f2)

echo "  FABRIC_ENABLED: $FABRIC_ENABLED"
echo "  FABRIC_CHANNEL_NAME: $FABRIC_CHANNEL"
echo "  FABRIC_CHAINCODE_NAME: $FABRIC_CHAINCODE"

if [ "$FABRIC_ENABLED" != "true" ]; then
    echo "⚠️ Fabric is disabled in .env"
    echo "   Enabling Fabric..."
    sed -i 's/FABRIC_ENABLED=false/FABRIC_ENABLED=true/' .env
    echo "✅ Fabric enabled"
fi

# Step 6: Check wallet and identities
echo ""
echo "[6/6] Checking Fabric wallet..."
WALLET_PATH="./wallet"

if [ ! -d "$WALLET_PATH" ]; then
    echo "⚠️ Wallet directory not found, will be created on API start"
else
    echo "✅ Wallet directory exists"
    IDENTITY_COUNT=$(ls -1 "$WALLET_PATH" 2>/dev/null | wc -l)
    echo "  Identities in wallet: $IDENTITY_COUNT"
fi

echo ""
echo "=============================================="
echo "✅ Blockchain Connectivity Check Complete"
echo "=============================================="
echo ""
echo "Recommendations:"
echo "1. Restart API to reconnect to Fabric"
echo "2. Register test exporter EXP001"
echo "3. Run workflow test"
echo ""
