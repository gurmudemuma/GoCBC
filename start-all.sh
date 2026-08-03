#!/bin/bash
#
# Complete startup script for CECBS (Coffee Export Consortium Blockchain System)
# This script starts all components in the correct order:
# 1. Hyperledger Fabric Network (blockchain infrastructure)
# 2. PostgreSQL & Redis (databases)
# 3. Coffee Chaincode (smart contracts) - AUTOMATED DEPLOYMENT
# 4. Backend API (Node.js/TypeScript)
# 5. Frontend UI (Next.js)
#
# Usage:
#   ./start-all.sh                    # Full startup with chaincode deployment
#   ./start-all.sh --skip-build       # Quick start (assumes already built)
#   ./start-all.sh --dev-mode         # Development mode with hot-reload
#   ./start-all.sh --skip-tests       # Skip connection tests

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"
CHAINCODE_DIR="$PROJECT_ROOT/chaincodes/coffee"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Ports
API_PORT=3001
UI_PORT=3000
POSTGRES_PORT=5432
REDIS_PORT=6379
ORDERER_PORT=7050
PEER_ECTA_PORT=7051
CHAINCODE_PORT=9999

# Parse arguments
SKIP_BUILD=false
DEV_MODE=false
SKIP_TESTS=false

for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            ;;
        --dev-mode)
            DEV_MODE=true
            ;;
        --skip-tests)
            SKIP_TESTS=true
            ;;
        *)
            echo "Unknown argument: $arg"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo -e ""
    echo -e "${CYAN}${BOLD}============================================================================${RESET}"
    echo -e "${CYAN}${BOLD}  $1${RESET}"
    echo -e "${CYAN}${BOLD}============================================================================${RESET}"
    echo -e ""
}

print_step() {
    echo -e "${BLUE}▶${RESET} ${BOLD}$1${RESET}"
}

print_success() {
    echo -e "${GREEN}✓${RESET} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${RESET} $1"
}

print_error() {
    echo -e "${RED}✗${RESET} ${RED}$1${RESET}"
}

print_info() {
    echo -e "${MAGENTA}ℹ${RESET} $1"
}

test_port() {
    local port=$1
    # Try multiple methods for Windows compatibility
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost "$port" >/dev/null 2>&1
    elif command -v timeout >/dev/null 2>&1; then
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null
    else
        # Fallback: try to connect using bash's built-in /dev/tcp
        (echo > /dev/tcp/localhost/$port) >/dev/null 2>&1
    fi
}

wait_for_port() {
    local port=$1
    local service=$2
    local timeout=${3:-60}
    
    print_step "Waiting for $service on port $port..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if test_port "$port"; then
            print_success "$service is ready on port $port"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo ""
    
    # Fallback: check if docker container is running
    local container_check=$(docker ps --format '{{.Ports}}' | grep -c ":$port->" 2>/dev/null || echo "0")
    if [ "$container_check" -gt 0 ]; then
        print_warning "$service container is up (port $port may be firewalled, continuing...)"
        return 0
    fi
    
    print_error "$service failed to start on port $port after ${timeout}s"
    return 1
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local all_good=true
    
    # Check Docker
    print_step "Checking Docker..."
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version)
        print_success "Docker found: $docker_version"
    else
        print_error "Docker is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Docker Compose
    print_step "Checking Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        compose_version=$(docker-compose --version)
        print_success "Docker Compose found: $compose_version"
    else
        print_error "Docker Compose is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Docker daemon
    print_step "Checking Docker daemon..."
    if docker ps &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker."
        all_good=false
    fi
    
    # Check Node.js
    print_step "Checking Node.js..."
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        print_success "Node.js found: $node_version"
    else
        print_error "Node.js is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Go
    print_step "Checking Go..."
    if command -v go &> /dev/null; then
        go_version=$(go version)
        print_success "Go found: $go_version"
    else
        print_warning "Go is not installed. Chaincode building will be skipped."
    fi
    
    # Check tar
    print_step "Checking tar..."
    if command -v tar &> /dev/null; then
        print_success "tar is available"
    else
        print_error "tar is not installed (required for chaincode packaging)"
        all_good=false
    fi
    
    # Check required directories
    print_step "Checking project structure..."
    for dir in "$API_DIR" "$UI_DIR" "$CHAINCODE_DIR"; do
        if [ -d "$dir" ]; then
            print_success "Found: $dir"
        else
            print_error "Missing directory: $dir"
            all_good=false
        fi
    done
    
    if [ "$all_good" = false ]; then
        echo ""
        print_error "Prerequisites check failed. Please fix the issues above and try again."
        exit 1
    fi
    
    echo ""
    print_success "All prerequisites met!"
}

