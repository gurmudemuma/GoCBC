#!/bin/bash

set -e

PROJECT_ROOT="/home/guda/GoCBC"
cd $PROJECT_ROOT

echo "=================================="
echo "CHAINCODE DEPLOYMENT"
echo "=================================="
echo ""
echo "Prerequisites: Channel must exist and peers must be joined"
echo ""

# Step 1: Package chaincode
echo "Step 1/4: Packaging Go chaincode..."
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

if [ ! -f "blockchain/channel-artifacts/coffee.tar.gz" ]; then
    echo "ERROR: Chaincode package not created"
    exit 1
fi

echo "✓ Chaincode packaged ($(ls -lh blockchain/channel-artifacts/coffee.tar.gz | awk '{print $5}'))"
echo ""

# Step 2: Install on peers
echo "Step 2/4: Installing on peers (this takes 3-5 minutes per peer)..."
echo ""

# Install on ECTA peer
echo "  Installing on peer0.ecta (ECTA)..."
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

echo "  ✓ Installed on peer0.ecta"
echo ""

# Install on NBE peer
echo "  Installing on peer0.nbe (NBE)..."
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

echo "  ✓ Installed on peer0.nbe"
echo ""

# Install on Banks peer
echo "  Installing on peer0.banks (Banks)..."
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

echo "  ✓ Installed on peer0.banks"
echo ""

# Step 3: Get package ID
echo "Step 3/4: Getting package ID..."
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
    peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.0 | awk '{print $3}' | cut -d ',' -f 1 | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not find package ID"
    exit 1
fi

echo "Package ID: $PACKAGE_ID"
echo ""

# Step 4: Approve and Commit
echo "Step 4/4: Approving and committing chaincode..."
echo ""

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

echo "  ✓ ECTA approved"

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

echo "  ✓ NBE approved"

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

echo "  ✓ Banks approved"
echo ""

# Commit chaincode
echo "  Committing chaincode to channel..."
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

echo "  ✓ Chaincode committed"
echo ""

# Verify deployment
echo "Verifying deployment..."
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
echo "✓ CHAINCODE DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Next steps:"
echo "  1. Start API: cd api && npm run dev"
echo "  2. Run tests: bash test-complete-workflow-with-creation.sh"
echo ""
