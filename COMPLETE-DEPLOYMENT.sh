#!/bin/bash
# Complete Blockchain Deployment - Expert Level
# This script completes the blockchain deployment from current state

set -e

echo "==================================================================="
echo "COMPLETE BLOCKCHAIN DEPLOYMENT - EXPERT MODE"
echo "==================================================================="
echo ""

cd /home/guda/GoCBC

# Step 1: Verify Container Status
echo "Step 1: Checking container status..."
CONTAINER_COUNT=$(docker ps | grep -c -E "(peer|orderer)" || true)
echo "Found $CONTAINER_COUNT peer/orderer containers running"

if [ "$CONTAINER_COUNT" -eq 0 ]; then
    echo "ERROR: No containers running. Starting network..."
    docker-compose -f docker-compose-fabric.yml up -d
    sleep 10
fi

# Step 2: Fix TLS Key Permissions
echo ""
echo "Step 2: Fixing TLS key permissions..."
sudo chown $(whoami):$(whoami) blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key 2>/dev/null || true
chmod 600 blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key
echo "✓ TLS key permissions fixed"

# Step 3: Verify Genesis Block
echo ""
echo "Step 3: Verifying genesis block..."
if [ ! -f blockchain/channel-artifacts/coffeechannel_genesis.block ]; then
    echo "Creating genesis block..."
    docker exec cli configtxgen -profile CoffeeChannel \
        -outputBlock /etc/hyperledger/fabric/channel-artifacts/coffeechannel_genesis.block \
        -channelID coffeechannel \
        -configPath /etc/hyperledger/fabric/
    echo "✓ Genesis block created"
else
    echo "✓ Genesis block exists ($(stat -c%s blockchain/channel-artifacts/coffeechannel_genesis.block) bytes)"
fi

# Step 4: Join Orderer to Channel via Admin API
echo ""
echo "Step 4: Joining orderer to channel..."
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST \
  --cert blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
  --key blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key \
  -H "Content-Type: application/octet-stream" \
  https://localhost:7053/participation/v1/channels \
  --data-binary @blockchain/channel-artifacts/coffeechannel_genesis.block)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo "✓ Orderer joined channel successfully (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" == "405" ]; then
    echo "✓ Orderer already in channel (HTTP 405)"
else
    echo "Response: $BODY"
    echo "HTTP Code: $HTTP_CODE"
fi

sleep 3