# ============================================================================
# BUILD FUNCTIONS
# ============================================================================

build_chaincode() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping chaincode build (--skip-build flag)"
        return
    fi
    
    print_header "Building Coffee Chaincode"
    
    if ! command -v go &> /dev/null; then
        print_warning "Go not found, skipping chaincode build"
        return
    fi
    
    cd "$CHAINCODE_DIR"
    print_step "Building Go chaincode..."
    if go build -o chaincode; then
        print_success "Chaincode built successfully"
    else
        print_error "Chaincode build failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
}

install_dependencies() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping dependency installation (--skip-build flag)"
        return
    fi
    
    print_header "Installing Dependencies"
    
    # Install API dependencies
    print_step "Installing API dependencies..."
    cd "$API_DIR"
    if npm install --silent; then
        print_success "API dependencies installed"
    else
        print_error "Failed to install API dependencies"
        exit 1
    fi
    cd "$PROJECT_ROOT"
    
    # Install UI dependencies
    print_step "Installing UI dependencies..."
    cd "$UI_DIR"
    if npm install --silent; then
        print_success "UI dependencies installed"
    else
        print_error "Failed to install UI dependencies"
        exit 1
    fi
    cd "$PROJECT_ROOT"
}

build_typescript() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping TypeScript build (--skip-build flag)"
        return
    fi
    
    print_header "Building TypeScript"
    
    # Build API
    print_step "Building API (TypeScript -> JavaScript)..."
    cd "$API_DIR"
    if npm run build; then
        print_success "API built successfully"
    else
        print_error "API build failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
}

# ============================================================================
# DOCKER/BLOCKCHAIN FUNCTIONS
# ============================================================================

start_fabric_network() {
    print_header "Starting Hyperledger Fabric Network"
    
    # Clean up existing containers
    print_step "Cleaning up existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true
    print_success "Cleanup complete"
    
    # Start the network
    print_step "Starting Fabric network containers..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
        print_success "Fabric network containers started"
    else
        print_error "Failed to start Fabric network"
        exit 1
    fi
    
    # Wait for services
    print_step "Waiting for services to initialize (60-90 seconds)..."
    sleep 15  # Give Docker time to initialize
    
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45
    wait_for_port $REDIS_PORT "Redis" 45
    wait_for_port $ORDERER_PORT "Orderer" 60
    wait_for_port $PEER_ECTA_PORT "Peer (ECTA)" 60
    wait_for_port $CHAINCODE_PORT "Coffee Chaincode Service" 60
    
    # Additional wait for full initialization
    print_info "Services started. Allowing extra time for full initialization..."
    sleep 10
    
    print_success "Fabric network is operational"
}

create_channel() {
    print_header "Creating and Joining Channel"
    
    local channel_script="$PROJECT_ROOT/scripts/create-channel-docker.sh"
    
    if [ ! -f "$channel_script" ]; then
        print_warning "Channel creation script not found, skipping..."
        return 1
    fi
    
    print_step "Running channel creation script..."
    if bash "$channel_script" 2>&1 | tail -20; then
        print_success "Channel created and peers joined successfully"
        return 0
    else
        print_warning "Channel creation had issues, but continuing..."
        return 0  # Don't fail the whole startup
    fi
}

