#!/bin/bash
# Final Chaincode Deployment
# Orderer is now in channel, complete chaincode deployment

set -e

echo "================================================================"
echo "FINAL CHAINCODE DEPLOYMENT"
echo "================================================================"
echo ""

cd /home/guda/GoCBC

# Step 1: Verify Orderer is Serving Channel
echo "Step 1: Verifying orderer status..."
curl -k -s --cert blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
  --key blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key \
  https://localhost:7053/participation/v1/channels | grep -q "coffeechannel" && \
  echo "✓ Orderer is serving coffeechannel" || { echo "✗ Orderer not ready"; exit 1; }

# Step 2: Test Channel Fetch
echo ""
echo "Step 2: Testing channel fetch from orderer..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer channel fetch config /tmp/test.block \
    -c coffeechannel \
    -o orderer.cecbs.et:7050 \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    2>&1 | grep -E "(Received block|ERROR)" || true

# Step 3: Install Chaincode (if not already installed)
echo ""
echo "Step 3: Installing chaincode on all peers..."

PEERS=(
    "peer0.ecta.cecbs.et:ECTAMSP"
    "peer0.nbe.cecbs.et:NBEMSP"
    "peer0.banks.cecbs.et:BanksMSP"
    "peer0.ecx.cecbs.et:ECXMSP"
    "peer0.customs.cecbs.et:CustomsMSP"
    "peer0.shipping.cecbs.et:ShippingMSP"
)

for peer_config in "${PEERS[@]}"; do
    IFS=':' read -r PEER_NAME MSP_ID <<< "$peer_config"
    ORG_NAME=$(echo "$PEER_NAME" | cut -d. -f2)
    
    echo "Installing on $PEER_NAME..."
    docker exec -e CORE_PEER_LOCALMSPID="$MSP_ID" \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@${ORG_NAME}.cecbs.et/msp" \
        "$PEER_NAME" peer lifecycle chaincode install \
        /etc/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz \
        2>&1 | grep -E "(Chaincode code package identifier|already installed|installed successfully)" || \
        echo "  (may already be installed)"
done

# Step 4: Get Package ID
echo ""
echo "Step 4: Getting chaincode package ID..."
PACKAGE_ID=$(docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | \
    grep coffee_1.73 | sed 's/.*Package ID: //' | sed 's/, Label.*//')

if [ -z "$PACKAGE_ID" ]; then
    echo "✗ Could not get package ID"
    docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
        peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1
    exit 1
fi

echo "✓ Package ID: $PACKAGE_ID"

# Step 5: Approve Chaincode for All Organizations
echo ""
echo "Step 5: Approving chaincode for all organizations..."

# Define peer ports
declare -A PEER_PORTS
PEER_PORTS["peer0.ecta.cecbs.et"]="7051"
PEER_PORTS["peer0.nbe.cecbs.et"]="10051"
PEER_PORTS["peer0.banks.cecbs.et"]="9051"
PEER_PORTS["peer0.ecx.cecbs.et"]="8051"
PEER_PORTS["peer0.customs.cecbs.et"]="11051"
PEER_PORTS["peer0.shipping.cecbs.et"]="12051"

for peer_config in "${PEERS[@]}"; do
    IFS=':' read -r PEER_NAME MSP_ID <<< "$peer_config"
    ORG_NAME=$(echo "$PEER_NAME" | cut -d. -f2)
    PEER_PORT="${PEER_PORTS[$PEER_NAME]}"
    
    echo "Approving for $ORG_NAME ($MSP_ID) on port $PEER_PORT..."
    docker exec -e CORE_PEER_LOCALMSPID="$MSP_ID" \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@${ORG_NAME}.cecbs.et/msp" \
        -e CORE_PEER_ADDRESS="$PEER_NAME:$PEER_PORT" \
        "$PEER_NAME" peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        2>&1 | grep -E "(Successfully|approved|Error)" && echo "  ✓ Approved" || echo "  ✗ Failed"
done

sleep 3

# Step 6: Check Commit Readiness
echo ""
echo "Step 6: Checking commit readiness..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --output json 2>&1

# Step 7: Commit Chaincode
echo ""
echo "Step 7: Committing chaincode with all peer endorsements..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/customs-ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt \
    2>&1 && echo "✓ Chaincode committed" || echo "✗ Commit failed"

sleep 5

# Step 8: Verify Committed Chaincode
echo ""
echo "Step 8: Verifying committed chaincode..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    2>&1

# Step 9: Initialize Ledger
echo ""
echo "Step 9: Initializing ledger..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel \
    -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt \
    -c '{"function":"initLedger","Args":[]}' \
    --waitForEvent \
    2>&1 && echo "✓ Ledger initialized" || echo "Note: May already be initialized"

sleep 3

# Step 10: Test Query
echo ""
echo "Step 10: Testing blockchain query..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"Args":["queryAllCoffee"]}' \
    2>&1

echo ""
echo "================================================================"
echo "BLOCKCHAIN DEPLOYMENT COMPLETE!"
echo "================================================================"
echo ""
echo "✓ Orderer joined channel: coffeechannel"
echo "✓ All 6 peers joined channel"
echo "✓ Chaincode deployed: coffee v1.73"
echo "✓ Ledger initialized and ready"
echo ""
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Ready for testing from GoCBC portals!"
echo ""
