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

# Repo root is derived from this script's location, not hardcoded: the script
# runs from the user's checkout wherever it lives.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAINCODE_DIR="$REPO_ROOT/chaincodes/coffee"
COMPOSE_FILE="$REPO_ROOT/docker-compose-fabric.yml"

# Compose command (v2 plugin preferred, v1 binary as fallback)
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}✗ Neither 'docker compose' nor 'docker-compose' is available${NC}"
    exit 1
fi

# Check if already committed and determine version/sequence
echo -e "${YELLOW}Checking if chaincode is already deployed...${NC}"
CURRENT_VERSION=""
CURRENT_SEQUENCE=""
# The current code version is the label in chaincodes/coffee/metadata.json
# (coffee_2.3). A fresh channel deploys that version at sequence 1; an
# upgrade bumps the minor version and sequence from what is committed.
METADATA_VERSION=$(grep -oP '"label":\s*"coffee_\K[0-9.]+' "$CHAINCODE_DIR/metadata.json" 2>/dev/null || echo "2.3")
VERSION="$METADATA_VERSION"
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
CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee_${VERSION}.tar.gz"

# Always rebuild package for deployment
echo -e "${YELLOW}Building chaincode package v${VERSION}...${NC}"
cd "$CHAINCODE_DIR"

# Remove old package
rm -f "coffee_${VERSION}.tar.gz"

# Package the chaincode - CCAAS (Chaincode-as-a-Service), NOT golang.
# The live chaincode runs as the coffee-chaincode Docker image at
# coffee-chaincode:9999. A CCAAS package contains only metadata.json
# (type "ccaas", label coffee_<version>) and connection.json, and is
# packaged with --lang external. The version/sequence here are derived
# above from the live channel: with v2.2 / seq 21 committed, the next
# run packages v2.3 / seq 22.

# Build the CCAAS package directory: label must match this run's version.
rm -rf pkg-temp code-temp
mkdir -p pkg-temp/code
cat > pkg-temp/metadata.json <<EOF
{
  "type": "ccaas",
  "label": "coffee_${VERSION}"
}
EOF
cp connection.json pkg-temp/code/connection.json

# For CCAAS, manually create the tar.gz package
# Structure: metadata.json at root, connection.json inside code/
cd pkg-temp
tar czf "../coffee_${VERSION}.tar.gz" metadata.json code/
cd ..

# Clean up the temporary package directory
rm -rf pkg-temp code-temp

if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    echo -e "${RED}✗ Failed to create chaincode package${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode package created: coffee_${VERSION}.tar.gz${NC}"
echo ""

cd "$REPO_ROOT"

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

# ── Update the chaincode server for the new package ID ──────────────────────
# CCAAS peers route invocations to the chaincode server registered under the
# package ID of the committed definition. The server (coffee-chaincode
# container) still registers under the OLD package ID, so after an upgrade
# every invoke/query would fail with no server for the new ID. Before
# approving/committing, point the compose file at the new package ID and
# image tag, rebuild the server image (it carries the new Go code), and
# recreate the container so it registers under the new ID. If the ID is
# unchanged (same version re-installed) this is a no-op rewrite.
echo -e "${YELLOW}Updating chaincode server to package ID ${PACKAGE_ID}...${NC}"
sed -i "s|^\(\s*\)image: coffee-chaincode:.*|\1image: coffee-chaincode:${VERSION}|" "$COMPOSE_FILE"
sed -i "s|^\(\s*- \)CORE_CHAINCODE_ID_NAME=.*|\1CORE_CHAINCODE_ID_NAME=${PACKAGE_ID}|" "$COMPOSE_FILE"
sed -i "s|\"label\": \"coffee_[0-9.]*\"|\"label\": \"coffee_${VERSION}\"|" "$CHAINCODE_DIR/metadata.json"
echo -e "${GREEN}✓ Compose file updated: coffee-chaincode:${VERSION}, ID ${PACKAGE_ID}${NC}"

cd "$REPO_ROOT"
if ! $COMPOSE -f docker-compose-fabric.yml build coffee-chaincode; then
    echo -e "${RED}✗ Failed to rebuild the coffee-chaincode image${NC}"
    echo -e "${RED}  The v${VERSION} definition must not be committed while the server still runs old code — stopping here.${NC}"
    exit 1
fi
if ! $COMPOSE -f docker-compose-fabric.yml up -d coffee-chaincode; then
    echo -e "${RED}✗ Failed to recreate the coffee-chaincode container${NC}"
    exit 1
fi

# Wait for the rebuilt server to come up and answer on 9999 (inside the
# cecbs-network; docker exec from the host cannot reach it directly, so
# check the container state and give it a few seconds to register).
for i in $(seq 1 15); do
    if docker ps --filter "name=^coffee-chaincode$" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
        break
    fi
    sleep 2
done
if ! docker ps --filter "name=^coffee-chaincode$" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo -e "${RED}✗ coffee-chaincode container did not come up after the rebuild${NC}"
    echo -e "${RED}  Check: docker logs coffee-chaincode${NC}"
    exit 1
fi
sleep 5
echo -e "${GREEN}✓ Chaincode server rebuilt and running with the new package ID${NC}"
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
COMMIT_OUTPUT=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt 2>&1)
echo "$COMMIT_OUTPUT" | grep -E "committed with status|Error" || true
if ! echo "$COMMIT_OUTPUT" | grep -q "committed with status"; then
    echo -e "${RED}✗ Chaincode commit did not succeed — see output above${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode v${VERSION} committed${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 3

# The check must match THIS version and sequence: merely finding "a"
# committed version would pass even if the commit failed and the old
# definition (e.g. v2.2 seq 21) were still in place.
COMMITTED_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "")
if echo "$COMMITTED_INFO" | grep -q "Version: ${VERSION}" && echo "$COMMITTED_INFO" | grep -q "Sequence: ${SEQUENCE}"; then
    echo -e "${GREEN}✓ Deployment verified successfully (coffee v${VERSION}, sequence ${SEQUENCE})${NC}"
    # Record the source hash ONLY now that the deploy verified: writing it
    # before a failed deploy would make the next run think the code was
    # already deployed and skip the upgrade.
    find "$CHAINCODE_DIR" -name "*.go" -type f -exec md5sum {} \; | sort | md5sum | awk '{print $1}' > "$CHAINCODE_DIR/.last_deployed"
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