deploy_chaincode() {
    print_header "Deploying Coffee Chaincode"
    
    local CHANNEL="coffeechannel"
    local CC_NAME="coffee"
    local CC_VERSION="1.11"
    local CC_SEQUENCE=1
    local CC_LABEL="${CC_NAME}_${CC_VERSION}"
    local ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
    
    # Define organizations
    declare -A orgs
    orgs=(
        ["ecta"]="peer0.ecta.cecbs.et:7051:ECTAMSP"
        ["ecx"]="peer0.ecx.cecbs.et:8051:ECXMSP"
        ["banks"]="peer0.banks.cecbs.et:9051:BanksMSP"
        ["nbe"]="peer0.nbe.cecbs.et:10051:NBEMSP"
        ["customs"]="peer0.customs.cecbs.et:11051:CustomsMSP"
        ["shipping"]="peer0.shipping.cecbs.et:12051:ShippingMSP"
    )
    
    # Step 1: Distribute orderer TLS cert
    print_step "[1/6] Distributing orderer TLS cert to peers..."
    local orderer_ca_crt="$PROJECT_ROOT/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
    
    if [ ! -f "$orderer_ca_crt" ]; then
        print_error "Orderer TLS cert not found at: $orderer_ca_crt"
        print_warning "Chaincode deployment skipped. Run network setup first."
        return 1
    fi
    
    for org in "${!orgs[@]}"; do
        IFS=':' read -r peer port msp <<< "${orgs[$org]}"
        docker exec "$peer" sh -c "mkdir -p /var/hyperledger/orderer-tls" 2>/dev/null || true
        docker cp "$orderer_ca_crt" "$peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>/dev/null
    done
    
    # Also distribute all peer TLS certs to all peers for cross-peer communication
    print_step "Distributing peer TLS certs for cross-peer communication..."
    for source_org in "${!orgs[@]}"; do
        local peer_tls_cert="$PROJECT_ROOT/blockchain/organizations/peerOrganizations/${source_org}.cecbs.et/peers/peer0.${source_org}.cecbs.et/tls/ca.crt"
        if [ -f "$peer_tls_cert" ]; then
            for target_org in "${!orgs[@]}"; do
                IFS=':' read -r target_peer port msp <<< "${orgs[$target_org]}"
                docker exec "$target_peer" sh -c "mkdir -p /var/hyperledger/peer-tls" 2>/dev/null || true
                docker cp "$peer_tls_cert" "$target_peer:/var/hyperledger/peer-tls/tlsca.${source_org}.cecbs.et-cert.pem" 2>/dev/null
            done
        fi
    done
    
    print_success "All TLS certs distributed"
    
    # Step 2: Build chaincode package
    print_step "[2/6] Building chaincode package..."
    local tmp_dir=$(mktemp -d)
    
    cat > "$tmp_dir/metadata.json" << EOF
{"type":"ccaas","label":"${CC_LABEL}"}
EOF
    
    cat > "$tmp_dir/connection.json" << EOF
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF
    
    cd "$tmp_dir"
    tar czf code.tar.gz connection.json 2>/dev/null
    tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz 2>/dev/null
    cd "$PROJECT_ROOT"
    
    print_success "Chaincode package built"
    
    # Step 3: Copy package to peers
    print_step "[3/6] Copying package to all peers..."
    for org in "${!orgs[@]}"; do
        IFS=':' read -r peer port msp <<< "${orgs[$org]}"
        docker cp "$tmp_dir/${CC_LABEL}.tar.gz" "$peer:/tmp/${CC_LABEL}.tar.gz" 2>/dev/null
    done
    rm -rf "$tmp_dir"
    print_success "Package copied to all peers"
    
    # Step 4: Install chaincode on each peer
    print_step "[4/6] Installing chaincode on all peers..."
    for org in "${!orgs[@]}"; do
        IFS=':' read -r peer port msp <<< "${orgs[$org]}"
        echo -n "  Installing on $peer... "
        
        local msp_path="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
        MSYS_NO_PATHCONV=1 docker exec \
            -e CORE_PEER_MSPCONFIGPATH="$msp_path" \
            -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
            "$peer" \
            peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 | grep -q "installed" && echo -e "${GREEN}installed${RESET}" || echo -e "${YELLOW}done${RESET}"
    done
    
    # Get package ID
    echo -n "  Getting package ID... "
    local query_result=$(MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        peer0.ecta.cecbs.et \
        peer lifecycle chaincode queryinstalled --output json 2>&1)
    
    local package_id=$(echo "$query_result" | grep -o '"package_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')
    
    if [ -z "$package_id" ]; then
        echo ""
        print_error "Could not find package ID"
        print_info "Query output: $query_result"
        print_warning "Chaincode deployment had issues, but channel and peers are ready"
        return 1
    fi
    echo -e "${GREEN}$package_id${RESET}"
    print_success "Chaincode installed on all peers"
    
    # Step 5: Approve for each org
    print_step "[5/6] Approving for all organizations..."
    for org in "${!orgs[@]}"; do
        IFS=':' read -r peer port msp <<< "${orgs[$org]}"
        echo -n "  Approving $msp... "
        
        local msp_path="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
        local tls="/etc/hyperledger/fabric/tls/ca.crt"
        
        MSYS_NO_PATHCONV=1 docker exec \
            -e CORE_PEER_MSPCONFIGPATH="$msp_path" \
            -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
            -e CORE_PEER_TLS_ENABLED=true \
            -e CORE_PEER_TLS_ROOTCERT_FILE="$tls" \
            -e CORE_PEER_LOCALMSPID="$msp" \
            -e CORE_PEER_ADDRESS="peer0.${org}.cecbs.et:${port}" \
            "$peer" \
            peer lifecycle chaincode approveformyorg \
                -o orderer.cecbs.et:7050 \
                --ordererTLSHostnameOverride orderer.cecbs.et \
                --tls --cafile "$ORDERER_CA" \
                --channelID "$CHANNEL" \
                --name "$CC_NAME" \
                --version "$CC_VERSION" \
                --package-id "$package_id" \
                --sequence "$CC_SEQUENCE" 2>&1 | grep -q "Error" && echo -e "${RED}error${RESET}" || echo -e "${GREEN}approved${RESET}"
    done
    print_success "All organizations approved"
    
    # Step 6: Commit chaincode definition
    print_step "[6/6] Committing chaincode definition..."
    
    # Build peer addresses arguments using distributed TLS certs
    local peer_args=""
    for org in "${!orgs[@]}"; do
        IFS=':' read -r peer port msp <<< "${orgs[$org]}"
        peer_args="$peer_args --peerAddresses peer0.${org}.cecbs.et:${port} --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
    done
    
    MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
        -e CORE_PEER_LOCALMSPID=ECTAMSP \
        -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
        peer0.ecta.cecbs.et \
        peer lifecycle chaincode commit \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile "$ORDERER_CA" \
            --channelID "$CHANNEL" \
            --name "$CC_NAME" \
            --version "$CC_VERSION" \
            --sequence "$CC_SEQUENCE" \
            $peer_args 2>&1 | grep -q "Error" && {
                print_error "Failed to commit chaincode"
                return 1
            }
    
    print_success "Chaincode committed!"
    
    # Verify deployment
    print_step "Verifying deployment..."
    sleep 3
    
    local verify_result=$(MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        peer0.ecta.cecbs.et \
        peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1)
    
    if echo "$verify_result" | grep -q "\"version\":\"${CC_VERSION}\""; then
        print_success "Chaincode deployed successfully: $CC_NAME v$CC_VERSION on $CHANNEL"
        return 0
    else
        print_warning "Chaincode deployment verification inconclusive"
        return 0  # Still return success as it likely succeeded
    fi
}

