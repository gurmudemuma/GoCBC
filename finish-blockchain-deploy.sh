#!/bin/bash

set -e

echo "=== Finishing Blockchain Deployment ==="
echo ""

cd /home/guda/GoCBC/blockchain

# Copy artifacts to containers
echo "Copying channel artifacts to peer containers..."
for org in ecta nbe banks; do
    echo "  → peer0.${org}.cecbs.et"
    docker exec peer0.${org}.cecbs.et mkdir -p /var/hyperledger/fabric/channel-artifacts
    docker cp channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    docker cp channel-artifacts/coffee_1.73.tgz peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
done

# Join peers to channel
echo ""
echo "Joining peers to channel..."
for org in ecta nbe banks; do
    echo "  → peer0.${org}.cecbs.et"
    docker exec peer0.${org}.cecbs.et \
        peer channel join \
        -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block \
        2>&1 || echo "    (already joined or error)"
done

sleep 3

# Install chaincode
echo ""
echo "Installing chaincode on all peers..."
for org in ecta nbe banks; do
    echo "  → peer0.${org}.cecbs.et"
    docker exec peer0.${org}.cecbs.et \
        peer lifecycle chaincode install \
        /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz \
        2>&1 | grep -E "(Chaincode code package identifier|Error)" || echo "    Installed"
done

# Get package ID
echo ""
echo "Getting chaincode package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | \
    grep coffee_1.73 | \
    awk -F'Package ID: |, Label:' '{print $2}')

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Failed to get package ID"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
    exit 1
fi

echo "✓ Package ID: $PACKAGE_ID"

# Approve for each org
echo ""
echo "Approving chaincode for each organization..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}MSP"
    
    docker exec peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        2>&1 | grep -E "(Chaincode definition for chaincode|Error)" || echo "    Approved"
done

# Check commit readiness
echo ""
echo "Checking commit readiness..."
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    2>&1

# Commit chaincode
echo ""
echo "Committing chaincode to channel..."
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /var/hyperledger/fabric/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /var/hyperledger/fabric/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    2>&1

echo ""
echo "Testing chaincode..."
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' \
    2>&1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ BLOCKCHAIN FULLY DEPLOYED AND OPERATIONAL!            ║"
echo "║                                                            ║"
echo "║   Channel: coffeechannel                                   ║"
echo "║   Chaincode: coffee v1.73                                  ║"
echo "║   Organizations: ECTA, NBE, Banks                          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
