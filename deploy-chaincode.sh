#!/bin/bash
# Complete Chaincode Deployment Script for CECBS
# This script handles packaging, installation, approval, and commitment of chaincode updates
# Works with Chaincode-as-a-Service (CCAAS) architecture

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

CHAINCODE_NAME="coffee"
CHANNEL_NAME="coffeechannel"
CHAINCODE_VERSION=${1:-"1.15"}
SEQUENCE=${2:-"5"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Organization configurations
declare -A ORG_NAMES=(
  ["ecta"]="ECTA"
  ["banks"]="Banks"
  ["nbe"]="NBE"
  ["customs"]="Customs"
  ["ecx"]="ECX"
  ["shipping"]="Shipping"
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}=========================================="
  echo -e "$1"
  echo -e "==========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

print_header "CECBS Chaincode Deployment - v${CHAINCODE_VERSION}"

echo -e "Configuration:"
echo -e "  Chaincode: ${GREEN}${CHAINCODE_NAME}${NC}"
echo -e "  Version: ${GREEN}${CHAINCODE_VERSION}${NC}"
echo -e "  Sequence: ${GREEN}${SEQUENCE}${NC}"
echo -e "  Channel: ${GREEN}${CHANNEL_NAME}${NC}"
echo ""

# ============================================================================
# STEP 1: Update metadata.json
# ============================================================================

print_header "Step 1: Update Chaincode Metadata"

METADATA_FILE="chaincodes/${CHAINCODE_NAME}/metadata.json"
if [ -f "$METADATA_FILE" ]; then
  cat > "$METADATA_FILE" <<EOF
{
  "type": "ccaas",
  "label": "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
}
EOF
  print_success "Updated metadata.json with version ${CHAINCODE_VERSION}"
else
  print_error "Metadata file not found: $METADATA_FILE"
  exit 1
fi

# ============================================================================
# STEP 2: Create CCAAS Package
# ============================================================================

print_header "Step 2: Create Chaincode Package"

cd chaincodes/${CHAINCODE_NAME}

# Clean up old packaging artifacts
rm -rf pkg
mkdir -p pkg

# Create code.tar.gz with connection.json at root
print_info "Creating code.tar.gz..."
tar -czf pkg/code.tar.gz connection.json

# Create final package with code.tar.gz and metadata.json
print_info "Creating chaincode package..."
cd pkg
tar -czf ../${CHAINCODE_NAME}_${CHAINCODE_VERSION}.tgz code.tar.gz -C .. metadata.json
cd ../..

PACKAGE_FILE="chaincodes/${CHAINCODE_NAME}/${CHAINCODE_NAME}_${CHAINCODE_VERSION}.tgz"
PACKAGE_SIZE=$(ls -lh "$PACKAGE_FILE" | awk '{print $5}')
print_success "Package created: $PACKAGE_FILE ($PACKAGE_SIZE)"

# ============================================================================
# STEP 3: Install Chaincode on All Peers
# ============================================================================

print_header "Step 3: Install Chaincode on All Peers"

PACKAGE_ID=""

for org in ecta banks nbe customs ecx shipping; do
  print_info "Installing on ${ORG_NAMES[$org]}..."
  
  # Copy package to peer container
  docker cp "$PACKAGE_FILE" peer0.${org}.cecbs.et:/tmp/chaincode.tgz
  
  # Install chaincode
  OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
    peer0.${org}.cecbs.et \
    peer lifecycle chaincode install /tmp/chaincode.tgz 2>&1)
  
  if echo "$OUTPUT" | grep -q "Installed remotely"; then
    # Extract package ID from first installation
    if [ -z "$PACKAGE_ID" ]; then
      PACKAGE_ID=$(echo "$OUTPUT" | grep -oP "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:[a-f0-9]{64}")
    fi
    print_success "Installed on ${ORG_NAMES[$org]}"
  else
    print_error "Failed to install on ${ORG_NAMES[$org]}"
    echo "$OUTPUT"
    exit 1
  fi
done

echo ""
print_success "Package ID: ${GREEN}${PACKAGE_ID}${NC}"

# ============================================================================
# STEP 4: Copy Orderer CA Certificate to Peers
# ============================================================================

print_header "Step 4: Prepare TLS Certificates"

ORDERER_CA="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/ca.crt"

for org in ecta banks nbe customs ecx shipping; do
  docker cp "$ORDERER_CA" peer0.${org}.cecbs.et:/tmp/orderer-ca.crt
