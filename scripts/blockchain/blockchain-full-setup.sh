#!/bin/bash

set -e

PROJECT_ROOT="/home/guda/GoCBC"
cd $PROJECT_ROOT

echo "=================================="
echo "BLOCKCHAIN FULL SETUP"
echo "=================================="

# Step 1: Generate Crypto Material
echo ""
echo "Step 1/5: Generating crypto material..."
docker run --rm \
    -v "${PROJECT_ROOT}:/work" \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    cryptogen generate --config=blockchain/crypto-config.yaml --output=blockchain/organizations

if [ ! -d "blockchain/organizations/peerOrganizations" ]; then
    echo "ERROR: Crypto material generation failed!"
    exit 1
fi
echo "✓ Crypto material generated"

# Step 2: Generate Channel Artifacts
echo ""
echo "Step 2/5: Generating channel artifacts..."
docker run --rm \
    -v "${PROJECT_ROOT}:/work" \
    -w /work \
    -e FABRIC_CFG_PATH=/work/blockchain \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel -outputCreateChannelTx blockchain/channel-artifacts/coffeechannel.tx -channelID coffeechannel

docker run --rm \
    -v "${PROJECT_ROOT}:/work" \
    -w /work \
    -e FABRIC_CFG_PATH=/work/blockchain \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel -outputBlock blockchain/channel-artifacts/coffeechannel.block -channelID coffeechannel

echo "✓ Channel artifacts generated"

# Step 3: Start Fabric Network
echo ""
echo "Step 3/5: Starting Fabric network..."
docker-compose -f docker-compose-fabric.yml down -v
docker-compose -f docker-compose-fabric.yml up -d

echo "Waiting for containers to be ready..."
sleep 10

# Verify containers are running
RUNNING_PEERS=$(docker ps --filter "name=peer" --format "{{.Names}}" | wc -l)
echo "Peers running: $RUNNING_PEERS"

# Wait for peers to be fully ready
echo "Waiting for peers to fully initialize..."
for i in {1..30}; do
    READY=0
    for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et; do
        if docker logs $peer 2>&1 | grep -q "Serving" || docker logs $peer 2>&1 | grep -q "Started peer"; then
            READY=$((READY + 1))
        fi
    done
    if [ $READY -ge 3 ]; then
        echo "✓ All peers ready"
        break
    fi
    echo "  Waiting... ($i/30) - $READY/3 peers ready"
    sleep 2
done

sleep 5  # Extra buffer

# Step 4: Create and Join Channel using fabric-tools
echo ""
echo "Step 4/5: Creating and joining channel..."

# Run a fabric-tools container with all crypto material mounted
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -v "${PROJECT_ROOT}/chaincodes:/opt/gopath/src/github.com/chaincode" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID coffeechannel \
        --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffeechannel.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --client-cert /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
        --client-key /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key || echo "✓ Orderer channel join attempted"

sleep 5

# Join ECTA peer
echo "  Joining peer0.ecta..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffeechannel.block

# Join NBE peer
echo "  Joining peer0.nbe..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=NBEMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
    hyperledger/fabric-tools:2.5 \
    peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffeechannel.block

# Join Banks peer
echo "  Joining peer0.banks..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=BanksMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
    hyperledger/fabric-tools:2.5 \
    peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffeechannel.block

echo "✓ Main peers joined channel"

# Step 5: Package and Install Chaincode
echo ""
echo "Step 5/5: Deploying chaincode..."

# Check if chaincode exists
if [ ! -d "${PROJECT_ROOT}/chaincodes/coffee" ]; then
    echo "ERROR: Chaincode not found at ${PROJECT_ROOT}/chaincodes/coffee"
    exit 1
fi

# Package chaincode
echo "  Packaging chaincode..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -v "${PROJECT_ROOT}/chaincodes:/opt/gopath/src/github.com/chaincode" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode package /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee.tar.gz \
        --path /opt/gopath/src/github.com/chaincode/coffee \
        --lang golang \
        --label coffee_1.0

# Install on ECTA peer
echo "  Installing on peer0.ecta..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee.tar.gz

# Install on NBE peer
echo "  Installing on peer0.nbe..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=NBEMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee.tar.gz

# Install on Banks peer
echo "  Installing on peer0.banks..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=BanksMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee.tar.gz

echo "✓ Chaincode installed"

# Get package ID
echo "  Getting package ID..."
PACKAGE_ID=$(docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode queryinstalled | grep coffee_1.0 | awk '{print $3}' | cut -d ',' -f 1 | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not find package ID"
    exit 1
fi

echo "  Package ID: $PACKAGE_ID"

# Approve for ECTA
echo "  Approving for ECTA..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --package-id $PACKAGE_ID \
        --sequence 1 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for NBE
echo "  Approving for NBE..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=NBEMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --package-id $PACKAGE_ID \
        --sequence 1 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for Banks
echo "  Approving for Banks..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=BanksMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --package-id $PACKAGE_ID \
        --sequence 1 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Commit chaincode
echo "  Committing chaincode..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --sequence 1 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.nbe.cecbs.et:10051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.banks.cecbs.et:9051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

echo "✓ Chaincode committed"

# Verify
echo ""
echo "Verifying chaincode deployment..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    -e FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee

echo ""
echo "=================================="
echo "✓ BLOCKCHAIN SETUP COMPLETE!"
echo "=================================="
echo ""
echo "Chaincode 'coffee' version 1.0 is deployed."
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Next: Start API and run workflow tests"
