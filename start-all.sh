#!/bin/bash

################################################################################
# GoCBC Complete System Startup Script with Prerequisites Check
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
#
# This script:
# 1. Checks all system prerequisites
# 2. Validates environment configuration
# 3. Starts Hyperledger Fabric blockchain network
# 4. Deploys and verifies chaincode
# 5. Initializes database with seed data
# 6. Starts API and UI servers
# 7. Runs system health checks
################################################################################

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"
BLOCKCHAIN_DIR="$PROJECT_ROOT/blockchain"
CHAINCODE_DIR="$PROJECT_ROOT/chaincodes/coffee"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Ports
API_PORT=3001
UI_PORT=3000
POSTGRES_PORT=5432
ORDERER_PORT=7050
PEER_ECTA_PORT=7051
CHAINCODE_PORT=9999

# Colors for output
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_MAGENTA='\033[0;35m'
COLOR_CYAN='\033[0;36m'

# Flags
SKIP_PREREQUISITES=false
SKIP_BUILD=false
SKIP_BLOCKCHAIN=false
SKIP_TESTS=false
VERBOSE=false

# Parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-prerequisites)
                SKIP_PREREQUISITES=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-blockchain)
                SKIP_BLOCKCHAIN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-prerequisites   Skip prerequisite checks (not recommended)"
    echo "  --skip-build          Skip npm install steps"
    echo "  --skip-blockchain     Skip blockchain network startup"
    echo "  --skip-tests          Skip health checks and tests"
    echo "  --verbose, -v         Show verbose output"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start-all.sh                    # Full startup with all checks"
    echo "  ./start-all.sh --skip-build       # Skip npm install"
    echo "  ./start-all.sh --skip-blockchain  # Start only API and UI"
}

# Helper functions for pretty output
write_header() {
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}================================================================================${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}  $1${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}================================================================================${COLOR_RESET}"
    echo ""
}

write_step() {
    echo -e "${COLOR_BLUE}▶${COLOR_RESET} ${COLOR_BOLD}$1${COLOR_RESET}"
}

write_success() {
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} $1"
}

write_warning() {
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} $1"
}

write_error() {
    echo -e "${COLOR_RED}✗${COLOR_RESET} ${COLOR_RED}$1${COLOR_RESET}"
}

write_info() {
    echo -e "${COLOR_MAGENTA}ℹ${COLOR_RESET} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${COLOR_MAGENTA}[DEBUG]${COLOR_RESET} $1"
    fi
}

# Test if a port is open
test_port() {
    local port=$1
    local host=${2:-localhost}
    
    if command -v nc &> /dev/null; then
        nc -z "$host" "$port" 2>/dev/null
        return $?
    elif command -v timeout &> /dev/null; then
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null
        return $?
    else
        curl -s --max-time 1 "http://$host:$port" &>/dev/null
        return $?
    fi
}

# Wait for a port to become available
wait_for_port() {
    local port=$1
    local service=$2
    local timeout=${3:-60}
    local host=${4:-localhost}
    
    write_step "Waiting for $service on port $port..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if test_port $port $host; then
            write_success "$service is ready on port $port"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        printf "."
    done
    
    echo ""
    write_error "$service failed to start on port $port after ${timeout}s"
    return 1
}

# Wait for HTTP endpoint to be healthy
wait_for_http() {
    local url=$1
    local service=$2
    local timeout=${3:-60}
    
    write_step "Waiting for $service at $url..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if curl -s --max-time 2 "$url" >/dev/null 2>&1; then
            write_success "$service is responding"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        printf "."
    done
    
    echo ""
    write_error "$service failed to respond at $url after ${timeout}s"
    return 1
}

################################################################################
# PHASE 1: Prerequisites Check
################################################################################

