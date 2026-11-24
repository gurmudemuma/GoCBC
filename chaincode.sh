#!/bin/bash
# CECBS Chaincode Management Tool
# Complete toolkit for managing chaincode lifecycle operations
#
# Usage: ./chaincode.sh [COMMAND] [OPTIONS]
#
# Commands:
#   package <version>              - Create chaincode package
#   install <version>              - Install chaincode on all peers
#   approve <version> <sequence>   - Approve chaincode for all orgs
#   commit <version> <sequence>    - Commit chaincode to channel
#   upgrade <version> <sequence>   - Complete upgrade (package + install + approve + commit)
#   query                          - Query committed chaincode
#   list-installed <org>           - List installed chaincodes on org peer
#   check-ready <version> <seq>    - Check commit readiness
#   test                           - Test chaincode invocation
#   container-restart              - Restart chaincode container with latest package ID
#   container-logs                 - Show chaincode container logs
#   help                           - Show this help message

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

CHAINCODE_NAME="coffee"
CHANNEL_NAME="coffeechannel"
CHAINCODE_DIR="chaincodes/coffee"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Organizations
ORGS=(ecta banks nbe customs ecx shipping)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}=========================================="
  echo -e "$1"
  echo -e "==========================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${CYAN}→${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# ============================================================================
# COMMAND: package
# ============================================================================

cmd_package() {
  local VERSION=$1
  
  if [ -z "$VERSION" ]; then
    print_error "Version required. Usage: ./chaincode.sh package <version>"
    exit 1
  fi
  
  print_header "Packaging Chaincode v${VERSION}"
  
  # Update metadata.json
  print_info "Updating metadata.json..."
  cat > "${CHAINCODE_DIR}/metadata.json" <<EOF
{
  "type": "ccaas",
  "label": "${CHAINCODE_NAME}_${VERSION}"
}
EOF
  print_success "Metadata updated"
  
  # Create package
  print_info "Creating package..."
  cd "$CHAINCODE_DIR"
  rm -rf pkg
  mkdir -p pkg
  
  # Create code.tar.gz with connection.json at root
  tar -czf pkg/code.tar.gz connection.json
  
  # Create final package
  cd pkg
  tar -czf "../${CHAINCODE_NAME}_${VERSION}.tgz" code.tar.gz -C .. metadata.json
  cd ../../..
  
  PACKAGE_FILE="${CHAINCODE_DIR}/${CHAINCODE_NAME}_${VERSION}.tgz"
  PACKAGE_SIZE=$(ls -lh "$PACKAGE_FILE" | awk '{print $5}')
  
  print_success "Package created: $PACKAGE_FILE ($PACKAGE_SIZE)"
}

# ============================================================================
# COMMAND: install
# ============================================================================

cmd_install() {
  local VERSION=$1
  
  if [ -z "$VERSION" ]; then
    print_error "Version required. Usage: ./chaincode.sh install <version>"
    exit 1
  fi
  
  PACKAGE_FILE="${CHAINCODE_DIR}/${CHAINCODE_NAME}_${VERSION}.tgz"
  
  if [ ! -f "$PACKAGE_FILE" ]; then
    print_error "Package not found: $PACKAGE_FILE"
    print_info "Run: ./chaincode.sh package ${VERSION}"
    exit 1
  fi
  
  print_header "Installing Chaincode v${VERSION}"
  
  PACKAGE_ID=""
  
  for org in "${ORGS[@]}"; do
    print_info "Installing on ${org}..."
    
    # Copy package to peer
    docker cp "$PACKAGE_FILE" peer0.${org}.cecbs.et:/tmp/chaincode.tgz 2>/dev/null
    
    # Install
    OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
      peer0.${org}.cecbs.et \
      peer lifecycle chaincode install /tmp/chaincode.tgz 2>&1)
    
    if echo "$OUTPUT" | grep -q "Installed remotely"; then
      if [ -z "$PACKAGE_ID" ]; then
        PACKAGE_ID=$(echo "$OUTPUT" | grep -oP "${CHAINCODE_NAME}_${VERSION}:[a-f0-9]{64}")
      fi
      print_success "Installed on ${org}"
    elif echo "$OUTPUT" | grep -q "already installed"; then
      if [ -z "$PACKAGE_ID" ]; then
        PACKAGE_ID=$(echo "$OUTPUT" | grep -oP "${CHAINCODE_NAME}_${VERSION}:[a-f0-9]{64}")
      fi
      print_warning "Already installed on ${org}"
    else
      print_error "Failed on ${org}"
      echo "$OUTPUT"
      exit 1
    fi
  done
  
  echo ""
  print_success "Package ID: ${GREEN}${PACKAGE_ID}${NC}"
  echo ""
  echo "Save this package ID for approve/commit commands"
}

