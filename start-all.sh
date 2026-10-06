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
ENABLE_NGINX=false
NGINX_IP=""
NGINX_DOMAIN=""
NGINX_SSL="none"
INTERACTIVE=true

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
        --with-nginx)
            ENABLE_NGINX=true
            INTERACTIVE=false
            ;;
        --nginx-ip=*)
            NGINX_IP="${arg#*=}"
            ;;
        --nginx-domain=*)
            NGINX_DOMAIN="${arg#*=}"
            ;;
        --nginx-ssl=*)
            NGINX_SSL="${arg#*=}"
            ;;
        --no-interactive)
            INTERACTIVE=false
            ;;
        *)
            echo "Unknown argument: $arg"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build          Skip chaincode building"
            echo "  --dev-mode            Enable development mode"
            echo "  --skip-tests          Skip connection tests"
            echo "  --with-nginx          Enable nginx reverse proxy"
            echo "  --nginx-ip=IP         Server IP for nginx (e.g., 10.3.15.7)"
            echo "  --nginx-domain=DOMAIN Domain name for nginx (optional)"
            echo "  --nginx-ssl=TYPE      SSL type: none|selfsigned|letsencrypt"
            echo "  --no-interactive      Skip interactive prompts"
            echo ""
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
    container_check=$(echo "$container_check" | tr -d '\n' | tr -d ' ')
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
# INTERACTIVE MENU
# ============================================================================

show_deployment_menu() {
    if [ "$INTERACTIVE" = false ]; then
        return 0
    fi
    
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}"
    echo -e "${CYAN}${BOLD}  CECBS Deployment Configuration${RESET}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}"
    echo ""
    echo -e "${YELLOW}This script will start all backend services.${RESET}"
    echo ""
    echo -e "${BOLD}Do you want to enable Nginx reverse proxy?${RESET}"
    echo ""
    echo "1) ${GREEN}No${RESET} - Development mode (localhost only)"
    echo "   Access: http://localhost:3000 (UI), http://localhost:3001 (API)"
    echo "   Best for: Local development and testing"
    echo ""
    echo "2) ${BLUE}Yes${RESET} - Production mode (with Nginx)"
    echo "   Access: http://your-ip/ (unified access point)"
    echo "   Best for: Server deployment, external access, SSL"
    echo ""
    echo "3) ${MAGENTA}Skip${RESET} - Backend only (configure Nginx later)"
    echo "   Start services now, add Nginx manually when ready"
    echo ""
    
    read -p "Enter choice [1-3] (default: 1): " choice
    choice=${choice:-1}
    
    case $choice in
        1)
            echo ""
            print_info "Starting in development mode (no Nginx)"
            ENABLE_NGINX=false
            ;;
        2)
            echo ""
            print_info "Production mode selected - Nginx will be configured"
            ENABLE_NGINX=true
            
            # Ask for server IP
            echo ""
            echo -e "${BOLD}Server IP address:${RESET}"
            read -p "Enter IP (e.g., 10.3.15.7): " NGINX_IP
            
            if [ -z "$NGINX_IP" ]; then
                print_error "IP address is required for Nginx deployment"
                print_warning "Falling back to development mode"
                ENABLE_NGINX=false
                return 0
            fi
            
            # Ask for domain (optional)
            echo ""
            echo -e "${BOLD}Domain name (optional):${RESET}"
            read -p "Enter domain (or press Enter to skip): " NGINX_DOMAIN
            
            # Ask for SSL
            echo ""
            echo -e "${BOLD}SSL Configuration:${RESET}"
            echo "1) None - HTTP only"
            echo "2) Self-signed certificate"
            echo "3) Let's Encrypt (requires domain)"
            echo ""
            read -p "Enter choice [1-3] (default: 1): " ssl_choice
            ssl_choice=${ssl_choice:-1}
            
            case $ssl_choice in
                1) NGINX_SSL="none" ;;
                2) NGINX_SSL="selfsigned" ;;
                3) 
                    if [ -z "$NGINX_DOMAIN" ]; then
                        print_warning "Let's Encrypt requires a domain name"
                        print_info "Using self-signed certificate instead"
                        NGINX_SSL="selfsigned"
                    else
                        NGINX_SSL="letsencrypt"
                    fi
                    ;;
                *) NGINX_SSL="none" ;;
            esac
            
            echo ""
            print_success "Nginx configuration:"
            echo "  • IP: $NGINX_IP"
            [ -n "$NGINX_DOMAIN" ] && echo "  • Domain: $NGINX_DOMAIN"
            echo "  • SSL: $NGINX_SSL"
            ;;
        3)
            echo ""
            print_info "Backend only mode - Nginx can be configured later"
            print_info "Run: cd nginx-configs && sudo ./deploy-cecbs-nginx.sh --ip <your-ip>"
            ENABLE_NGINX=false
            ;;
        *)
            print_warning "Invalid choice, using development mode"
            ENABLE_NGINX=false
            ;;
    esac
    
    echo ""
    sleep 1
}

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
    
    print_header "Building Coffee Chaincode with TLS"
    
    if ! command -v go &> /dev/null; then
        print_warning "Go not found, skipping chaincode build"
        return
    fi
    
    cd "$CHAINCODE_DIR"
    print_step "Building Go chaincode with TLS support..."
    if CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o coffee-chaincode .; then
        print_success "Chaincode built successfully with TLS enabled"
        
        # Verify TLS certificates exist
        if [ -f "tls/server-cert.pem" ] && [ -f "tls/server-key.pem" ]; then
            print_success "TLS certificates found (server-cert.pem, server-key.pem)"
        else
            print_warning "TLS certificates not found in tls/ directory"
            print_info "TLS certs are embedded in binary - external files not required"
        fi
        
        # Verify connection.json has TLS enabled
        if [ -f "connection.json" ]; then
            if grep -q '"tls_required".*true' connection.json; then
                print_success "connection.json has TLS enabled"
            else
                print_warning "connection.json has TLS disabled"
            fi
        fi
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