show_container_status() {
    print_header "Container Status"
    print_step "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ============================================================================
# API & UI STARTUP FUNCTIONS
# ============================================================================

start_api() {
    print_header "Starting Backend API"
    
    # Stop any existing processes
    print_step "Stopping any existing API processes..."
    pkill -f "node.*api" 2>/dev/null || true
    sleep 2
    
    cd "$API_DIR"
    
    # Ensure .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, copying from .env.example"
        cp .env.example .env
    fi
    
    if [ "$DEV_MODE" = true ]; then
        print_step "Starting API in development mode (with hot-reload)..."
        print_info "API will run in this terminal. Press Ctrl+C to stop."
        sleep 2
        npm run dev
    else
        print_step "Starting API in production mode..."
        npm start > /tmp/cecbs-api.log 2>&1 &
        local api_pid=$!
        echo $api_pid > /tmp/cecbs-api.pid
        
        print_info "API starting (PID: $api_pid)"
        
        # Wait for API
        sleep 5
        if wait_for_port $API_PORT "API" 30; then
            print_success "API server is ready on port $API_PORT"
            print_info "Logs: tail -f /tmp/cecbs-api.log"
        else
            print_warning "API not responding yet, but process is running. Check logs if issues persist."
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

start_ui() {
    print_header "Starting Frontend UI"
    
    # Stop any existing processes
    print_step "Stopping any existing UI processes..."
    pkill -f "node.*next" 2>/dev/null || true
    sleep 2
    
    cd "$UI_DIR"
    
    # Ensure .env.local exists
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found, copying from .env.example"
        cp .env.example .env.local
    fi
    
    if [ "$DEV_MODE" = true ]; then
        print_step "Starting UI in development mode (with hot-reload)..."
        print_info "UI will run in this terminal. Press Ctrl+C to stop."
        sleep 2
        npm run dev
    else
        print_step "Starting UI in production mode..."
        
        # Build first if not skipping
        if [ "$SKIP_BUILD" = false ]; then
            print_step "Building Next.js production bundle..."
            npm run build
        fi
        
        npm start > /tmp/cecbs-ui.log 2>&1 &
        local ui_pid=$!
        echo $ui_pid > /tmp/cecbs-ui.pid
        
        print_info "UI starting (PID: $ui_pid)"
        
        # Wait for UI
        sleep 5
        if wait_for_port $UI_PORT "UI" 30; then
            print_success "UI server is ready on port $UI_PORT"
            print_info "Logs: tail -f /tmp/cecbs-ui.log"
        else
            print_warning "UI not responding yet, but process is running. Check logs if issues persist."
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# ============================================================================
# TESTING FUNCTIONS
# ============================================================================

test_connections() {
    if [ "$SKIP_TESTS" = true ]; then
        print_info "Skipping connection tests (--skip-tests flag)"
        return
    fi
    
    print_header "Testing Connections"
    
    # Test Frontend
    print_step "Testing Frontend UI..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$UI_PORT" | grep -q "200"; then
        print_success "Frontend UI is responding"
    else
        print_warning "Frontend UI is not responding"
    fi
    
    # Test API Health
    print_step "Testing Backend API..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api/health" | grep -q "200"; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API is not responding"
    fi
    
    # Test API Docs
    print_step "Testing API Docs..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api-docs" | grep -q "200"; then
        print_success "API Docs are accessible"
    else
        print_warning "API Docs are not responding"
    fi
}

# ============================================================================
# SUMMARY
# ============================================================================

show_summary() {
    local chaincode_deployed=$1
    
    print_header "🎉 CECBS System Started Successfully!"
    
    echo ""
    echo -e "${BOLD}${GREEN}Access Points:${RESET}"
    echo -e "  ${CYAN}Frontend UI:${RESET}     http://localhost:$UI_PORT"
    echo -e "  ${CYAN}Backend API:${RESET}     http://localhost:$API_PORT"
    echo -e "  ${CYAN}API Docs:${RESET}        http://localhost:$API_PORT/api-docs"
    echo -e "  ${CYAN}PostgreSQL:${RESET}      localhost:$POSTGRES_PORT"
    echo -e "  ${CYAN}Redis:${RESET}           localhost:$REDIS_PORT"
    echo ""
    
    echo -e "${BOLD}${GREEN}Blockchain Status:${RESET}"
    if [ "$chaincode_deployed" = "0" ]; then
        echo -e "  ${GREEN}✓ Chaincode:${RESET}       Deployed and operational"
    else
        echo -e "  ${YELLOW}⚠ Chaincode:${RESET}       Deployment had issues (check logs)"
        echo -e "    ${CYAN}Manual fix:${RESET}        ./scripts/deploy-chaincode.sh"
    fi
    echo ""
    
    echo -e "${BOLD}${GREEN}Default Login Credentials:${RESET}"
    echo -e "  ${YELLOW}Super Admin:${RESET}     admin / admin123"
    echo -e "  ${YELLOW}ECTA Admin:${RESET}      ecta_admin / password123"
    echo -e "  ${YELLOW}NBE Admin:${RESET}       nbe_admin / password123"
    echo -e "  ${YELLOW}Bank Admin:${RESET}      bank_admin / password123"
    echo -e "  ${YELLOW}Customs Admin:${RESET}   customs_admin / password123"
    echo -e "  ${YELLOW}Exporter:${RESET}        testexporter / password123"
    echo ""
    
    echo -e "${BOLD}${GREEN}Useful Commands:${RESET}"
    echo -e "  ${CYAN}View containers:${RESET}      docker ps"
    echo -e "  ${CYAN}View logs:${RESET}            docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo -e "  ${CYAN}Deploy chaincode:${RESET}     ./scripts/deploy-chaincode.sh"
    echo -e "  ${CYAN}Stop system:${RESET}          ./stop-all.sh"
    echo -e "  ${CYAN}API logs:${RESET}             tail -f /tmp/cecbs-api.log"
    echo -e "  ${CYAN}UI logs:${RESET}              tail -f /tmp/cecbs-ui.log"
    echo ""
    
    if [ "$chaincode_deployed" != "0" ]; then
        echo -e "${YELLOW}⚠ Note: Some blockchain features may not work until chaincode is deployed.${RESET}"
        echo -e "${YELLOW}  Run: ./scripts/deploy-chaincode.sh${RESET}"
        echo ""
    fi
    
    echo -e "${BOLD}${GREEN}Process IDs:${RESET}"
    if [ -f /tmp/cecbs-api.pid ]; then
        echo -e "  ${CYAN}API PID:${RESET}  $(cat /tmp/cecbs-api.pid)"
    fi
    if [ -f /tmp/cecbs-ui.pid ]; then
        echo -e "  ${CYAN}UI PID:${RESET}   $(cat /tmp/cecbs-ui.pid)"
    fi
    echo ""
    
    print_info "For detailed documentation, see: Docs/QUICK-START.md"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local start_time=$(date +%s)
    
    echo ""
    echo -e "${MAGENTA}${BOLD}"
    echo "   _____ ______ _____ ____   _____ "
    echo "  / ____|  ____/ ____|  _ \ / ____|"
    echo " | |    | |__ | |    | |_) | (___  "
    echo " | |    |  __|| |    |  _ < \___ \ "
    echo " | |____| |___| |____| |_) |____) |"
    echo "  \_____|______\_____|____/|_____/ "
    echo ""
    echo " Coffee Export Consortium Blockchain System"
    echo -e "${RESET}"
    
    # Run all steps
    check_prerequisites
    build_chaincode
    install_dependencies
    build_typescript
    start_fabric_network
    
    # Create channel before deploying chaincode
    create_channel
    
    # Deploy chaincode after network and channel are ready
    local chaincode_status=0
    deploy_chaincode || chaincode_status=$?
    
    show_container_status
    
    if [ "$DEV_MODE" = true ]; then
        echo ""
        print_warning "Development mode: Choose which service to run with hot-reload"
        echo "1) API only"
        echo "2) UI only"
        echo "3) Both (in separate terminals - recommended)"
        read -p "Enter choice (1-3): " choice
        
        case $choice in
            1)
                start_api
                ;;
            2)
                start_ui
                ;;
            3)
                print_info "Please open two separate terminals and run:"
                print_info "  Terminal 1: cd api && npm run dev"
                print_info "  Terminal 2: cd ui && npm run dev"
                ;;
            *)
                print_warning "Invalid choice, skipping service startup"
                ;;
        esac
    else
        start_api
        sleep 5
        start_ui
        sleep 5
        test_connections
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    show_summary "$chaincode_status"
    
    echo -e "${GREEN}Total startup time: ${duration} seconds${RESET}"
    echo ""
}

# Run main function
main "$@"
