#!/bin/bash

set -e

PROJECT_ROOT="/home/guda/GoCBC"
cd $PROJECT_ROOT

echo "=========================================="
echo "COMPLETE BLOCKCHAIN FIX & DEPLOYMENT"
echo "=========================================="
echo ""

# Step 1: Stop and clean everything
echo "Step 1/8: Cleaning up old blockchain state..."
docker-compose -f docker-compose-fabric.yml down
docker volume prune -f
sleep 2
echo "✓ Cleanup complete"
echo ""

# Step 2: Start fresh containers
echo "Step 2/8: Starting fresh Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d
sleep 15
echo "✓ Containers started"
echo ""

# Step 3: Generate channel genesis block
echo "Step 3/8: Creating channel genesis block..."
docker run --rm \
    -v "${PROJECT_ROOT}:/work" \
    -w /work \
    -e FABRIC_CFG_PATH=/work/blockchain \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel -outputBlock blockchain/channel-artifacts/coffeechannel.block -channelID coffeechannel

echo "✓ Channel genesis block created"
echo ""

# Step 4: Use osnadmin to join orderer to channel
echo "Step 4/8: Joining orderer to channel..."
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_ROOT}/blockchain:/opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain" \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID coffeechannel \
        --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffeechannel.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --client-cert /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
        --client-key /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key || echo "Orderer may already be in channel"

echo "✓ Orderer joined"
echo ""

# Step 5: Join peers to channel
echo "Step 5/8: Joining peers to channel..."

# ECTA peer
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

# NBE peer  
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

# Banks peer
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

echo "✓ All peers joined"
echo ""

# Step 6: Install chaincode
echo "Step 6/8: Installing chaincode on peers..."

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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee_1.73.tgz

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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee_1.73.tgz

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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee_1.73.tgz

echo "✓ Chaincode installed"
echo ""

# Step 7: Get package ID
echo "Step 7/8: Getting package ID..."
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
    peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.73 | awk '{print $3}' | cut -d ',' -f 1 | head -1)

echo "Package ID: $PACKAGE_ID"
echo ""

# Step 8: Approve and commit
echo "Step 8/8: Approving and committing chaincode..."

# Approve for ECTA
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
        --version 1.73 \
        --package-id $PACKAGE_ID \
        --sequence 73 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for NBE
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
        --version 1.73 \
        --package-id $PACKAGE_ID \
        --sequence 73 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Approve for Banks
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
        --version 1.73 \
        --package-id $PACKAGE_ID \
        --sequence 73 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

# Commit chaincode
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
        --version 1.73 \
        --sequence 73 \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.nbe.cecbs.et:10051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.banks.cecbs.et:9051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

echo ""
echo "=========================================="
echo "✓ BLOCKCHAIN FULLY OPERATIONAL!"
echo "=========================================="
echo ""
echo "Chaincode coffee_1.73 deployed successfully"
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Now start the API and run tests!"
