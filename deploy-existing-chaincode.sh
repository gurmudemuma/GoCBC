#!/bin/bash

set -e

PROJECT_ROOT="/home/guda/GoCBC"
cd $PROJECT_ROOT

CHAINCODE_PACKAGE="coffee_1.73.tgz"
CHAINCODE_VERSION="1.73"
SEQUENCE="73"

echo "=================================="
echo "DEPLOYING EXISTING CHAINCODE"
echo "=================================="
echo "Package: $CHAINCODE_PACKAGE"
echo "Version: $CHAINCODE_VERSION"
echo "Sequence: $SEQUENCE"
echo ""

# Step 1: Install on ECTA peer
echo "Step 1/6: Installing on peer0.ecta..."
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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/$CHAINCODE_PACKAGE

echo "✓ Installed on peer0.ecta"
echo ""

# Step 2: Install on NBE peer  
echo "Step 2/6: Installing on peer0.nbe..."
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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/$CHAINCODE_PACKAGE

echo "✓ Installed on peer0.nbe"
echo ""

# Step 3: Install on Banks peer
echo "Step 3/6: Installing on peer0.banks..."
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
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/$CHAINCODE_PACKAGE

echo "✓ Installed on peer0.banks"
echo ""

# Step 4: Get package ID
echo "Step 4/6: Getting package ID..."
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
    peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_${CHAINCODE_VERSION} | awk '{print $3}' | cut -d ',' -f 1 | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not find package ID"
    exit 1
fi

echo "Package ID: $PACKAGE_ID"
echo ""

# Step 5: Approve for all orgs
echo "Step 5/6: Approving for all organizations..."

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
        --version $CHAINCODE_VERSION \
        --package-id $PACKAGE_ID \
        --sequence $SEQUENCE \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

echo "  ✓ ECTA approved"

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
        --version $CHAINCODE_VERSION \
        --package-id $PACKAGE_ID \
        --sequence $SEQUENCE \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

echo "  ✓ NBE approved"

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
        --version $CHAINCODE_VERSION \
        --package-id $PACKAGE_ID \
        --sequence $SEQUENCE \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem

echo "  ✓ Banks approved"
echo ""

# Step 6: Commit chaincode
echo "Step 6/6: Committing chaincode to channel..."
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
        --version $CHAINCODE_VERSION \
        --sequence $SEQUENCE \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.nbe.cecbs.et:10051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.banks.cecbs.et:9051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

echo "✓ Chaincode committed"
echo ""

# Verify
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
echo "✓ CHAINCODE DEPLOYED!"
echo "=================================="
echo "Version: $CHAINCODE_VERSION"
echo "Sequence: $SEQUENCE"
echo "Package ID: $PACKAGE_ID"
echo ""