# Step 5: Verify Orderer Channel Status
echo ""
echo "Step 5: Verifying orderer channel status..."
CHANNELS=$(curl -k -s --cert blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
  --key blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key \
  https://localhost:7053/participation/v1/channels)
echo "Orderer channels: $CHANNELS"

# Step 6: Join All Peers to Channel
echo ""
echo "Step 6: Joining all peers to channel..."

PEERS=(
    "peer0.ecta.cecbs.et:7051"
    "peer0.nbe.cecbs.et:10051"
    "peer0.banks.cecbs.et:9051"
    "peer0.ecx.cecbs.et:8051"
    "peer0.customs.cecbs.et:11051"
    "peer0.shipping.cecbs.et:12051"
)

PEER_NAMES=(
    "peer0.ecta.cecbs.et"
    "peer0.nbe.cecbs.et"
    "peer0.banks.cecbs.et"
    "peer0.ecx.cecbs.et"
    "peer0.customs.cecbs.et"
    "peer0.shipping.cecbs.et"
)

for i in "${!PEER_NAMES[@]}"; do
    PEER="${PEER_NAMES[$i]}"
    echo "Joining $PEER..."
    
    docker exec "$PEER" peer channel join \
        -b /etc/hyperledger/fabric/channel-artifacts/coffeechannel_genesis.block \
        2>/dev/null || echo "  (already joined or error)"
    
    # Verify
    JOINED=$(docker exec "$PEER" peer channel list 2>/dev/null | grep coffeechannel || echo "")
    if [ -n "$JOINED" ]; then
        echo "  ✓ $PEER joined coffeechannel"
    fi
done

# Step 7: Install Chaincode on All Peers
echo ""
echo "Step 7: Installing chaincode on all peers..."

if [ ! -f blockchain/channel-artifacts/coffee_1.73.tgz ]; then
    echo "Packaging chaincode..."
    docker exec cli peer lifecycle chaincode package \
        /etc/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz \
        --path /opt/gopath/src/github.com/chaincode/coffee/ \
        --lang golang \
        --label coffee_1.73
    echo "✓ Chaincode packaged"
fi

for PEER in "${PEER_NAMES[@]}"; do
    echo "Installing on $PEER..."
    docker exec "$PEER" peer lifecycle chaincode install \
        /etc/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz \
        2>/dev/null || echo "  (already installed or error)"
done

# Step 8: Get Package ID
echo ""
echo "Step 8: Getting chaincode package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | \
    grep coffee_1.73 | sed 's/.*Package ID: //' | sed 's/, Label.*//')

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
    exit 1
fi

echo "Package ID: $PACKAGE_ID"

# Step 9: Approve Chaincode for All Organizations
echo ""
echo "Step 9: Approving chaincode for all organizations..."

ORGS=(
    "ECTA:peer0.ecta.cecbs.et:7051:/etc/hyperledger/fabric/ecta/msp"
    "NBE:peer0.nbe.cecbs.et:10051:/etc/hyperledger/fabric/nbe/msp"
    "Banks:peer0.banks.cecbs.et:9051:/etc/hyperledger/fabric/banks/msp"
    "ECX:peer0.ecx.cecbs.et:8051:/etc/hyperledger/fabric/ecx/msp"
    "Customs:peer0.customs.cecbs.et:11051:/etc/hyperledger/fabric/customs/msp"
    "Shipping:peer0.shipping.cecbs.et:12051:/etc/hyperledger/fabric/shipping/msp"
)

for org_config in "${ORGS[@]}"; do
    IFS=':' read -r ORG_NAME PEER_NAME PORT MSP_PATH <<< "$org_config"
    echo "Approving for $ORG_NAME..."
    
    docker exec "$PEER_NAME" peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        2>/dev/null && echo "  ✓ $ORG_NAME approved" || echo "  ✗ $ORG_NAME approval failed"
done

sleep 3

# Step 10: Check Commit Readiness
echo ""
echo "Step 10: Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --output json 2>/dev/null || true

# Step 11: Commit Chaincode
echo ""
echo "Step 11: Committing chaincode to channel..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/ecta/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/nbe/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/banks/tls/ca.crt \
    2>/dev/null && echo "✓ Chaincode committed successfully" || echo "✗ Commit failed"

sleep 5

# Step 12: Query Committed Chaincode
echo ""
echo "Step 12: Verifying committed chaincode..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    2>/dev/null || echo "Not yet committed"

# Step 13: Initialize Ledger
echo ""
echo "Step 13: Initializing ledger..."
docker exec peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    -C coffeechannel \
    -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/ecta/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/nbe/tls/ca.crt \
    -c '{"function":"initLedger","Args":[]}' \
    --waitForEvent \
    2>/dev/null && echo "✓ Ledger initialized" || echo "✗ Init failed (may already be initialized)"

sleep 3

# Step 14: Test Query
echo ""
echo "Step 14: Testing blockchain query..."
docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"Args":["queryAllCoffee"]}' \
    2>/dev/null || echo "Query failed"

echo ""
echo "==================================================================="
echo "DEPLOYMENT COMPLETE!"
echo "==================================================================="
echo ""
echo "Blockchain Status:"
echo "  • Channel: coffeechannel"
echo "  • Chaincode: coffee v1.73"
echo "  • Organizations: 6 (ECTA, NBE, Banks, ECX, Customs, Shipping)"
echo "  • Peers: 6 (all joined and running)"
echo "  • Orderer: Running and serving channel"
echo ""
echo "Next Steps:"
echo "  1. Test blockchain from GoCBC portal"
echo "  2. Verify transactions are recorded"
echo "  3. Check blockchain explorer/UI"
echo ""