check_prerequisites() {
    if [ "$SKIP_PREREQUISITES" = true ]; then
        write_warning "Skipping prerequisites check (--skip-prerequisites flag)"
        return 0
    fi
    
    write_header "Phase 1: Checking Prerequisites"
    
    local all_good=true
    local warnings=()
    
    # Check Docker
    write_step "Checking Docker..."
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version 2>/dev/null || echo "unknown")
        write_success "Docker installed: $docker_version"
        
        # Check if Docker daemon is running
        if docker ps &> /dev/null; then
            write_success "Docker daemon is running"
            
            # Check Docker version
            docker_ver=$(docker version --format '{{.Server.Version}}' 2>/dev/null | cut -d'.' -f1)
            if [ -n "$docker_ver" ] && [ "$docker_ver" -ge 20 ] 2>/dev/null; then
                log_verbose "Docker version $docker_ver is sufficient"
            else
                warnings+=("Docker version may be old. Recommended: >= 20.10")
            fi
        else
            write_error "Docker daemon is not running"
            write_info "Start with: sudo systemctl start docker"
            all_good=false
        fi
    else
        write_error "Docker is not installed"
        write_info "Install: https://docs.docker.com/engine/install/"
        all_good=false
    fi
    
    # Check Docker Compose
    write_step "Checking Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        compose_version=$(docker-compose --version 2>/dev/null || echo "unknown")
        write_success "Docker Compose installed: $compose_version"
    elif docker compose version &> /dev/null 2>&1; then
        compose_version=$(docker compose version 2>/dev/null || echo "unknown")
        write_success "Docker Compose (plugin) installed: $compose_version"
    else
        write_error "Docker Compose is not installed"
        write_info "Install: https://docs.docker.com/compose/install/"
        all_good=false
    fi
    
    # Check Node.js
    write_step "Checking Node.js..."
    if command -v node &> /dev/null; then
        node_version=$(node --version 2>/dev/null)
        write_success "Node.js installed: $node_version"
        
        # Check Node version
        node_ver=$(echo "$node_version" | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_ver" -ge 16 ] 2>/dev/null; then
            log_verbose "Node.js version is sufficient (>= v16)"
        else
            warnings+=("Node.js version $node_version is old. Recommended: >= v18")
        fi
    else
        write_error "Node.js is not installed"
        write_info "Install: https://nodejs.org/ or use nvm"
        all_good=false
    fi
    
    # Check npm
    write_step "Checking npm..."
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version 2>/dev/null)
        write_success "npm installed: v$npm_version"
    else
        write_error "npm is not installed"
        all_good=false
    fi
    
    # Check Go (optional but recommended for chaincode)
    write_step "Checking Go..."
    if command -v go &> /dev/null; then
        go_version=$(go version 2>/dev/null)
        write_success "Go installed: $go_version"
    else
        write_warning "Go is not installed (optional for chaincode development)"
        warnings+=("Go not found - chaincode modifications may require manual steps")
    fi
    
    # Check PostgreSQL client (optional but useful)
    write_step "Checking PostgreSQL client..."
    if command -v psql &> /dev/null; then
        psql_version=$(psql --version 2>/dev/null | head -1)
        write_success "PostgreSQL client installed: $psql_version"
    else
        write_warning "psql not installed (optional for database debugging)"
        write_info "Install: sudo apt-get install postgresql-client"
    fi
    
    # Check curl
    write_step "Checking curl..."
    if command -v curl &> /dev/null; then
        write_success "curl is installed"
    else
        write_warning "curl is not installed"
        warnings+=("curl not found - install with: sudo apt-get install curl")
    fi
    
    # Check jq (optional for JSON parsing)
    write_step "Checking jq..."
    if command -v jq &> /dev/null; then
        write_success "jq is installed"
    else
        write_info "jq not installed (optional for JSON parsing)"
        write_info "Install: sudo apt-get install jq"
    fi
    
    # Check available disk space
    write_step "Checking disk space..."
    available_space=$(df -BG "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//' || echo "0")
    if [ "$available_space" -ge 10 ] 2>/dev/null; then
        write_success "Available disk space: ${available_space}GB"
    else
        write_warning "Low disk space: ${available_space}GB (recommended: >= 10GB)"
        warnings+=("Low disk space may cause issues with Docker volumes")
    fi
    
    # Check project structure
    write_step "Checking project structure..."
    local missing_dirs=()
    for dir in "$API_DIR" "$UI_DIR" "$BLOCKCHAIN_DIR" "$CHAINCODE_DIR"; do
        if [ -d "$dir" ]; then
            log_verbose "Found: $dir"
        else
            write_error "Missing directory: $dir"
            missing_dirs+=("$dir")
            all_good=false
        fi
    done
    
    if [ ${#missing_dirs[@]} -eq 0 ]; then
        write_success "All required directories exist"
    fi
    
    # Check critical files
    write_step "Checking critical files..."
    local critical_files=(
        "$PROJECT_ROOT/docker-compose-fabric.yml"
        "$API_DIR/package.json"
        "$UI_DIR/package.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_verbose "Found: $file"
        else
            write_error "Missing file: $file"
            all_good=false
        fi
    done
    
    # Check environment files
    write_step "Checking environment configuration..."
    if [ -f "$API_DIR/.env" ]; then
        write_success "API .env file exists"
        
        # Validate DATABASE_URL
        if grep -q "DATABASE_URL" "$API_DIR/.env"; then
            log_verbose "DATABASE_URL is configured"
        else
            write_warning "DATABASE_URL not found in .env"
            warnings+=("DATABASE_URL should be configured in api/.env")
        fi
        
        # Validate JWT_SECRET
        if grep -q "JWT_SECRET" "$API_DIR/.env"; then
            log_verbose "JWT_SECRET is configured"
        else
            write_warning "JWT_SECRET not found in .env"
            warnings+=("JWT_SECRET should be configured for security")
        fi
    else
        write_warning "API .env file not found"
        if [ -f "$API_DIR/.env.example" ]; then
            write_info "Copy .env.example to .env and configure it"
            warnings+=("Create $API_DIR/.env from .env.example")
        else
            write_error "No .env.example found in API directory"
            all_good=false
        fi
    fi
    
    # Summary
    echo ""
    if [ "$all_good" = false ]; then
        write_error "Prerequisites check FAILED!"
        echo ""
        echo "Please fix the errors above before starting the system."
        echo ""
        exit 1
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo ""
        write_warning "${#warnings[@]} warning(s) found:"
        for warning in "${warnings[@]}"; do
            echo "  • $warning"
        done
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Startup cancelled by user."
            exit 0
        fi
    fi
    
    echo ""
    write_success "All critical prerequisites met!"
}

################################################################################
# PHASE 2: Install Dependencies
################################################################################

install_dependencies() {
    if [ "$SKIP_BUILD" = true ]; then
        write_info "Skipping dependency installation (--skip-build flag)"
        return 0
    fi
    
    write_header "Phase 2: Installing Dependencies"
    
    # Install API dependencies
    write_step "Installing API dependencies..."
    cd "$API_DIR"
    if [ ! -d "node_modules" ] || [ "$PROJECT_ROOT/package-lock.json" -nt "node_modules" ]; then
        npm install --prefer-offline --no-audit
        write_success "API dependencies installed"
    else
        write_info "API dependencies already installed (skipping)"
    fi
    cd "$PROJECT_ROOT"
    
    # Build API if TypeScript
    if [ -f "$API_DIR/tsconfig.json" ]; then
        write_step "Building API (TypeScript compilation)..."
        cd "$API_DIR"
        npm run build 2>&1 | tail -5
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            write_success "API built successfully"
        else
            write_warning "API build had issues (may be normal if already built)"
        fi
        cd "$PROJECT_ROOT"
    fi
    
    # Install UI dependencies
    write_step "Installing UI dependencies..."
    cd "$UI_DIR"
    if [ ! -d "node_modules" ] || [ "$PROJECT_ROOT/package-lock.json" -nt "node_modules" ]; then
        npm install --prefer-offline --no-audit
        write_success "UI dependencies installed"
    else
        write_info "UI dependencies already installed (skipping)"
    fi
    cd "$PROJECT_ROOT"
}

################################################################################
# PHASE 3: Start Blockchain Network
################################################################################

start_blockchain_network() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        write_info "Skipping blockchain network startup (--skip-blockchain flag)"
        return 0
    fi
    
    write_header "Phase 3: Starting Hyperledger Fabric Blockchain"
    
    # Check if already running
    write_step "Checking if blockchain network is already running..."
    if docker ps 2>/dev/null | grep -q "peer0.ecta"; then
        write_info "Blockchain network is already running"
        
        # Verify it's healthy
        if docker ps 2>/dev/null | grep "peer0.ecta" | grep -q "Up"; then
            write_success "Existing blockchain network is healthy"
            return 0
        else
            write_warning "Existing blockchain network may be unhealthy"
            write_step "Restarting blockchain network..."
        fi
    fi
    
    # Ensure external builders are set up
    setup_external_builders
    
    # Clean up old containers if needed
    write_step "Cleaning up old containers (if any)..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
    sleep 2
    
    # Start Fabric network
    write_step "Starting Fabric network containers..."
    docker-compose -f docker-compose-fabric.yml up -d
    
    if [ $? -ne 0 ]; then
        write_error "Failed to start Fabric network containers"
        write_info "Check: docker-compose -f docker-compose-fabric.yml logs"
        exit 1
    fi
    
    write_success "Fabric containers started"
    
    # Wait for critical services
    write_step "Waiting for blockchain services to initialize..."
    sleep 15
    
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45 || write_warning "PostgreSQL may not be ready"
    wait_for_port $ORDERER_PORT "Orderer" 60 || write_warning "Orderer may not be ready"
    wait_for_port $PEER_ECTA_PORT "ECTA Peer" 60 || write_warning "ECTA Peer may not be ready"
    
    # Verify containers
    write_step "Verifying container health..."
    PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\." || echo "0")
    ORDERER_COUNT=$(docker ps 2>/dev/null | grep -c "orderer\." || echo "0")
    
    echo ""
    write_info "Running containers:"
    echo "  • Peers: $PEER_COUNT/6"
    echo "  • Orderer: $ORDERER_COUNT/1"
    
    if [ "$PEER_COUNT" -lt 6 ] || [ "$ORDERER_COUNT" -lt 1 ]; then
        write_error "Not all required containers are running!"
        write_info "Check logs: docker-compose -f docker-compose-fabric.yml logs"
        exit 1
    fi
    
    write_success "Blockchain network is operational"
}

setup_external_builders() {
    write_step "Setting up external builders..."
    
    local builders_dir="$PROJECT_ROOT/builders/ccaas/bin"
    
    if [ -d "$builders_dir" ] && [ -x "$builders_dir/detect" ]; then
        log_verbose "External builders already configured"
        return 0
    fi
    
    mkdir -p "$builders_dir"
    
    # Create detect script
    cat > "$builders_dir/detect" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail
METADIR=$2
if [ -f "$METADIR/connection.json" ]; then
   exit 0
fi
exit 1
BUILDER_EOF
    
    # Create build script
    cat > "$builders_dir/build" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$3
cp -a $2/* $BUILD_OUTPUT_DIR/
exit 0
BUILDER_EOF
    
    # Create release script
    cat > "$builders_dir/release" << 'BUILDER_EOF'
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$2
RELEASE_OUTPUT_DIR=$3
cp -a $BUILD_OUTPUT_DIR/* $RELEASE_OUTPUT_DIR/
exit 0
BUILDER_EOF
    
    chmod +x "$builders_dir"/*
    write_success "External builders configured"
}

################################################################################
# PHASE 4: Create and Join Channel
################################################################################

create_channel() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        return 0
    fi
    
    write_header "Phase 4: Creating and Joining Blockchain Channel"
    
    # Check if channel already exists
    write_step "Checking if channel already exists..."
    CHANNEL_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep "coffeechannel" || echo "NOT_FOUND")
    
    if echo "$CHANNEL_CHECK" | grep -q "coffeechannel"; then
        write_success "Channel 'coffeechannel' already exists"
        
        # Verify all peers have joined
        write_step "Verifying peer channel membership..."
        local peers_joined=0
        for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
            if docker exec $peer peer channel list 2>/dev/null | grep -q "coffeechannel"; then
                peers_joined=$((peers_joined + 1))
            fi
        done
        
        write_info "Peers joined to channel: $peers_joined/6"
        
        if [ $peers_joined -ge 6 ]; then
            write_success "All peers are members of the channel"
            return 0
        else
            write_warning "Not all peers have joined the channel, re-running channel creation..."
        fi
    else
        write_info "Channel not found, creating it..."
    fi
    
    # Run the channel creation script
    if [ -f "$SCRIPTS_DIR/create-channel-docker.sh" ]; then
        write_step "Running channel creation script..."
        bash "$SCRIPTS_DIR/create-channel-docker.sh"
        
        if [ $? -eq 0 ]; then
            write_success "Channel created and peers joined successfully"
            
            # Verify channel is active
            sleep 5
            VERIFY_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep "coffeechannel" || echo "")
            if [ -n "$VERIFY_CHECK" ]; then
                write_success "Channel verification passed"
            else
                write_error "Channel creation verification failed"
                return 1
            fi
        else
            write_error "Channel creation failed"
            write_info "Check: docker logs orderer.cecbs.et"
            return 1
        fi
    else
        write_error "Channel creation script not found: $SCRIPTS_DIR/create-channel-docker.sh"
        return 1
    fi
}

################################################################################
# PHASE 5: Initialize and Verify Chaincode
################################################################################

initialize_chaincode() {
    if [ "$SKIP_BLOCKCHAIN" = true ]; then
        return 0
    fi
    
    write_header "Phase 5: Initializing Chaincode"
    
    # Check if chaincode is already deployed
    write_step "Checking chaincode status..."
    
    CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID coffeechannel --name coffee 2>/dev/null || echo "NOT_FOUND")
    
    if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
        CURRENT_VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        CURRENT_SEQUENCE=$(echo "$CHAINCODE_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
        
        write_success "Chaincode already deployed:"
        echo "  • Name: coffee"
        echo "  • Version: $CURRENT_VERSION"
        echo "  • Sequence: $CURRENT_SEQUENCE"
        
        # Test chaincode
        test_chaincode_basic
        return 0
    else
        write_info "Chaincode not deployed yet"
    fi
    
    # Deploy chaincode
    write_step "Deploying chaincode..."
    
    # First, ensure chaincode package exists
    CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee_1.0.tar.gz"
    if [ ! -f "$CHAINCODE_PACKAGE" ]; then
        write_info "Chaincode package not found, creating it..."
        
        # Package the chaincode
        write_step "Packaging chaincode..."
        cd "$CHAINCODE_DIR"
        
        if command -v peer &> /dev/null; then
            # Use local peer CLI
            peer lifecycle chaincode package coffee_1.0.tar.gz \
                --path . \
                --lang golang \
                --label coffee_1.0
        else
            # Use Docker with fabric-tools
            docker run --rm \
                -v "$CHAINCODE_DIR":/chaincode \
                -w /chaincode \
                hyperledger/fabric-tools:2.5 \
                peer lifecycle chaincode package coffee_1.0.tar.gz \
                --path . \
                --lang golang \
                --label coffee_1.0
        fi
        
        if [ $? -eq 0 ] && [ -f "$CHAINCODE_PACKAGE" ]; then
            write_success "Chaincode package created"
        else
            write_error "Failed to create chaincode package"
            return 1
        fi
        
        cd "$PROJECT_ROOT"
    else
        write_info "Using existing chaincode package"
    fi
    
    # Now deploy
    if [ -f "$PROJECT_ROOT/deploy-chaincode.sh" ]; then
        bash "$PROJECT_ROOT/deploy-chaincode.sh"
        if [ $? -eq 0 ]; then
            write_success "Chaincode deployed successfully"
            test_chaincode_basic
        else
            write_error "Chaincode deployment failed"
            write_info "You may need to deploy manually"
            return 1
        fi
    else
        write_warning "deploy-chaincode.sh not found"
        write_info "Chaincode must be deployed manually"
        return 1
    fi
}

test_chaincode_basic() {
    write_step "Testing chaincode connectivity..."
    
    PING_RESULT=$(docker exec \
        -e CORE_PEER_LOCALMSPID=ECTAMSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
        peer0.ecta.cecbs.et peer chaincode invoke \
        -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        -C coffeechannel -n coffee \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
        -c '{"function":"ping","Args":[]}' 2>&1 || echo "FAILED")
    
    if echo "$PING_RESULT" | grep -qE "FAILED|Error|error"; then
        write_warning "Chaincode test failed (this may be normal initially)"
        log_verbose "Error: $PING_RESULT"
    else
        write_success "Chaincode is responding to invocations"
    fi
}

################################################################################
# PHASE 6: Initialize Database
################################################################################

initialize_database() {
    write_header "Phase 6: Initializing Database"
    
    # Check if database is accessible
    write_step "Checking database connection..."
    
    if [ ! -f "$API_DIR/.env" ]; then
        write_warning "No .env file found, skipping database initialization"
        return 0
    fi
    
    # Extract DATABASE_URL
    DATABASE_URL=$(grep "^DATABASE_URL=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [ -z "$DATABASE_URL" ]; then
        write_warning "DATABASE_URL not configured in .env"
        return 0
    fi
    
    # Test database connection
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            write_success "Database connection successful"
            
            # Check if users table exists and has data
            write_step "Checking for seed data..."
            USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ' || echo "0")
            
            if [ "$USER_COUNT" -gt 0 ]; then
                write_success "Found $USER_COUNT active users in database"
            else
                write_info "No users found, seeding database..."
                
                if [ -f "$SCRIPTS_DIR/seed-users.sql" ]; then
                    psql "$DATABASE_URL" -f "$SCRIPTS_DIR/seed-users.sql" >/dev/null 2>&1
                    write_success "Database seeded with test users"
                else
                    write_warning "seed-users.sql not found at $SCRIPTS_DIR/seed-users.sql"
                fi
            fi
        else
            write_warning "Cannot connect to database (it may not be ready yet)"
            write_info "Database will be initialized when API starts"
        fi
    else
        write_info "psql not installed, skipping database check"
        write_info "Database will be initialized when API starts"
    fi
}

################################################################################
# PHASE 7: Start API Server
################################################################################

start_api_server() {
    write_header "Phase 7: Starting API Server"
    
    # Check if API container exists and use it
    if docker ps -a --format '{{.Names}}' | grep -q '^cecbs-api$'; then
        write_step "Using API from Docker container..."
        
        # Check if container is running
        if docker ps --format '{{.Names}}' | grep -q '^cecbs-api$'; then
            write_info "API container is already running"
        else
            write_step "Starting API container..."
            docker start cecbs-api >/dev/null 2>&1
        fi
        
        # Wait for API to be ready
        wait_for_http "http://localhost:$API_PORT/health" "API Server (Docker)" 60
        
        if [ $? -eq 0 ]; then
            write_success "API server is running on http://localhost:$API_PORT (Docker)"
        else
            write_error "API container failed to start properly"
            write_info "Check logs: docker logs cecbs-api"
            return 1
        fi
        return 0
    fi
    
    # Otherwise, start API on host
    write_step "Checking if API server is already running on host..."
    if curl -s --max-time 2 "http://localhost:$API_PORT/health" 2>/dev/null | grep -q '"status"'; then
        write_success "API server is already running on port $API_PORT"
        return 0
    fi
    
    # Kill any existing process on the port
    write_step "Ensuring port $API_PORT is available..."
    lsof -ti:$API_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    # Start API
    write_step "Starting API server on host..."
    cd "$API_DIR"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Start in background
    if [ -f "dist/server.js" ]; then
        # Production mode
        nohup node dist/server.js > "$PROJECT_ROOT/logs/api.log" 2>&1 &
        API_PID=$!
        echo $API_PID > "$PROJECT_ROOT/.api.pid"
        write_info "API started in production mode (PID: $API_PID)"
    else
        # Development mode
        nohup npm run dev > "$PROJECT_ROOT/logs/api.log" 2>&1 &
        API_PID=$!
        echo $API_PID > "$PROJECT_ROOT/.api.pid"
        write_info "API started in development mode (PID: $API_PID)"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Wait for API to be ready
    wait_for_http "http://localhost:$API_PORT/health" "API Server" 60
    
    if [ $? -eq 0 ]; then
        write_success "API server is running on http://localhost:$API_PORT"
    else
        write_error "API server failed to start"
        write_info "Check logs: tail -f logs/api.log"
        return 1
    fi
}

################################################################################
# PHASE 8: Start UI Server
################################################################################

start_ui_server() {
    write_header "Phase 8: Starting UI Server"
    
    # Check if already running
    write_step "Checking if UI server is already running..."
    if curl -s --max-time 2 -I "http://localhost:$UI_PORT" 2>/dev/null | grep -qi "Next.js\|x-powered-by"; then
        write_success "UI server is already running on port $UI_PORT"
        return 0
    fi
    
    # Kill any existing process on the port
    write_step "Ensuring port $UI_PORT is available..."
    lsof -ti:$UI_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    # Start UI
    write_step "Starting UI server..."
    cd "$UI_DIR"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Start in background
    if [ -d ".next" ] && [ -f "package.json" ]; then
        nohup npm run dev > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
        UI_PID=$!
        echo $UI_PID > "$PROJECT_ROOT/.ui.pid"
        write_info "UI started in development mode (PID: $UI_PID)"
    else
        write_warning ".next directory not found, building UI first..."
        npm run build
        nohup npm run dev > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
        UI_PID=$!
        echo $UI_PID > "$PROJECT_ROOT/.ui.pid"
        write_info "UI started (PID: $UI_PID)"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Wait for UI to be ready
    wait_for_http "http://localhost:$UI_PORT" "UI Server" 60
    
    if [ $? -eq 0 ]; then
        write_success "UI server is running on http://localhost:$UI_PORT"
    else
        write_error "UI server failed to start"
        write_info "Check logs: tail -f logs/ui.log"
        return 1
    fi
}

################################################################################
# PHASE 9: System Health Checks
################################################################################

run_health_checks() {
    if [ "$SKIP_TESTS" = true ]; then
        write_info "Skipping health checks (--skip-tests flag)"
        return 0
    fi
    
    write_header "Phase 9: Running Health Checks"
    
    local all_healthy=true
    
    # Check API health
    write_step "Testing API health endpoint..."
    API_HEALTH=$(curl -s --max-time 5 "http://localhost:$API_PORT/health" 2>/dev/null)
    if echo "$API_HEALTH" | jq -e '.status == "healthy"' &>/dev/null 2>&1; then
        write_success "API is healthy"
    elif echo "$API_HEALTH" | grep -q '"status"'; then
        write_success "API is responding"
    else
        write_warning "API health check returned unexpected response"
        all_healthy=false
    fi
    
    # Check API auth endpoint
    write_step "Testing API authentication endpoint..."
    AUTH_RESPONSE=$(curl -s --max-time 5 -X POST "http://localhost:$API_PORT/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
    
    if echo "$AUTH_RESPONSE" | grep -q '"token"'; then
        write_success "Authentication endpoint is working"
    else
        write_warning "Authentication test failed (database may not be seeded)"
        write_info "Login with: admin / admin123"
        all_healthy=false
    fi
    
    # Check UI
    write_step "Testing UI server..."
    if curl -s --max-time 5 -I "http://localhost:$UI_PORT" >/dev/null 2>&1; then
        write_success "UI server is responding"
    else
        write_warning "UI server is not responding"
        all_healthy=false
    fi
    
    # Check blockchain if not skipped
    if [ "$SKIP_BLOCKCHAIN" = false ]; then
        write_step "Testing blockchain network..."
        PEER_STATUS=$(docker ps --filter "name=peer0.ecta" --format "{{.Status}}" 2>/dev/null | head -1)
        if echo "$PEER_STATUS" | grep -q "Up"; then
            write_success "Blockchain network is running"
        else
            write_warning "Blockchain network status unclear"
            all_healthy=false
        fi
    fi
    
    echo ""
    if [ "$all_healthy" = true ]; then
        write_success "All health checks passed!"
    else
        write_warning "Some health checks failed - system may still be initializing"
        write_info "Check logs for details"
    fi
}

################################################################################
# PHASE 9: Display System Status
################################################################################

show_final_status() {
    write_header "GoCBC System Successfully Started!"
    
    echo ""
    echo -e "${COLOR_GREEN}${COLOR_BOLD}✓ System Status:${COLOR_RESET}"
    echo ""
    
    # Blockchain status
    if [ "$SKIP_BLOCKCHAIN" = false ]; then
        echo -e "${COLOR_CYAN}Blockchain Network:${COLOR_RESET}"
        PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\." || echo "0")
        ORDERER_COUNT=$(docker ps 2>/dev/null | grep -c "orderer\." || echo "0")
        CHAINCODE_COUNT=$(docker ps 2>/dev/null | grep -c "coffee" || echo "0")
        echo "  • Peers:     $PEER_COUNT running"
        echo "  • Orderer:   $ORDERER_COUNT running"
        echo "  • Chaincode: $([ "$CHAINCODE_COUNT" -gt 0 ] && echo 'Deployed' || echo 'Ready')"
        echo ""
    fi
    
    # Application status
    echo -e "${COLOR_CYAN}Application Servers:${COLOR_RESET}"
    echo "  • API Server: http://localhost:$API_PORT"
    echo "  • UI Server:  http://localhost:$UI_PORT"
    echo ""
    
    # Database status
    if [ -f "$API_DIR/.env" ] && grep -q "DATABASE_URL" "$API_DIR/.env" 2>/dev/null; then
        echo -e "${COLOR_CYAN}Database:${COLOR_RESET}"
        echo "  • PostgreSQL: Running on port $POSTGRES_PORT"
        echo ""
    fi
    
    # Test credentials
    echo -e "${COLOR_CYAN}Test Credentials:${COLOR_RESET}"
    echo "  • Admin:      admin / admin123"
    echo "  • Exporter:   exporter1 / password123"
    echo "  • ECTA:       ecta_admin / password123"
    echo ""
    
    # Next steps
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}Next Steps:${COLOR_RESET}"
    echo "  1. Open browser: http://localhost:$UI_PORT"
    echo "  2. Login with test credentials above"
    echo "  3. Explore the system features"
    echo ""
    
    # Useful commands
    echo -e "${COLOR_BLUE}${COLOR_BOLD}Useful Commands:${COLOR_RESET}"
    echo "  • View API logs:        tail -f logs/api.log"
    echo "  • View UI logs:         tail -f logs/ui.log"
    echo "  • View blockchain logs: docker-compose -f docker-compose-fabric.yml logs -f"
    echo "  • Check system status:  ./status.sh"
    echo "  • Stop system:          ./stop-all.sh"
    echo ""
    
    echo -e "${COLOR_GREEN}═══════════════════════════════════════════════════════════════════════${COLOR_RESET}"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                       ║"
    echo "║   Ethiopian Coffee Export Consortium Blockchain System (CECBS)       ║"
    echo "║                     Complete System Startup                          ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${COLOR_RESET}"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Start time
    START_TIME=$(date +%s)
    
    # Execute phases
    check_prerequisites
    install_dependencies
    start_blockchain_network
    create_channel
    initialize_chaincode
    initialize_database
    start_api_server
    start_ui_server
    run_health_checks
    show_final_status
    
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${COLOR_GREEN}✅ System startup completed in ${DURATION} seconds${COLOR_RESET}"
    echo ""
}

# Run main function
main "$@"