detect_deployed_chaincode_version() {
    print_step "Detecting deployed chaincode version on channel..."
    
    # Query the channel for committed chaincode with timeout
    # Use 'set +e' temporarily to prevent script exit on error
    set +e
    local deployed_info=$(timeout 15 docker exec peer0.ecta.cecbs.et bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
        peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null
    " 2>/dev/null)
    local query_exit_code=$?
    set -e
    
    if [ $query_exit_code -ne 0 ] || [ -z "$deployed_info" ]; then
        print_warning "No chaincode deployed on channel yet (or query failed/timed out)"
        print_info "Will proceed with fresh deployment"
        echo ""
        return 1
    fi
    
    # Parse version and sequence
    DEPLOYED_VERSION=$(echo "$deployed_info" | grep -oP 'Version: \K[0-9.]+' || echo "")
    DEPLOYED_SEQUENCE=$(echo "$deployed_info" | grep -oP 'Sequence: \K[0-9]+' || echo "")
    
    if [ -n "$DEPLOYED_VERSION" ]; then
        print_success "Deployed chaincode: coffee v${DEPLOYED_VERSION} (sequence ${DEPLOYED_SEQUENCE})"
        echo "$DEPLOYED_VERSION"
        return 0
    else
        print_warning "Could not parse deployed version"
        echo ""
        return 1
    fi
}

start_chaincode_container() {
    print_header "Starting Chaincode Container (Auto-Detect Version)"
    
    # First, detect what version is deployed on the channel
    print_step "Step 1: Detect deployed chaincode version from blockchain..."
    set +e  # Temporarily disable exit on error
    DEPLOYED_VERSION=$(detect_deployed_chaincode_version)
    local detection_result=$?
    set -e  # Re-enable exit on error
    
    if [ $detection_result -ne 0 ] || [ -z "$DEPLOYED_VERSION" ]; then
        print_warning "Chaincode not yet deployed on channel"
        print_info "Container will be started after chaincode deployment step"
        print_info "Default version 1.0 will be used for initial deployment"
        
        # Set default for initial deployment
        DEPLOYED_VERSION="1.0"
        
        # Don't start container yet - it will be started after deployment
        print_success "Chaincode container will be started after deployment"
        return 0
    fi
    
    print_success "Target chaincode version: $DEPLOYED_VERSION"
    
    # Check if container is already running with correct version
    if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        local running_ccid=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep CORE_CHAINCODE_ID_NAME | cut -d'=' -f2)
        if [[ "$running_ccid" == coffee_${DEPLOYED_VERSION}:* ]]; then
            print_success "Chaincode container already running with correct version ($DEPLOYED_VERSION)"
            export RUNNING_CHAINCODE_VERSION="$DEPLOYED_VERSION"
            echo "$DEPLOYED_VERSION" > /tmp/cecbs-chaincode-version.txt
            return 0
        else
            print_warning "Container running with wrong version: $running_ccid"
            print_step "Stopping and restarting with correct version..."
            docker stop coffee-chaincode 2>/dev/null || true
            docker rm coffee-chaincode 2>/dev/null || true
        fi
    fi
    
    # Stop and remove old container if exists
    if docker ps -a --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        print_step "Removing old chaincode container..."
        docker stop coffee-chaincode 2>/dev/null || true
        docker rm coffee-chaincode 2>/dev/null || true
    fi
    
    # Update metadata to match deployed version
    print_step "Step 2: Sync local metadata with deployed version ${DEPLOYED_VERSION}..."
    mkdir -p "$PROJECT_ROOT/chaincode-package"
    cat > "$PROJECT_ROOT/chaincode-package/metadata.json" <<EOF
{
  "type": "ccaas",
  "label": "coffee_${DEPLOYED_VERSION}"
}
EOF
    print_success "Metadata synced to v${DEPLOYED_VERSION}"
    
    # Build chaincode Docker image if not exists
    local IMAGE_TAG="coffee-chaincode:${DEPLOYED_VERSION}"
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_TAG}$"; then
        print_step "Step 3: Building chaincode Docker image ${IMAGE_TAG}..."
        cd "$CHAINCODE_DIR"
        if docker build -t "$IMAGE_TAG" . 2>&1 | tail -10; then
            print_success "Chaincode image ${IMAGE_TAG} built successfully"
        else
            print_error "Failed to build chaincode image"
            cd "$PROJECT_ROOT"
            return 1
        fi
        cd "$PROJECT_ROOT"
    else
        print_success "Step 3: Chaincode image ${IMAGE_TAG} already exists"
    fi
    
    # Calculate the correct CCID hash from the deployed package
    print_step "Step 4: Calculate package hash for CCID..."
    local CCID_HASH=""
    
    # Try to get hash from latest deployed package
    if [ -f "$PROJECT_ROOT/blockchain/channel-artifacts/coffee_${DEPLOYED_VERSION}.tgz" ]; then
        # Extract code.tar.gz and calculate hash
        local TEMP_DIR=$(mktemp -d)
        tar -xzf "$PROJECT_ROOT/blockchain/channel-artifacts/coffee_${DEPLOYED_VERSION}.tgz" -C "$TEMP_DIR" 2>/dev/null
        if [ -f "$TEMP_DIR/code.tar.gz" ]; then
            CCID_HASH=$(sha256sum "$TEMP_DIR/code.tar.gz" | awk '{print $1}')
            print_success "Hash calculated from deployed package: ${CCID_HASH:0:16}..."
        fi
        rm -rf "$TEMP_DIR"
    fi
    
    # Fallback: calculate from local package
    if [ -z "$CCID_HASH" ] && [ -f "$PROJECT_ROOT/chaincode-package/code.tar.gz" ]; then
        CCID_HASH=$(sha256sum "$PROJECT_ROOT/chaincode-package/code.tar.gz" | awk '{print $1}')
        print_info "Hash calculated from local package: ${CCID_HASH:0:16}..."
    fi
    
    # Last resort: query from peer (if chaincode is installed)
    if [ -z "$CCID_HASH" ]; then
        print_warning "Cannot calculate hash, will use label-only CCID"
        # Fabric will use the label to find the package
        CCID="coffee_${DEPLOYED_VERSION}"
    else
        CCID="coffee_${DEPLOYED_VERSION}:${CCID_HASH}"
    fi
    
    print_success "CCID: $CCID"
    
    # Start chaincode container with correct configuration
    print_step "Step 5: Starting chaincode container ${IMAGE_TAG}..."
    docker run -d \
        --name coffee-chaincode \
        --network cecbs-network \
        -p 9999:9999 \
        -e CORE_CHAINCODE_ID_NAME="$CCID" \
        -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
        "$IMAGE_TAG"
    
    if [ $? -eq 0 ]; then
        print_success "Chaincode container started"
    else
        print_error "Failed to start chaincode container"
        return 1
    fi
    
    # Wait for chaincode to be ready
    print_step "Step 6: Waiting for chaincode to initialize..."
    sleep 5
    
    # Verify chaincode started successfully
    if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        print_success "✓ Chaincode v${DEPLOYED_VERSION} is running"
        
        # Check logs for confirmation
        if docker logs coffee-chaincode 2>&1 | tail -10 | grep -q "Starting Coffee Chaincode"; then
            print_success "✓ Chaincode initialized successfully"
        fi
        
        # Check TLS/CCAAS mode
        if docker logs coffee-chaincode 2>&1 | grep -q "CCAAS Server Mode"; then
            print_success "✓ Running in CCAAS mode with TLS"
        fi
        
        # Export version for later use
        export RUNNING_CHAINCODE_VERSION="$DEPLOYED_VERSION"
        echo "$DEPLOYED_VERSION" > /tmp/cecbs-chaincode-version.txt
        
    else
        print_error "Chaincode container exited unexpectedly"
        print_info "Check logs: docker logs coffee-chaincode"
        docker logs coffee-chaincode 2>&1 | tail -20
        return 1
    fi
}