# ============================================================================
# COMMAND: approve
# ============================================================================

cmd_approve() {
  local VERSION=$1
  local SEQUENCE=$2
  local PACKAGE_ID=$3
  
  if [ -z "$VERSION" ] || [ -z "$SEQUENCE" ]; then
    print_error "Usage: ./chaincode.sh approve <version> <sequence> [package_id]"
    exit 1
  fi
  
  # If package ID not provided, try to get it from queryinstalled
  if [ -z "$PACKAGE_ID" ]; then
    print_info "Retrieving package ID..."
    PACKAGE_ID=$(MSYS_NO_PATHCONV=1 docker exec \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
      peer0.ecta.cecbs.et \
      peer lifecycle chaincode queryinstalled 2>&1 | grep "${CHAINCODE_NAME}_${VERSION}" | grep -oP "${CHAINCODE_NAME}_${VERSION}:[a-f0-9]{64}" | head -1)
    
    if [ -z "$PACKAGE_ID" ]; then
      print_error "Could not find package ID. Please provide it as third argument."
      exit 1
    fi
    print_info "Found package ID: $PACKAGE_ID"
  fi
  
  print_header "Approving Chaincode v${VERSION} (Sequence: ${SEQUENCE})"
  
  # Copy orderer CA to all peers
  print_info "Preparing TLS certificates..."
  ORDERER_CA="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/ca.crt"
  for org in "${ORGS[@]}"; do
    docker cp "$ORDERER_CA" peer0.${org}.cecbs.et:/tmp/orderer-ca.crt 2>/dev/null
  done
  print_success "Certificates ready"
  
  # Approve for each org
  for org in "${ORGS[@]}"; do
    print_info "Approving for ${org}..."
    
    OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
      peer0.${org}.cecbs.et \
      peer lifecycle chaincode approveformyorg \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${VERSION} \
        --package-id ${PACKAGE_ID} \
        --sequence ${SEQUENCE} \
        --tls \
        --cafile /tmp/orderer-ca.crt \
        --orderer orderer.cecbs.et:7050 2>&1)
    
    if echo "$OUTPUT" | grep -q "committed with status (VALID)"; then
      print_success "Approved for ${org}"
    else
      print_error "Failed for ${org}"
      echo "$OUTPUT"
      exit 1
    fi
  done
  
  print_success "All organizations approved"
}

# ============================================================================
# COMMAND: commit
# ============================================================================

cmd_commit() {
  local VERSION=$1
  local SEQUENCE=$2
  
  if [ -z "$VERSION" ] || [ -z "$SEQUENCE" ]; then
    print_error "Usage: ./chaincode.sh commit <version> <sequence>"
    exit 1
  fi
  
  print_header "Committing Chaincode v${VERSION} (Sequence: ${SEQUENCE})"
  
  # Copy peer TLS certs to banks peer
  print_info "Preparing peer TLS certificates..."
  for org in ecta banks nbe customs ecx shipping; do
    TLS_CERT="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    docker cp "$TLS_CERT" peer0.banks.cecbs.et:/tmp/${org}-tls.crt 2>/dev/null
  done
  print_success "Certificates ready"
  
  # Commit from banks peer
  print_info "Committing to channel..."
  
  OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et \
    peer lifecycle chaincode commit \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} \
      --version ${VERSION} \
      --sequence ${SEQUENCE} \
      --tls \
      --cafile /tmp/orderer-ca.crt \
      --orderer orderer.cecbs.et:7050 \
      --peerAddresses peer0.ecta.cecbs.et:7051 \
      --tlsRootCertFiles /tmp/ecta-tls.crt \
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
    print_error "Commit failed"
    echo "$OUTPUT"
    exit 1
  fi
}

# ============================================================================
# COMMAND: upgrade
# ============================================================================

