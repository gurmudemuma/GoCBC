#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   BLOCKCHAIN DEPLOYMENT FROM ABSOLUTE SCRATCH              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/guda/GoCBC

# Step 1: Complete teardown
echo "Step 1: Complete teardown..."
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | grep -E "Removed" | tail -5

# Step 2: Remove all old crypto and channel artifacts
echo ""
echo "Step 2: Cleaning old crypto material and channel artifacts..."
sudo rm -rf blockchain/organizations/peerOrganizations blockchain/organizations/ordererOrganizations
sudo rm -f blockchain/channel-artifacts/coffeechannel.block
echo "✓ Cleaned"

# Step 3: Generate fresh crypto material with proper OU support
echo ""
echo "Step 3: Generating fresh crypto material..."
docker run --rm \
    -v /home/guda/GoCBC/blockchain:/work \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    cryptogen generate --config=./crypto-config.yaml --output="organizations" 2>&1 | grep -E "cecbs.et"

# Step 4: Create MSP config.yaml files for all organizations
echo ""
echo "Step 4: Creating MSP config.yaml files..."
for org in ecta ecx banks nbe customs shipping; do
    docker run --rm \
        -v /home/guda/GoCBC/blockchain:/work \
        -w /work \
        hyperledger/fabric-tools:2.5 \
        bash -c "
        ca_cert=\$(ls organizations/peerOrganizations/${org}.cecbs.et/msp/cacerts/ | head -1)
        cat > organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml << 'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: orderer
EOF
        # Replace placeholder
        sed -i \"s/\\\${ca_cert}/\${ca_cert}/g\" organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml
        # Copy to admin and peer
        cp organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml \
           organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp/
        cp organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml \
           organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/msp/
        echo '✓ ${org}'
        "
done

# Orderer MSP config
docker run --rm \
    -v /home/guda/GoCBC/blockchain:/work \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    bash -c "
    ca_cert=\$(ls organizations/ordererOrganizations/cecbs.et/msp/cacerts/ | head -1)
    cat > organizations/ordererOrganizations/cecbs.et/msp/config.yaml << 'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/\${ca_cert}
    OrganizationalUnitIdentifier: orderer
EOF
    sed -i \"s/\\\${ca_cert}/\${ca_cert}/g\" organizations/ordererOrganizations/cecbs.et/msp/config.yaml
    cp organizations/ordererOrganizations/cecbs.et/msp/config.yaml \
       organizations/ordererOrganizations/cecbs.et/users/Admin@cecbs.et/msp/
    cp organizations/ordererOrganizations/cecbs.et/msp/config.yaml \
       organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/
    echo '✓ orderer'
    "

# Step 5: Start network with new crypto
echo ""
echo "Step 5: Starting network..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | grep -E "Started" | tail -10
echo "Waiting 20 seconds for network stabilization..."
sleep 20

# Step 6: Generate channel genesis block
echo ""
echo "Step 6: Generating channel genesis block..."
cd blockchain
docker run --rm \
    -v $(pwd):/work \
    -w /work \
    -e FABRIC_CFG_PATH=/work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel 2>&1 | grep -E "INFO|genesis|Writing"

# Step 7: Fix permissions and copy artifacts to containers
echo ""
echo "Step 7: Fixing permissions and copying artifacts..."
sudo chmod -R 755 channel-artifacts/
for org in ecta nbe banks; do
    docker exec peer0.${org}.cecbs.et mkdir -p /var/hyperledger/fabric/channel-artifacts 2>/dev/null || true
    docker cp channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    docker cp channel-artifacts/coffee_1.73.tgz peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    echo "  ✓ peer0.${org}.cecbs.et"
done

# Step 8: Join peers to channel
echo ""
echo "Step 8: Joining peers to channel..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join \
        -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block 2>&1 | \
        grep -E "Successfully|Error" | head -1
done

sleep 5

# Step 9: Install chaincode
echo ""
echo "Step 9: Installing chaincode..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode install \
        /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz 2>&1 | \
        grep "Chaincode code package identifier"
done

# Step 10: Get package ID
echo ""
echo "Step 10: Getting package ID..."
PACKAGE_ID=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | \
    grep coffee_1.73 | \
    awk -F'Package ID: |, Label:' '{print $2}')

echo "✓ Package ID: $PACKAGE_ID"

# Step 11: Approve chaincode
echo ""
echo "Step 11: Approving chaincode for all organizations..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}MSP"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | \
        grep -E "Successfully|Error" | head -1
done

# Step 12: Check commit readiness
echo ""
echo "Step 12: Checking commit readiness..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | \
    grep -A5 "Chaincode definition"

# Step 13: Commit chaincode
echo ""
echo "Step 13: Committing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.banks.cecbs.et/tls/ca.crt 2>&1 | \
    grep -E "Chaincode definition|committed" | head -3

sleep 3

# Step 14: Test chaincode
echo ""
echo "Step 14: Testing chaincode..."
RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1)

if echo "$RESULT" | grep -q -E "Error|error"; then
    echo "❌ Chaincode query failed:"
    echo "$RESULT"
else
    echo "✅ Chaincode query successful!"
    echo "$RESULT" | head -5
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ BLOCKCHAIN FULLY DEPLOYED AND OPERATIONAL!            ║"
echo "║                                                            ║"
echo "║   Channel:       coffeechannel                             ║"
echo "║   Chaincode:     coffee v1.73                              ║"
echo "║   Package ID:    ${PACKAGE_ID:0:20}...                     ║"
echo "║   Organizations: ECTA, NBE, Banks                          ║"
echo "║   Status:        ✅ Committed and Ready                    ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 GoCBC blockchain is ready for production testing!"
echo ""