done

print_success "Orderer CA certificates copied to all peers"

# ============================================================================
# STEP 5: Approve Chaincode for All Organizations
# ============================================================================

print_header "Step 5: Approve Chaincode Definition"

for org in ecta banks nbe customs ecx shipping; do
  print_info "Approving for ${ORG_NAMES[$org]}..."
  
  OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
    peer0.${org}.cecbs.et \
    peer lifecycle chaincode approveformyorg \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} \
      --version ${CHAINCODE_VERSION} \
      --package-id ${PACKAGE_ID} \
      --sequence ${SEQUENCE} \
      --tls \
      --cafile /tmp/orderer-ca.crt \
      --orderer orderer.cecbs.et:7050 2>&1)
  
  if echo "$OUTPUT" | grep -q "committed with status (VALID)"; then
    print_success "Approved for ${ORG_NAMES[$org]}"
  else
    print_error "Failed to approve for ${ORG_NAMES[$org]}"
    echo "$OUTPUT"
    exit 1
  fi
done

# ============================================================================
# STEP 6: Check Commit Readiness
# ============================================================================

print_header "Step 6: Check Commit Readiness"

READINESS=$(MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${SEQUENCE} \
    --output json)

echo "$READINESS" | grep -o '"[^"]*": true' | while read line; do
  ORG=$(echo "$line" | cut -d'"' -f2)
  print_success "$ORG approved"
done

# ============================================================================
# STEP 7: Copy Peer TLS Certificates to ECTA Peer
# ============================================================================

print_header "Step 7: Prepare Peer TLS Certificates"

# Copy TLS certs from all peers to ECTA peer for commit command
for org in banks nbe customs ecx shipping; do
  TLS_CERT="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
  docker cp "$TLS_CERT" peer0.ecta.cecbs.et:/tmp/${org}-tls.crt
done

print_success "All peer TLS certificates copied"

# ============================================================================
# STEP 8: Commit Chaincode Definition
# ============================================================================

print_header "Step 8: Commit Chaincode Definition"

print_info "Committing chaincode to channel..."

OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode commit \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /tmp/banks-tls.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /tmp/nbe-tls.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /tmp/customs-tls.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /tmp/ecx-tls.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /tmp/shipping-tls.crt 2>&1)

if echo "$OUTPUT" | grep -q "committed with status (VALID)"; then
  print_success "Chaincode committed successfully"
else
  print_error "Failed to commit chaincode"
  echo "$OUTPUT"
  exit 1
fi

# ============================================================================
# STEP 9: Verify Deployment
# ============================================================================

print_header "Step 9: Verify Deployment"

COMMITTED=$(MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME})

echo "$COMMITTED"

# ============================================================================
# STEP 10: Update and Restart Chaincode Container
# ============================================================================

print_header "Step 10: Update Chaincode Container"

# Update docker-compose.yml with actual package ID
print_info "Updating docker-compose-fabric.yml..."

# Create backup
cp docker-compose-fabric.yml docker-compose-fabric.yml.bak

# Update the CORE_CHAINCODE_ID_NAME with actual package ID
sed -i "s/CORE_CHAINCODE_ID_NAME=coffee_.*:.*/CORE_CHAINCODE_ID_NAME=${PACKAGE_ID}/" docker-compose-fabric.yml

print_success "Updated docker-compose-fabric.yml with package ID"

# Restart chaincode container
print_info "Restarting chaincode container..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode

sleep 3

# Check if chaincode container is running
if docker ps | grep -q coffee-chaincode; then
  print_success "Chaincode container running"
  docker logs coffee-chaincode --tail 5
else
  print_error "Chaincode container failed to start"
  exit 1
fi

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================

print_header "Deployment Complete!"

echo -e "${GREEN}✓ Chaincode Deployment Summary:${NC}"
echo -e "  Name: ${CHAINCODE_NAME}"
echo -e "  Version: ${CHAINCODE_VERSION}"
echo -e "  Sequence: ${SEQUENCE}"
echo -e "  Package ID: ${PACKAGE_ID}"
echo -e "  Channel: ${CHANNEL_NAME}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test chaincode queries through API"
echo -e "  2. Verify data loads in portals"
echo -e "  3. Check chaincode logs: ${BLUE}docker logs coffee-chaincode${NC}"
echo -e "  4. Monitor API logs for successful queries"
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