cmd_upgrade() {
  local VERSION=$1
  local SEQUENCE=$2
  
  if [ -z "$VERSION" ] || [ -z "$SEQUENCE" ]; then
    print_error "Usage: ./chaincode.sh upgrade <version> <sequence>"
    exit 1
  fi
  
  print_header "Complete Chaincode Upgrade v${VERSION}"
  
  # Step 1: Package
  echo ""
  echo -e "${CYAN}[1/6] Packaging...${NC}"
  cmd_package "$VERSION"
  
  # Step 2: Install
  echo ""
  echo -e "${CYAN}[2/6] Installing...${NC}"
  cmd_install "$VERSION"
  
  # Get package ID
  PACKAGE_ID=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | grep "${CHAINCODE_NAME}_${VERSION}" | grep -oP "${CHAINCODE_NAME}_${VERSION}:[a-f0-9]{64}" | head -1)
  
  # Step 3: Approve
  echo ""
  echo -e "${CYAN}[3/6] Approving...${NC}"
  cmd_approve "$VERSION" "$SEQUENCE" "$PACKAGE_ID"
  
  # Step 4: Commit
  echo ""
  echo -e "${CYAN}[4/6] Committing...${NC}"
  cmd_commit "$VERSION" "$SEQUENCE"
  
  # Step 5: Update docker-compose
  echo ""
  echo -e "${CYAN}[5/6] Updating docker-compose...${NC}"
  cp "$DOCKER_COMPOSE_FILE" "${DOCKER_COMPOSE_FILE}.bak"
  sed -i "s/CORE_CHAINCODE_ID_NAME=${CHAINCODE_NAME}_.*:.*/CORE_CHAINCODE_ID_NAME=${PACKAGE_ID}/" "$DOCKER_COMPOSE_FILE"
  print_success "docker-compose.yml updated"
  
  # Step 6: Restart container
  echo ""
  echo -e "${CYAN}[6/6] Restarting container...${NC}"
  docker stop coffee-chaincode 2>/dev/null || true
  docker rm coffee-chaincode 2>/dev/null || true
  docker compose -f "$DOCKER_COMPOSE_FILE" up -d coffee-chaincode >/dev/null 2>&1
  sleep 3
  
  if docker ps | grep -q coffee-chaincode; then
    print_success "Container running"
  else
    print_error "Container failed to start"
    exit 1
  fi
  
  # Summary
  print_header "Upgrade Complete!"
  echo -e "  Version: ${GREEN}${VERSION}${NC}"
  echo -e "  Sequence: ${GREEN}${SEQUENCE}${NC}"
  echo -e "  Package ID: ${GREEN}${PACKAGE_ID}${NC}"
  echo ""
  print_info "Verify with: ./chaincode.sh query"
}

# ============================================================================
# COMMAND: query
# ============================================================================

cmd_query() {
  print_header "Querying Committed Chaincode"
  
  OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode querycommitted \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} 2>&1)
  
  echo "$OUTPUT"
  
  # Extract and highlight key info
  if echo "$OUTPUT" | grep -q "Version:"; then
    VERSION=$(echo "$OUTPUT" | grep -oP "Version: \K[^,]+")
    SEQUENCE=$(echo "$OUTPUT" | grep -oP "Sequence: \K[^,]+")
    echo ""
    print_success "Current: v${VERSION} (Sequence: ${SEQUENCE})"
  fi
}

# ============================================================================
# COMMAND: list-installed
# ============================================================================

cmd_list_installed() {
  local ORG=${1:-"ecta"}
  
  print_header "Installed Chaincodes on ${ORG}"
  
  MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
    peer0.${ORG}.cecbs.et \
    peer lifecycle chaincode queryinstalled
}

# ============================================================================
# COMMAND: check-ready
# ============================================================================

cmd_check_ready() {
  local VERSION=$1
  local SEQUENCE=$2
  
  if [ -z "$VERSION" ] || [ -z "$SEQUENCE" ]; then
    print_error "Usage: ./chaincode.sh check-ready <version> <sequence>"
    exit 1
  fi
  
  print_header "Checking Commit Readiness"
  
  READINESS=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} \
      --version ${VERSION} \
      --sequence ${SEQUENCE} \
      --output json)
  
  echo "$READINESS" | jq '.'
  
  echo ""
  echo "$READINESS" | jq -r '.approvals | to_entries[] | "\(.key): \(.value)"' | while read line; do
    ORG=$(echo "$line" | cut -d':' -f1)
    STATUS=$(echo "$line" | cut -d':' -f2 | tr -d ' ')
    if [ "$STATUS" = "true" ]; then
      print_success "$ORG approved"
    else
      print_error "$ORG NOT approved"
    fi
  done
}

# ============================================================================
# COMMAND: test
# ============================================================================

cmd_test() {
  print_header "Testing Chaincode Invocation"
  
  print_info "Testing QueryAllExporters..."
  
  OUTPUT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
      -C ${CHANNEL_NAME} \
      -n ${CHAINCODE_NAME} \
      -c '{"Args":["QueryAllExporters"]}' 2>&1)
  
  if echo "$OUTPUT" | grep -q "Error:"; then
    print_error "Query failed"
    echo "$OUTPUT"
  else
    print_success "Query successful"
    echo "$OUTPUT" | jq '.' 2>/dev/null || echo "$OUTPUT"
  fi
}

# ============================================================================
# COMMAND: container-restart
# ============================================================================