start_fabric_network() {
    print_header "Starting Hyperledger Fabric Network"
    
    # Check if network is already running
    print_step "Checking existing containers..."
    local running_containers=$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q 2>/dev/null | wc -l)
    
    if [ "$running_containers" -gt 0 ]; then
        print_info "Network containers already running. Restarting gracefully..."
        # Stop coffee-chaincode if running (we'll restart it with correct version later)
        docker stop coffee-chaincode 2>/dev/null || true
        docker rm coffee-chaincode 2>/dev/null || true
        # Restart other containers but exclude coffee-chaincode
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart $(docker-compose -f "$DOCKER_COMPOSE_FILE" ps --services | grep -v coffee-chaincode) 2>/dev/null || true
        print_success "Network containers restarted (data preserved)"
    else
        print_step "Starting fresh network containers..."
        # Start WITHOUT down to preserve all data
        # Exclude coffee-chaincode from docker-compose - it's managed dynamically by this script
        if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale coffee-chaincode=0; then
            print_success "Fabric network containers started (data preserved)"
        else
            print_error "Failed to start Fabric network"
            exit 1
        fi
    fi
    
    # Wait for services
    print_step "Waiting for services to initialize (60-90 seconds)..."
    sleep 15  # Give Docker time to initialize
    
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45
    wait_for_port $REDIS_PORT "Redis" 45
    wait_for_port $ORDERER_PORT "Orderer" 60
    wait_for_port $PEER_ECTA_PORT "Peer (ECTA)" 60
    # Note: Chaincode container will be started later with correct version
    
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
    
    # Use the working deployment script (in root directory)
    local deploy_script="$PROJECT_ROOT/deploy-chaincode.sh"
    
    if [ ! -f "$deploy_script" ]; then
        print_error "Deployment script not found: $deploy_script"
        print_warning "Chaincode deployment skipped"
        return 1
    fi
    
    print_step "Running chaincode deployment script..."
    
    if bash "$deploy_script"; then
        print_success "Chaincode deployed successfully"
        return 0
    else
        print_warning "Chaincode deployment had issues (see output above)"
        return 1
    fi
}

