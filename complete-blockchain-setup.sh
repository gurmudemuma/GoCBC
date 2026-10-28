#!/bin/bash

set -e

echo "=== Complete Blockchain Setup from Scratch ==="

cd /home/guda/GoCBC

# Stop and clean everything
echo "Stopping all containers and cleaning volumes..."
docker-compose -f docker-compose-fabric.yml down -v

# Generate crypto material using fabric-tools container
echo ""
echo "=== Generating Crypto Material ==="
docker run --rm \
    -v /home/guda/GoCBC/blockchain:/work \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    cryptogen generate --config=./crypto-config.yaml --output="organizations"

# Create config.yaml for each MSP to enable NodeOUs
echo ""
echo "=== Creating MSP config.yaml files ==="

create_peer_msp_config() {
    local org=$1
    docker run --rm \
        -v /home/guda/GoCBC/blockchain:/work \
        -w /work \
        hyperledger/fabric-tools:2.5 \
        bash -c "
        ca_cert=\$(ls organizations/peerOrganizations/${org}.cecbs.et/msp/cacerts/ | head -1)
        cat > organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml << EOF
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
        # Copy to admin and peer MSPs
        cp organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml \
           organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp/
        cp organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml \
           organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/msp/
        echo '✓ Created config.yaml for ${org}'
        "
}

for org in ecta ecx banks nbe customs shipping; do
    create_peer_msp_config "$org"
done

# Create orderer MSP config
echo "Creating orderer MSP config..."
docker run --rm \
    -v /home/guda/GoCBC/blockchain:/work \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    bash -c "
    ca_cert=\$(ls organizations/ordererOrganizations/cecbs.et/msp/cacerts/ | head -1)
    cat > organizations/ordererOrganizations/cecbs.et/msp/config.yaml << EOF
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
    cp organizations/ordererOrganizations/cecbs.et/msp/config.yaml \
       organizations/ordererOrganizations/cecbs.et/users/Admin@cecbs.et/msp/
    cp organizations/ordererOrganizations/cecbs.et/msp/config.yaml \
       organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/
    echo '✓ Created orderer config.yaml'
    "

echo ""
echo "=== Starting Network ==="
docker-compose -f docker-compose-fabric.yml up -d

echo "Waiting for network to be ready..."
sleep 15

# Generate channel genesis block
echo ""
echo "=== Creating Channel Genesis Block ==="
docker run --rm \
    -v /home/guda/GoCBC/blockchain:/work \
    -w /work \
    -e FABRIC_CFG_PATH=/work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel

# Copy genesis block to orderer
echo ""
echo "=== Copying genesis block to orderer ==="
docker cp blockchain/channel-artifacts/coffeechannel.block orderer.cecbs.et:/var/hyperledger/orderer/channel-artifacts/

# Join orderer to channel
echo ""
echo "=== Joining Orderer to Channel ==="
docker exec orderer.cecbs.et \
    osnadmin channel join \
    --channelID coffeechannel \
    --config-block /var/hyperledger/orderer/channel-artifacts/coffeechannel.block \
    || echo "Orderer already in channel (or osnadmin not available - that's OK)"

# Copy genesis block and chaincode to peer containers
echo ""
echo "=== Copying artifacts to peer containers ==="
for org in ecta nbe banks; do
    docker cp blockchain/channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
done

# Join peers to channel
echo ""
echo "=== Joining Peers to Channel ==="

join_peer() {
    local org=$1
    local port=$2
    local org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    
    echo "Joining peer0.${org}.cecbs.et..."
    docker exec peer0.${org}.cecbs.et peer channel join \
        -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block \
        || echo "Peer already joined"
}

join_peer "ecta" "7051"
join_peer "nbe" "10051"
join_peer "banks" "9051"

sleep 5

# Install chaincode
echo ""
echo "=== Installing Chaincode ==="

install_chaincode() {
    local org=$1
    
    echo "Installing on peer0.${org}.cecbs.et..."
    docker exec peer0.${org}.cecbs.et \
        peer lifecycle chaincode install \
        /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz
}

install_chaincode "ecta"
install_chaincode "nbe"
install_chaincode "banks"

# Get package ID
echo ""
echo "=== Getting Package ID ==="
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | \
    grep coffee_1.73 | \
    awk '{print $3}' | \
    sed 's/,$//')

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Failed to get package ID"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
    exit 1
fi

echo "Package ID: $PACKAGE_ID"

# Approve chaincode for each org
echo ""
echo "=== Approving Chaincode ==="

approve_chaincode() {
    local org=$1
    local org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    
    echo "Approving for ${org_upper}MSP..."
    docker exec peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem
}

approve_chaincode "ecta"
approve_chaincode "nbe"
approve_chaincode "banks"

# Check commit readiness
echo ""
echo "=== Checking Commit Readiness ==="
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Commit chaincode
echo ""
echo "=== Committing Chaincode ==="
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
    --tlsRootCertFiles /var/hyperledger/fabric/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

echo ""
echo "=== Testing Chaincode ==="
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}'

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
echo ""