cmd_container_restart() {
  print_header "Restarting Chaincode Container"
  
  # Get latest package ID
  PACKAGE_ID=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | grep "${CHAINCODE_NAME}_" | grep -oP "${CHAINCODE_NAME}_[^:]+:[a-f0-9]{64}" | head -1)
  
  if [ -z "$PACKAGE_ID" ]; then
    print_error "No installed chaincode found"
    exit 1
  fi
  
  print_info "Package ID: $PACKAGE_ID"
  
  # Update docker-compose
  cp "$DOCKER_COMPOSE_FILE" "${DOCKER_COMPOSE_FILE}.bak"
  sed -i "s/CORE_CHAINCODE_ID_NAME=${CHAINCODE_NAME}_.*:.*/CORE_CHAINCODE_ID_NAME=${PACKAGE_ID}/" "$DOCKER_COMPOSE_FILE"
  print_success "docker-compose.yml updated"
  
  # Restart
  docker stop coffee-chaincode 2>/dev/null || true
  docker rm coffee-chaincode 2>/dev/null || true
  docker compose -f "$DOCKER_COMPOSE_FILE" up -d coffee-chaincode
  
  sleep 3
  
  if docker ps | grep -q coffee-chaincode; then
    print_success "Container restarted successfully"
    docker logs coffee-chaincode --tail 10
  else
    print_error "Container failed to start"
  fi
}

# ============================================================================
# COMMAND: container-logs
# ============================================================================

cmd_container_logs() {
  local LINES=${1:-50}
  
  print_header "Chaincode Container Logs (last ${LINES} lines)"
  
  docker logs coffee-chaincode --tail "$LINES"
}

# ============================================================================
# COMMAND: help
# ============================================================================

cmd_help() {
  cat <<EOF

${GREEN}CECBS Chaincode Management Tool${NC}

${CYAN}Usage:${NC}
  ./chaincode.sh [COMMAND] [OPTIONS]

${CYAN}Commands:${NC}

  ${YELLOW}Deployment Commands:${NC}
    package <version>                  Create chaincode package
    install <version>                  Install chaincode on all peers
    approve <version> <seq> [pkg_id]   Approve chaincode for all organizations
    commit <version> <sequence>        Commit chaincode to channel
    upgrade <version> <sequence>       Complete upgrade (all steps combined)

  ${YELLOW}Query Commands:${NC}
    query                              Query committed chaincode details
    list-installed [org]               List installed chaincodes (default: ecta)
    check-ready <version> <sequence>   Check approval status for commit

  ${YELLOW}Testing Commands:${NC}
    test                               Test chaincode query invocation

  ${YELLOW}Container Commands:${NC}
    container-restart                  Update and restart chaincode container
    container-logs [lines]             Show container logs (default: 50 lines)

  ${YELLOW}Utility Commands:${NC}
    help                               Show this help message

${CYAN}Examples:${NC}

  ${GREEN}# Complete upgrade in one command${NC}
  ./chaincode.sh upgrade 1.16 6

  ${GREEN}# Step-by-step deployment${NC}
  ./chaincode.sh package 1.16
  ./chaincode.sh install 1.16
  ./chaincode.sh approve 1.16 6
  ./chaincode.sh commit 1.16 6
  ./chaincode.sh container-restart

  ${GREEN}# Query and check status${NC}
  ./chaincode.sh query
  ./chaincode.sh list-installed ecta
  ./chaincode.sh check-ready 1.16 6

  ${GREEN}# Test chaincode${NC}
  ./chaincode.sh test
  ./chaincode.sh container-logs 100

${CYAN}Notes:${NC}
  - Version format: Major.Minor (e.g., 1.15, 1.16)
  - Sequence must increment from previous deployment
  - Package ID is auto-detected when possible
  - Container restart required after commit for CCAAS architecture

EOF
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

COMMAND=$1
shift || true

case "$COMMAND" in
  package)
    cmd_package "$@"
    ;;
  install)
    cmd_install "$@"
    ;;
  approve)
    cmd_approve "$@"
    ;;
  commit)
    cmd_commit "$@"
    ;;
  upgrade)
    cmd_upgrade "$@"
    ;;
  query)
    cmd_query "$@"
    ;;
  list-installed)
    cmd_list_installed "$@"
    ;;
  check-ready)
    cmd_check_ready "$@"
    ;;
  test)
    cmd_test "$@"
    ;;
  container-restart)
    cmd_container_restart "$@"
    ;;
  container-logs)
    cmd_container_logs "$@"
    ;;
  help|--help|-h|"")
    cmd_help
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    echo ""
    cmd_help
    exit 1
    ;;
esac
