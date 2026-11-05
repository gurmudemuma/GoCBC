#!/bin/bash

set -e

echo "=== Regenerating Crypto Material with Proper OU Support ==="

cd /home/guda/GoCBC/blockchain

# Stop all containers
echo "Stopping containers..."
docker-compose -f ../docker-compose-fabric.yml down

# Remove old crypto material
echo "Removing old crypto material..."
rm -rf organizations/ordererOrganizations organizations/peerOrganizations

# Regenerate crypto material
echo "Generating new crypto material..."
cryptogen generate --config=./crypto-config.yaml --output="organizations"

# Create config.yaml for each organization's MSP to enable NodeOUs
echo "Creating MSP config.yaml files with NodeOU support..."

# Function to create config.yaml
create_msp_config() {
    local msp_path=$1
    cat > "$msp_path/config.yaml" << EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca-${2}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca-${2}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca-${2}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca-${2}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF
    echo "Created config.yaml for $msp_path"
}

# Create config.yaml for each peer organization
for org in ecta ecx banks nbe customs shipping; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    msp_path="organizations/peerOrganizations/${org}.cecbs.et/msp"
    
    if [ -d "$msp_path" ]; then
        create_msp_config "$msp_path" "$org"
        
        # Also create for admin user MSP
        admin_msp="organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp"
        if [ -d "$admin_msp" ]; then
            create_msp_config "$admin_msp" "$org"
        fi
        
        # And for each peer
        peer_msp="organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/msp"
        if [ -d "$peer_msp" ]; then
            create_msp_config "$peer_msp" "$org"
        fi
    fi
done

# Create config.yaml for orderer organization
orderer_msp="organizations/ordererOrganizations/cecbs.et/msp"
if [ -d "$orderer_msp" ]; then
    cat > "$orderer_msp/config.yaml" << EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca-cecbs.et-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca-cecbs.et-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca-cecbs.et-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca-cecbs.et-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF
    echo "Created config.yaml for orderer MSP"
    
    # Also for orderer admin
    admin_msp="organizations/ordererOrganizations/cecbs.et/users/Admin@cecbs.et/msp"
    if [ -d "$admin_msp" ]; then
        cp "$orderer_msp/config.yaml" "$admin_msp/"
    fi
    
    # And for orderer node
    orderer_node_msp="organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp"
    if [ -d "$orderer_node_msp" ]; then
        cp "$orderer_msp/config.yaml" "$orderer_node_msp/"
    fi
fi

echo ""
echo "=== Crypto Material Regenerated Successfully ==="
echo ""
echo "Now starting fresh network..."

# Start containers
docker-compose -f ../docker-compose-fabric.yml up -d

echo "Waiting for containers to be ready..."
sleep 10

# Create channel
echo ""
echo "=== Creating Channel ==="
rm -f channel-artifacts/coffeechannel.block
configtxgen -profile CoffeeChannel -outputBlock ./channel-artifacts/coffeechannel.block -channelID coffeechannel

# Join orderer to channel
echo ""
echo "=== Joining Orderer to Channel ==="
docker exec orderer.cecbs.et osnadmin channel join --channelID coffeechannel --config-block /var/hyperledger/orderer/channel-artifacts/coffeechannel.block || echo "Orderer already in channel"

# Join peers to channel
echo ""
echo "=== Joining Peers to Channel ==="

join_peer() {
    local org=$1
    local port=$2
    
    echo "Joining peer0.${org}.cecbs.et..."
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org^^}MSP" \
        -e CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port} \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et peer channel join -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block || echo "Peer already joined"
}

join_peer "ecta" "7051"
join_peer "nbe" "10051"
join_peer "banks" "9051"

# Install chaincode
echo ""
echo "=== Installing Chaincode ==="

install_chaincode() {
    local org=$1
    local port=$2
    
    echo "Installing on peer0.${org}.cecbs.et..."
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org^^}MSP" \
        -e CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port} \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et peer lifecycle chaincode install /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz
}

install_chaincode "ecta" "7051"
install_chaincode "nbe" "10051"
install_chaincode "banks" "9051"

# Get package ID
echo ""
echo "=== Getting Package ID ==="
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep coffee_1.73 | awk '{print $3}' | sed 's/,$//')
echo "Package ID: $PACKAGE_ID"

# Approve chaincode for each org
echo ""
echo "=== Approving Chaincode ==="

approve_chaincode() {
    local org=$1
    local port=$2
    
    echo "Approving for ${org^^}MSP..."
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org^^}MSP" \
        -e CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port} \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --channelID coffeechannel \
            --name coffee \
            --version 1.73 \
            --package-id "$PACKAGE_ID" \
            --sequence 1 \
            --tls \
            --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem
}

approve_chaincode "ecta" "7051"
approve_chaincode "nbe" "10051"
approve_chaincode "banks" "9051"

# Check commit readiness
echo ""
echo "=== Checking Commit Readiness ==="
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Commit chaincode
echo ""
echo "=== Committing Chaincode ==="
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode commit \
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
echo "=== Blockchain Fully Deployed! ==="
echo ""
echo "Testing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
        -C coffeechannel \
        -n coffee \
        -c '{"function":"queryAllCoffee","Args":[]}'

echo ""
echo "✅ BLOCKCHAIN IS READY!"
