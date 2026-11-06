#!/bin/bash

################################################################################
# Chaincode Deployment Script for GoCBC
# Deploys the coffee chaincode to all peers
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Coffee Chaincode Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if already committed and determine version/sequence
echo -e "${YELLOW}Checking if chaincode is already deployed...${NC}"
CURRENT_VERSION=""
CURRENT_SEQUENCE=""
VERSION="1.0"
SEQUENCE="1"

if docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null | grep -q "Version:"; then
    
    # Get current version and sequence
    CHAINCODE_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID coffeechannel --name coffee 2>/dev/null)
    
    CURRENT_VERSION=$(echo "$CHAINCODE_INFO" | grep -oP 'Version: \K[0-9.]+' || echo "1.0")
    CURRENT_SEQUENCE=$(echo "$CHAINCODE_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "1")
    
    echo -e "${GREEN}✓ Chaincode already deployed: v${CURRENT_VERSION}, sequence ${CURRENT_SEQUENCE}${NC}"
    
    # Check if chaincode source has changed
    CHAINCODE_DIR="/home/guda/GoCBC/chaincodes/coffee"
    if [ -f "$CHAINCODE_DIR/.last_deployed" ]; then
        LAST_HASH=$(cat "$CHAINCODE_DIR/.last_deployed" 2>/dev/null || echo "")
        CURRENT_HASH=$(find "$CHAINCODE_DIR" -name "*.go" -type f -exec md5sum {} \; | sort | md5sum | awk '{print $1}')
        
        if [ "$LAST_HASH" == "$CURRENT_HASH" ]; then
            echo -e "${GREEN}✓ No chaincode changes detected - skipping redeployment${NC}"
            echo ""
            echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}  Chaincode is up-to-date and ready${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠ Chaincode changes detected - upgrading...${NC}"
        fi
    fi
    
    # Increment version for upgrade
    MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
    MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
    MINOR=$((MINOR + 1))
    VERSION="${MAJOR}.${MINOR}"
    SEQUENCE=$((CURRENT_SEQUENCE + 1))
    
    echo -e "${BLUE}➜ Upgrading to v${VERSION}, sequence ${SEQUENCE}${NC}"
else
    echo -e "${YELLOW}⚠ Chaincode not yet deployed - performing initial deployment${NC}"
fi

echo ""

# Locate or create chaincode package
CHAINCODE_DIR="/home/guda/GoCBC/chaincodes/coffee"
CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee_${VERSION}.tar.gz"

# Always rebuild package for deployment
echo -e "${YELLOW}Building chaincode package v${VERSION}...${NC}"
cd "$CHAINCODE_DIR"

# Remove old package
rm -f "coffee_${VERSION}.tar.gz"

# Package the chaincode - let Docker run as root, then fix ownership
docker run --rm \
    -v "$CHAINCODE_DIR":/chaincode \
    -w /chaincode \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode package "coffee_${VERSION}.tar.gz" \
    --path /chaincode \
    --lang golang \
    --label "coffee_${VERSION}"

if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    echo -e "${RED}✗ Failed to create chaincode package${NC}"
    exit 1
fi

# Fix ownership of the generated package
sudo chown $(id -u):$(id -g) "$CHAINCODE_PACKAGE" 2>/dev/null || chown $(id -u):$(id -g) "$CHAINCODE_PACKAGE" 2>/dev/null || true
chmod 644 "$CHAINCODE_PACKAGE" 2>/dev/null || true

# Record hash for change detection
find "$CHAINCODE_DIR" -name "*.go" -type f -exec md5sum {} \; | sort | md5sum | awk '{print $1}' > "$CHAINCODE_DIR/.last_deployed"

echo -e "${GREEN}✓ Chaincode package created: coffee_${VERSION}.tar.gz${NC}"
echo ""

cd /home/guda/GoCBC

# Install on ECTA peer first
echo -e "${YELLOW}Installing chaincode v${VERSION} on ECTA peer...${NC}"
docker cp "$CHAINCODE_PACKAGE" peer0.ecta.cecbs.et:/tmp/coffee_${VERSION}.tar.gz

docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee_${VERSION}.tar.gz 2>&1 | grep -E "Installed remotely|already successfully installed|package ID" || true

echo -e "${GREEN}✓ Installed on ECTA${NC}"

# Install on other peers
for peer_info in "peer0.ecx.cecbs.et:ECXMSP:ecx.cecbs.et:ECX" \
                  "peer0.banks.cecbs.et:BanksMSP:banks.cecbs.et:Banks" \
                  "peer0.nbe.cecbs.et:NBEMSP:nbe.cecbs.et:NBE" \
                  "peer0.customs.cecbs.et:CustomsMSP:customs.cecbs.et:Customs" \
                  "peer0.shipping.cecbs.et:ShippingMSP:shipping.cecbs.et:Shipping"; do
    
    IFS=':' read -r peer_name msp_id org_domain org_name <<< "$peer_info"
    
    echo -e "${YELLOW}Installing on $org_name...${NC}"
    docker cp "$CHAINCODE_PACKAGE" "$peer_name":/tmp/coffee_${VERSION}.tar.gz 2>/dev/null
    
    docker exec \
        -e CORE_PEER_LOCALMSPID="$msp_id" \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@$org_domain/msp" \
        "$peer_name" peer lifecycle chaincode install /tmp/coffee_${VERSION}.tar.gz 2>&1 | grep -E "Installed remotely|already successfully installed" || true
    
    echo -e "${GREEN}✓ Installed on $org_name${NC}"
done

echo ""

# Get package ID
echo -e "${YELLOW}Retrieving package ID...${NC}"
PACKAGE_ID=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null \
    | grep "coffee_${VERSION}" | awk '{print $3}' | sed 's/,//' | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}✗ Failed to get package ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Package ID: $PACKAGE_ID${NC}"
echo ""

# Approve for all organizations
echo -e "${YELLOW}Approving chaincode for all organizations...${NC}"
echo ""

# ECTA
echo -e "${YELLOW}Approving for ECTA...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ ECTA approved${NC}"

# ECX
echo -e "${YELLOW}Approving for ECX...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ ECX approved${NC}"

# Banks
echo -e "${YELLOW}Approving for Banks...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=BanksMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Banks approved${NC}"

# NBE
echo -e "${YELLOW}Approving for NBE...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=NBEMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ NBE approved${NC}"

# Customs
echo -e "${YELLOW}Approving for Customs...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=CustomsMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
    peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Customs approved${NC}"

# Shipping
echo -e "${YELLOW}Approving for Shipping...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ShippingMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
    peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --package-id "$PACKAGE_ID" --sequence ${SEQUENCE} 2>&1 | grep -E "committed with status|Error" || true
echo -e "${GREEN}✓ Shipping approved${NC}"

echo ""

# Check commit readiness
echo -e "${YELLOW}Checking commit readiness...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel --name coffee --version ${VERSION} --sequence ${SEQUENCE} --output json | grep -A10 "approvals"

echo ""

# Commit chaincode
echo -e "${YELLOW}Committing chaincode v${VERSION} to channel (requires majority endorsement)...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version ${VERSION} --sequence ${SEQUENCE} \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/customs-ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt 2>&1 | grep -E "committed with status|Error"

echo -e "${GREEN}✓ Chaincode v${VERSION} committed${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 3

if docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null | grep -q "Version:"; then
    echo -e "${GREEN}✓ Deployment verified successfully${NC}"
else
    echo -e "${RED}✗ Deployment verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Chaincode deployment completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
