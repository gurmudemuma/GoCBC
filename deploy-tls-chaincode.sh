#!/bin/bash
#
# Deploy TLS-enabled Coffee Chaincode (Version 1.9_tls)
# This script approves and commits the TLS-enabled chaincode across all 6 organizations

set -e

CHANNEL_NAME="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.9_tls"
CC_SEQUENCE=12
CC_PACKAGE_ID="coffee_1.9_tls:2b094adc2b1d5c848eacf297c7ab1c1bcd2af67cb7f763f8f11c8e303a951db4"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}========================================${RESET}"
echo -e "${BLUE}Deploying TLS-Enabled Coffee Chaincode${RESET}"
echo -e "${BLUE}========================================${RESET}"
echo ""
echo "Package ID: ${CC_PACKAGE_ID}"
echo "Version: ${CC_VERSION}"
echo "Sequence: ${CC_SEQUENCE}"
echo ""

# Function to approve chaincode for an organization
approve_chaincode() {
    local org_name=$1
    local peer_address=$2
    local msp_id=$3
    local org_domain=$4
    
    echo -e "${YELLOW}Approving chaincode for ${org_name} (${msp_id})...${RESET}"
    
    docker exec \
        -e CORE_PEER_ADDRESS=${peer_address} \
        -e CORE_PEER_LOCALMSPID=${msp_id} \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org_domain}/msp \
        peer0.${org_domain} \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID ${CHANNEL_NAME} \
        --name ${CC_NAME} \
        --version ${CC_VERSION} \
        --package-id ${CC_PACKAGE_ID} \
        --sequence ${CC_SEQUENCE} \
        --init-required
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${org_name} approved successfully${RESET}"
    else
        echo -e "${RED}✗ ${org_name} approval failed${RESET}"
        return 1
    fi
    echo ""
}

# Approve for all 6 organizations
echo -e "${BLUE}Step 1: Approving chaincode for all organizations...${RESET}"
echo ""

approve_chaincode "ECTA" "peer0.ecta.cecbs.et:7051" "ECTAMSP" "ecta.cecbs.et"
approve_chaincode "ECX" "peer0.ecx.cecbs.et:8051" "ECXMSP" "ecx.cecbs.et"
approve_chaincode "Banks" "peer0.banks.cecbs.et:9051" "BanksMSP" "banks.cecbs.et"
approve_chaincode "NBE" "peer0.nbe.cecbs.et:10051" "NBEMSP" "nbe.cecbs.et"
approve_chaincode "Customs" "peer0.customs.cecbs.et:11051" "CustomsMSP" "customs.cecbs.et"
approve_chaincode "Shipping" "peer0.shipping.cecbs.et:12051" "ShippingMSP" "shipping.cecbs.et"

# Check commit readiness
echo -e "${BLUE}Step 2: Checking commit readiness...${RESET}"
echo ""

docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence ${CC_SEQUENCE} \
    --init-required

echo ""

# Commit the chaincode
echo -e "${BLUE}Step 3: Committing chaincode definition...${RESET}"
echo ""

docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence ${CC_SEQUENCE} \
    --init-required \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Chaincode committed successfully!${RESET}"
else
    echo ""
    echo -e "${RED}✗ Chaincode commit failed${RESET}"
    exit 1
fi

echo ""

# Query committed chaincode
echo -e "${BLUE}Step 4: Verifying committed chaincode...${RESET}"
echo ""

docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer lifecycle chaincode querycommitted \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME}

echo ""

# Initialize the chaincode
echo -e "${BLUE}Step 5: Initializing chaincode...${RESET}"
echo ""

docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/../organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --isInit \
    -c '{"function":"InitLedger","Args":[]}'

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Chaincode initialized successfully!${RESET}"
else
    echo ""
    echo -e "${YELLOW}⚠ Chaincode initialization may have failed (check if already initialized)${RESET}"
fi

echo ""

# Test query
echo -e "${BLUE}Step 6: Testing chaincode query...${RESET}"
echo ""

docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"QueryAllExporters","Args":[]}'

echo ""
echo -e "${GREEN}========================================${RESET}"
echo -e "${GREEN}TLS Chaincode Deployment Complete!${RESET}"
echo -e "${GREEN}========================================${RESET}"
echo ""
echo "Chaincode: ${CC_NAME}"
echo "Version: ${CC_VERSION}"
echo "Sequence: ${CC_SEQUENCE}"
echo "TLS: Enabled"
echo "Package ID: ${CC_PACKAGE_ID}"
echo ""
echo "You can now test the system end-to-end!"