show_container_status() {
    print_header "Container Status"
    print_step "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ============================================================================
# DATABASE MIGRATION FUNCTIONS
# ============================================================================

run_database_migrations() {
    print_header "Running Database Migrations"
    
    # Check if PostgreSQL is ready
    if ! test_port $POSTGRES_PORT; then
        print_error "PostgreSQL is not running on port $POSTGRES_PORT"
        print_info "Start PostgreSQL first or wait for it to be ready"
        return 1
    fi
    
    print_success "PostgreSQL is ready"
    
    # Check if migration script exists
    local migration_script="$PROJECT_ROOT/scripts/migrate-db-pg.js"
    
    if [ ! -f "$migration_script" ]; then
        print_warning "Migration script not found: $migration_script"
        print_info "Skipping database migrations"
        return 0
    fi
    
    # Check if script dependencies are installed
    if [ ! -d "$PROJECT_ROOT/scripts/node_modules" ]; then
        print_step "Installing script dependencies..."
        cd "$PROJECT_ROOT/scripts"
        if npm install --silent 2>/dev/null; then
            print_success "Script dependencies installed"
        else
            print_warning "Failed to install script dependencies, skipping migrations"
            cd "$PROJECT_ROOT"
            return 0
        fi
        cd "$PROJECT_ROOT"
    fi
    
    # Run migrations
    print_step "Running database migrations..."
    cd "$PROJECT_ROOT/scripts"
    
    if node migrate-db-pg.js 2>&1 | tee /tmp/cecbs-migration.log; then
        print_success "Database migrations completed successfully"
        
        # Check if admin user exists, create if not
        print_step "Checking for admin user..."
        if node check-admin-role-pg.js 2>&1 | grep -q "Admin user found"; then
            print_success "Admin user exists"
        else
            print_warning "Admin user not found, creating..."
            if node add-admin-user-pg.js 2>&1 | grep -q "created successfully"; then
                print_success "Admin user created (username: admin, password: admin123)"
            else
                print_warning "Could not create admin user automatically"
                print_info "Run manually: cd scripts && node add-admin-user-pg.js"
            fi
        fi
    else
        print_warning "Database migrations had issues (see /tmp/cecbs-migration.log)"
        print_info "System will continue, but some features may not work"
        print_info "Fix manually: cd scripts && node migrate-db-pg.js"
    fi
    
    cd "$PROJECT_ROOT"
}

# ============================================================================
# API & UI STARTUP FUNCTIONS
# ============================================================================

start_api() {
    print_header "Starting Backend API"
    
    cd "$PROJECT_ROOT"
    
    # Use the separate start-api.sh script
    if [ -f "start-api.sh" ]; then
        bash start-api.sh
        
        # Wait for API to be ready
        sleep 3
        if wait_for_port $API_PORT "API" 30; then
            print_success "API server is ready on port $API_PORT"
        else
            print_warning "API not responding yet. Check logs: bash logs-api.sh"
        fi
    else
        print_error "start-api.sh not found!"
        exit 1
    fi
}

start_ui() {
    print_header "Starting Frontend UI"
    
    cd "$PROJECT_ROOT"
    
    # Use the separate start-ui.sh script
    if [ -f "start-ui.sh" ]; then
        bash start-ui.sh
        
        # Wait for UI to be ready
        sleep 3
        if wait_for_port $UI_PORT "UI" 30; then
            print_success "UI server is ready on port $UI_PORT"
        else
            print_warning "UI not responding yet. Check logs: bash logs-ui.sh"
        fi
    else
        print_error "start-ui.sh not found!"
        exit 1
    fi
}

start_sync_service() {
    print_header "Starting CouchDB → PostgreSQL Sync Service"
    
    local SYNC_DIR="$PROJECT_ROOT/sync-service"
    
    if [ ! -d "$SYNC_DIR" ]; then
        print_warning "Sync service directory not found: $SYNC_DIR"
        print_info "Skipping sync service startup"
        return 0
    fi
    
    if [ ! -f "$SYNC_DIR/couchdb-postgres-sync.js" ]; then
        print_warning "Sync service script not found"
        print_info "Skipping sync service startup"
        return 0
    fi
    
    # Check if dependencies are installed
    if [ ! -d "$SYNC_DIR/node_modules" ]; then
        print_step "Installing sync service dependencies..."
        cd "$SYNC_DIR"
        if npm install --silent 2>/dev/null; then
            print_success "Sync service dependencies installed"
        else
            print_warning "Failed to install sync service dependencies"
            cd "$PROJECT_ROOT"
            return 0
        fi
        cd "$PROJECT_ROOT"
    fi
    
    # Check if sync service is already running
    if [ -f "$SYNC_DIR/sync-service.pid" ]; then
        local sync_pid=$(cat "$SYNC_DIR/sync-service.pid")
        if ps -p $sync_pid > /dev/null 2>&1; then
            print_success "Sync service is already running (PID: $sync_pid)"
            return 0
        else
            # Remove stale PID file
            rm "$SYNC_DIR/sync-service.pid"
        fi
    fi
    
    # Start sync service
    print_step "Starting continuous sync service (every 30 seconds)..."
    cd "$SYNC_DIR"
    nohup node couchdb-postgres-sync.js --watch > sync-continuous.log 2>&1 &
    local sync_pid=$!
    echo $sync_pid > sync-service.pid
    cd "$PROJECT_ROOT"
    
    sleep 2
    
    # Verify it's running
    if ps -p $sync_pid > /dev/null 2>&1; then
        print_success "Sync service started successfully (PID: $sync_pid)"
        print_info "Syncing all 6 CouchDB instances to PostgreSQL every 30 seconds"
        print_info "View logs: tail -f $SYNC_DIR/sync-continuous.log"
        print_info "Manage service: $SYNC_DIR/manage-sync.sh {status|stop|restart|logs}"
    else
        print_warning "Sync service failed to start"
        print_info "Check logs: $SYNC_DIR/sync-continuous.log"
        rm "$SYNC_DIR/sync-service.pid" 2>/dev/null
    fi
}

# ============================================================================
# NGINX DEPLOYMENT
# ============================================================================

deploy_nginx() {
    if [ "$ENABLE_NGINX" != true ]; then
        return 0
    fi
    
    print_header "Deploying Nginx Reverse Proxy"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ] && ! command -v sudo &> /dev/null; then
        print_error "Nginx deployment requires root privileges"
        print_warning "Skipping nginx deployment"
        print_info "You can deploy nginx manually later with:"
        print_info "  cd nginx-configs && sudo ./deploy-cecbs-nginx.sh --ip $NGINX_IP"
        return 1
    fi
    
    # Check if nginx deployment script exists
    if [ ! -f "$PROJECT_ROOT/nginx-configs/deploy-cecbs-nginx.sh" ]; then
        print_error "Nginx deployment script not found"
        print_warning "Expected: $PROJECT_ROOT/nginx-configs/deploy-cecbs-nginx.sh"
        return 1
    fi
    
    print_step "Preparing nginx deployment..."
    
    # Build deployment command
    local nginx_cmd="$PROJECT_ROOT/nginx-configs/deploy-cecbs-nginx.sh --ip $NGINX_IP"
    
    if [ -n "$NGINX_DOMAIN" ]; then
        nginx_cmd="$nginx_cmd --domain $NGINX_DOMAIN"
    fi
    
    if [ "$NGINX_SSL" != "none" ]; then
        nginx_cmd="$nginx_cmd --ssl $NGINX_SSL"
    fi
    
    print_info "Running: $nginx_cmd"
    
    # Make script executable
    chmod +x "$PROJECT_ROOT/nginx-configs/deploy-cecbs-nginx.sh" 2>/dev/null || true
    
    # Run deployment
    if [ "$EUID" -eq 0 ]; then
        # Already root
        bash $nginx_cmd
    else
        # Use sudo
        sudo bash $nginx_cmd
    fi
    
    local nginx_status=$?
    
    if [ $nginx_status -eq 0 ]; then
        print_success "Nginx deployed successfully!"
        echo ""
        print_success "Access your application:"
        if [ -n "$NGINX_DOMAIN" ]; then
            if [ "$NGINX_SSL" = "letsencrypt" ] || [ "$NGINX_SSL" = "selfsigned" ]; then
                echo "  • https://$NGINX_DOMAIN/"
            else
                echo "  • http://$NGINX_DOMAIN/"
            fi
        fi
        echo "  • http://$NGINX_IP/"
        echo ""
    else
        print_error "Nginx deployment failed"
        print_warning "Backend services are running, but nginx is not configured"
        print_info "You can deploy nginx manually later with:"
        print_info "  cd nginx-configs && sudo ./deploy-cecbs-nginx.sh --ip $NGINX_IP"
    fi
    
    return $nginx_status
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
    
    # Test Frontend on multiple ports (Next.js may move to alternate ports)
    print_step "Testing Frontend UI..."
    local ui_found=false
    for port in $UI_PORT 3001 3002 3003; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null | grep -qE "200|404"; then
            print_success "Frontend UI is responding on port $port"
            ui_found=true
            break
        fi
    done
    if [ "$ui_found" = false ]; then
        print_warning "Frontend UI is not responding (check logs: tail -f logs/ui.log)"
    fi
    
    # Test API Health
    print_step "Testing Backend API..."
    if curl -s "http://localhost:$API_PORT/health" 2>/dev/null | grep -q '"status":"healthy"'; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API is not responding (check logs: tail -f logs/api.log)"
    fi
    
    # Test API Docs  
    print_step "Testing API Docs..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api-docs" 2>/dev/null | grep -qE "200|301"; then
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
    
    # Get actual running chaincode version
    local chaincode_version="unknown"
    if [ -f /tmp/cecbs-chaincode-version.txt ]; then
        chaincode_version=$(cat /tmp/cecbs-chaincode-version.txt)
    fi
    
    local chaincode_image=$(docker inspect coffee-chaincode --format='{{.Config.Image}}' 2>/dev/null || echo "not running")
    local chaincode_ccid=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep CORE_CHAINCODE_ID_NAME | cut -d'=' -f2 || echo "unknown")
    
    if [ "$chaincode_deployed" = "0" ]; then
        echo -e "  ${GREEN}✓ Chaincode:${RESET}       v${chaincode_version} deployed and operational with TLS"
    else
        echo -e "  ${YELLOW}⚠ Chaincode:${RESET}       Deployment had issues (check logs)"
        echo -e "    ${CYAN}Manual fix:${RESET}        ./deploy-chaincode.sh"
    fi
    
    if [[ "$chaincode_image" != "not running" ]]; then
        echo -e "  ${GREEN}✓ Container:${RESET}       $chaincode_image"
        if [[ "$chaincode_ccid" != "unknown" ]]; then
            # Show just the label part (before the colon)
            local ccid_label=$(echo "$chaincode_ccid" | cut -d':' -f1)
            echo -e "  ${GREEN}✓ CCID Label:${RESET}      $ccid_label"
        fi
    else
        echo -e "  ${RED}✗ Container:${RESET}       Not running"
    fi
    
    # Check chaincode TLS status
    if docker logs coffee-chaincode 2>&1 | grep -q "CCAAS Server Mode"; then
        echo -e "  ${GREEN}✓ TLS Security:${RESET}    Enabled (CCAAS mode with encrypted communication)"
    elif docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        echo -e "  ${GREEN}✓ Mode:${RESET}            Running (check logs for TLS status)"
    else
        echo -e "  ${YELLOW}⚠ TLS Security:${RESET}    Container not running"
    fi
    
    # Check sync service status
    if [ -f "$PROJECT_ROOT/sync-service/sync-service.pid" ]; then
        local sync_pid=$(cat "$PROJECT_ROOT/sync-service/sync-service.pid")
        if ps -p $sync_pid > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ CouchDB Sync:${RESET}    Running (syncing every 30s)"
        else
            echo -e "  ${YELLOW}⚠ CouchDB Sync:${RESET}    Not running"
        fi
    else
        echo -e "  ${YELLOW}⚠ CouchDB Sync:${RESET}    Not started"
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
    echo -e "  ${CYAN}Deploy chaincode:${RESET}     ./deploy-chaincode.sh"
    echo -e "  ${CYAN}Stop system:${RESET}          ./stop-all.sh"
    echo -e "  ${CYAN}API logs:${RESET}             tail -f /tmp/cecbs-api.log"
    echo -e "  ${CYAN}UI logs:${RESET}              tail -f /tmp/cecbs-ui.log"
    echo -e "  ${CYAN}Sync logs:${RESET}            tail -f sync-service/sync-continuous.log"
    echo -e "  ${CYAN}Manage sync:${RESET}          sync-service/manage-sync.sh status"
    echo ""
    
    if [ "$chaincode_deployed" != "0" ]; then
        echo -e "${YELLOW}⚠ Note: Some blockchain features may not work until chaincode is deployed.${RESET}"
        echo -e "${YELLOW}  Run: ./deploy-chaincode.sh${RESET}"
        echo ""
    fi
    
    echo -e "${BOLD}${GREEN}Process IDs:${RESET}"
    if [ -f /tmp/cecbs-api.pid ]; then
        echo -e "  ${CYAN}API PID:${RESET}   $(cat /tmp/cecbs-api.pid)"
    fi
    if [ -f /tmp/cecbs-ui.pid ]; then
        echo -e "  ${CYAN}UI PID:${RESET}    $(cat /tmp/cecbs-ui.pid)"
    fi
    if [ -f "$PROJECT_ROOT/sync-service/sync-service.pid" ]; then
        echo -e "  ${CYAN}Sync PID:${RESET}  $(cat "$PROJECT_ROOT/sync-service/sync-service.pid")"
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
    
    # Show interactive deployment menu
    show_deployment_menu
    
    # Run all steps
    check_prerequisites
    build_chaincode
    install_dependencies
    build_typescript
    
    # START NETWORK FIRST - peers must exist before we can query them!
    start_fabric_network
    
    # Run database migrations (automatic)
    run_database_migrations
    
    # Create channel before deploying chaincode
    create_channel
    
    # NOW we can detect version (peers are running)
    start_chaincode_container  # Will detect deployed version or skip if not deployed yet
    
    # Deploy chaincode after network and channel are ready
    local chaincode_status=0
    deploy_chaincode || chaincode_status=$?
    
    # If chaincode was just deployed and container isn't running, start it now
    if [ $chaincode_status -eq 0 ]; then
        if ! docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
            print_header "Starting Chaincode Container After Deployment"
            print_info "Chaincode was just deployed, starting container..."
            start_chaincode_container
        else
            print_success "Chaincode container is already running"
        fi
    fi
    
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
        start_sync_service
        sleep 2
        test_connections
    fi
    
    # Deploy nginx if requested
    if [ "$ENABLE_NGINX" = true ]; then
        deploy_nginx
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    show_summary "$chaincode_status"
    
    echo -e "${GREEN}Total startup time: ${duration} seconds${RESET}"
    echo ""
    
    # Run system verification
    if command -v nc &> /dev/null || command -v curl &> /dev/null; then
        echo -e "${CYAN}${BOLD}Running system verification...${RESET}"
        echo ""
        if bash "$PROJECT_ROOT/verify-complete-system.sh"; then
            echo ""
            echo -e "${GREEN}${BOLD}✅ All systems verified and operational!${RESET}"
        else
            echo ""
            echo -e "${YELLOW}${BOLD}⚠ System verification found some issues (see above)${RESET}"
        fi
    else
        echo -e "${YELLOW}⚠ Skipping verification (nc or curl not available)${RESET}"
    fi
    
    # Show final access information
    echo ""
    if [ "$ENABLE_NGINX" = true ] && [ -n "$NGINX_IP" ]; then
        echo -e "${GREEN}${BOLD}🎉 System is ready!${RESET}"
        echo ""
        echo -e "${BOLD}Access your application:${RESET}"
        if [ -n "$NGINX_DOMAIN" ]; then
            if [ "$NGINX_SSL" = "letsencrypt" ] || [ "$NGINX_SSL" = "selfsigned" ]; then
                echo -e "  ${CYAN}•${RESET} https://$NGINX_DOMAIN/"
            else
                echo -e "  ${CYAN}•${RESET} http://$NGINX_DOMAIN/"
            fi
        fi
        echo -e "  ${CYAN}•${RESET} http://$NGINX_IP/"
        echo ""
    else
        echo -e "${GREEN}${BOLD}🎉 System is ready!${RESET}"
        echo ""
        echo -e "${BOLD}Access your application:${RESET}"
        echo -e "  ${CYAN}•${RESET} Frontend: http://localhost:3000"
        echo -e "  ${CYAN}•${RESET} API: http://localhost:3001"
        echo ""
    fi
    echo ""
}

# Run main function
main "$@"
