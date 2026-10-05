#!/bin/bash

echo "=========================================="
echo "Fix Channel Configuration and Initialize"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

CHANNEL_NAME="coffeechannel"
ORDERER_CA=/etc/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Check if channel exists
echo "Step 1: Checking if channel exists..."
if [ -f "blockchain/channel-artifacts/${CHANNEL_NAME}.block" ]; then
    echo "✅ Channel genesis block exists"
else
    echo "⚠️  Channel genesis block not found, creating..."
    docker exec peer0.ecta.cecbs.et peer channel create \
        -o orderer.cecbs.et:7050 \
        -c $CHANNEL_NAME \
        -f /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.tx \
        --outputBlock /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block \
        --tls --cafile $ORDERER_CA 2>&1 | tail -5
fi

echo ""
echo "Step 2: Joining all peers to channel..."

# Array of peers
declare -a PEERS=("peer0.ecta.cecbs.et:7051" "peer0.ecx.cecbs.et:8051" "peer0.banks.cecbs.et:9051" "peer0.nbe.cecbs.et:10051" "peer0.customs.cecbs.et:11051" "peer0.shipping.cecbs.et:12051")
declare -a PEER_NAMES=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for i in "${!PEERS[@]}"; do
    PEER_NAME=${PEER_NAMES[$i]}
    echo "  Joining ${PEER_NAME}..."
    
    docker exec peer0.${PEER_NAME}.cecbs.et peer channel join \
        -b /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block 2>&1 | grep -E "success|already|error" | head -2
done

echo ""
echo "Step 3: Updating anchor peers..."
for i in "${!PEER_NAMES[@]}"; do
    PEER_NAME=${PEER_NAMES[$i]}
    ORG_NAME=$(echo $PEER_NAME | tr '[:lower:]' '[:upper:]')
    echo "  Updating anchor peer for ${ORG_NAME}..."
    
    docker exec peer0.${PEER_NAME}.cecbs.et peer channel update \
        -o orderer.cecbs.et:7050 \
        -c $CHANNEL_NAME \
        -f /etc/hyperledger/fabric/channel-artifacts/${ORG_NAME}MSPanchors.tx \
        --tls --cafile $ORDERER_CA 2>&1 | grep -E "success|error" | head -1
done

echo ""
echo "Step 4: Testing chaincode query..."
sleep 3

QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C $CHANNEL_NAME \
    -n coffee \
    -c '{"Args":["GetAllShipments"]}' 2>&1)

if echo "$QUERY_RESULT" | grep -q "Error"; then
    echo "❌ Query still failing. Trying to invoke InitLedger..."
    
    docker exec peer0.ecta.cecbs.et peer chaincode invoke \
        -C $CHANNEL_NAME \
        -n coffee \
        -c '{"function":"InitLedger","Args":[]}' \
        --waitForEvent 2>&1 | tail -10
    
    echo ""
    echo "Waiting 5 seconds and testing again..."
    sleep 5
    
    QUERY_RESULT2=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
        -C $CHANNEL_NAME \
        -n coffee \
        -c '{"Args":["GetAllShipments"]}' 2>&1)
    
    if echo "$QUERY_RESULT2" | grep -q "Error"; then
        echo "❌ Still failing. Error:"
        echo "$QUERY_RESULT2" | head -5
    else
        echo "✅ Success! Chaincode is now working!"
        echo "$QUERY_RESULT2" | head -10
    fi
else
    echo "✅ Chaincode query successful!"
    echo "$QUERY_RESULT" | head -10
fi

echo ""
echo "=========================================="
echo "Channel Fix Complete"
echo "=========================================="
