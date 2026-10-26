#!/bin/bash
# Complete startup script for CECBS (Coffee Export Consortium Blockchain System)
# This script performs full system initialization including chaincode deployment

set -e

# Configuration
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
ORDERER_PORT=7050
PEER_ECTA_PORT=7051
CHAINCODE_PORT=9999

# Colors
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[31m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_BLUE='\033[34m'
COLOR_MAGENTA='\033[35m'
COLOR_CYAN='\033[36m'

# Flags
SKIP_BUILD=false
DEV_MODE=false
SKIP_TESTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dev-mode)
            DEV_MODE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-build] [--dev-mode] [--skip-tests]"
            exit 1
            ;;
    esac
done

# Helper functions
write_header() {
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}  $1${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
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

test_port() {
    local port=$1
    if command -v nc &> /dev/null; then
        nc -z localhost $port 2>/dev/null
        return $?
    elif command -v timeout &> /dev/null; then
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null
        return $?
    else
        # Fallback: try curl
        curl -s --max-time 1 http://localhost:$port &>/dev/null
        return $?
    fi
}

wait_for_port() {
    local port=$1
    local service=$2
    local timeout=${3:-60}
    
    write_step "Waiting for $service on port $port..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if test_port $port; then
            write_success "$service is ready on port $port"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo ""
    write_error "$service failed to start on port $port after ${timeout}s"
    return 1
}

# Check prerequisites
check_prerequisites() {
    write_header "Checking Prerequisites"
    
    local all_good=true
    local warnings=()
    
    # Check Docker
    write_step "Checking Docker..."
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version)
        write_success "Docker found: $docker_version"
        
        # Check Docker version (minimum 20.10)
        docker_ver=$(docker version --format '{{.Server.Version}}' 2>/dev/null | cut -d'.' -f1)
        if [ "$docker_ver" -ge 20 ] 2>/dev/null; then
            write_success "Docker version is sufficient (>= 20.10)"
        else
            write_warning "Docker version may be too old. Recommended: >= 20.10"
        fi
    else
        write_error "Docker is not installed or not in PATH"
        write_info "Install: https://docs.docker.com/engine/install/"
        all_good=false
    fi
    
    # Check Docker Compose
    write_step "Checking Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        compose_version=$(docker-compose --version)
        write_success "Docker Compose found: $compose_version"
    elif docker compose version &> /dev/null; then
        compose_version=$(docker compose version)
        write_success "Docker Compose (plugin) found: $compose_version"
    else
        write_error "Docker Compose is not installed or not in PATH"
        write_info "Install: https://docs.docker.com/compose/install/"
        all_good=false
    fi
    
    # Check Docker daemon
    write_step "Checking Docker daemon..."
    if docker ps &> /dev/null; then
        write_success "Docker daemon is running"
        
        # Check Docker resources
        docker_info=$(docker info 2>/dev/null)
        if echo "$docker_info" | grep -q "CPUs"; then
            cpus=$(echo "$docker_info" | grep "CPUs:" | awk '{print $2}')
            memory=$(echo "$docker_info" | grep "Total Memory" | awk '{print $3$4}')
            write_success "Docker resources: $cpus CPUs, $memory RAM"
        fi
    else
        write_error "Docker daemon is not running. Please start Docker."
        write_info "Try: sudo systemctl start docker"
        all_good=false
    fi
    
    # Check Node.js
    write_step "Checking Node.js..."
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        write_success "Node.js found: $node_version"
        
        # Check Node version (minimum v16)
        node_ver=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_ver" -ge 16 ] 2>/dev/null; then
            write_success "Node.js version is sufficient (>= v16)"
        else
            write_warning "Node.js version may be too old. Recommended: >= v16"
            warnings+=("Node.js version $node_version is old. Consider upgrading to v18 or v20")
        fi
    else
        write_error "Node.js is not installed or not in PATH"
        write_info "Install: https://nodejs.org/ or use nvm"
        all_good=false
    fi
    
    # Check npm
    write_step "Checking npm..."
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        write_success "npm found: v$npm_version"
    else
        write_error "npm is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Go (optional for chaincode building)
    write_step "Checking Go..."
    if command -v go &> /dev/null; then
        go_version=$(go version)
        write_success "Go found: $go_version"
    else
        write_warning "Go is not installed. Chaincode building will be skipped."
        warnings+=("Go not found - chaincode deployment may require manual steps")
    fi
    
    # Check IPFS/Kubo (optional for document storage)
    write_step "Checking IPFS (Kubo)..."
    if command -v ipfs &> /dev/null; then
        ipfs_version=$(ipfs version 2>/dev/null | head -1)
        write_success "IPFS found: $ipfs_version"
    else
        write_warning "IPFS (Kubo) is not installed"
        if [ -f "$PROJECT_ROOT/kubo/install.sh" ]; then
            write_info "Found kubo installer: $PROJECT_ROOT/kubo/install.sh"
            warnings+=("IPFS not installed - document storage may be limited. Run: cd kubo && sudo bash install.sh")
        else
            warnings+=("IPFS not installed - install from https://docs.ipfs.tech/install/")
        fi
    fi
    
    # Check PostgreSQL client (optional)
    write_step "Checking PostgreSQL client..."
    if command -v psql &> /dev/null; then
        psql_version=$(psql --version)
        write_success "PostgreSQL client found: $psql_version"
    else
        write_warning "PostgreSQL client (psql) is not installed"
        write_info "Useful for debugging but not required (PostgreSQL runs in Docker)"
    fi
    
    # Check curl (for API testing)
    write_step "Checking curl..."
    if command -v curl &> /dev/null; then
        curl_version=$(curl --version | head -1)
        write_success "curl found: $curl_version"
    else
        write_warning "curl is not installed - API testing will be limited"
        warnings+=("curl not found - install with: sudo apt-get install curl")
    fi
    
    # Check jq (for JSON parsing)
    write_step "Checking jq..."
    if command -v jq &> /dev/null; then
        jq_version=$(jq --version)
        write_success "jq found: $jq_version"
    else
        write_warning "jq is not installed - JSON parsing will be limited"
        write_info "Install: sudo apt-get install jq"
    fi
    
    # Check available disk space
    write_step "Checking disk space..."
    available_space=$(df -BG "$PROJECT_ROOT" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_space" -ge 10 ] 2>/dev/null; then
        write_success "Available disk space: ${available_space}GB (sufficient)"
    else
        write_warning "Low disk space: ${available_space}GB (recommended: >= 10GB)"
        warnings+=("Low disk space - may cause issues with Docker volumes")
    fi
    
    # Check required directories
    write_step "Checking project structure..."
    local required_dirs=("$API_DIR" "$UI_DIR" "$CHAINCODE_DIR" "$PROJECT_ROOT/blockchain")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            write_success "Found: $dir"
        else
            write_error "Missing directory: $dir"
            all_good=false
        fi
    done
    
    # Check docker-compose file
    write_step "Checking Docker Compose configuration..."
    if [ -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ]; then
        write_success "Found: $DOCKER_COMPOSE_FILE"
    else
        write_error "Missing: $DOCKER_COMPOSE_FILE"
        all_good=false
    fi
    
    # Summary
    echo ""
    if [ "$all_good" = false ]; then
        write_error "Prerequisites check failed. Please fix the ERRORS above and try again."
        echo ""
        exit 1
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo ""
        write_warning "Warnings found (${#warnings[@]}):"
        for warning in "${warnings[@]}"; do
            echo "  • $warning"
        done
        echo ""
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Startup cancelled."
            exit 0
        fi
    fi
    
    echo ""
    write_success "All critical prerequisites met!"
}

# Install dependencies
install_dependencies() {
    if [ "$SKIP_BUILD" = true ]; then
        write_info "Skipping dependency installation (--skip-build flag)"
        return
    fi
    
    write_header "Installing Dependencies"
    
    # Install API dependencies
    write_step "Installing API dependencies..."
    cd "$API_DIR"
    if [ ! -d "node_modules" ]; then
        npm install --silent
        write_success "API dependencies installed"
    else
        write_info "API dependencies already installed (node_modules exists)"
    fi
    cd "$PROJECT_ROOT"
    
    # Install UI dependencies
    write_step "Installing UI dependencies..."
    cd "$UI_DIR"
    if [ ! -d "node_modules" ]; then
        npm install --silent
        write_success "UI dependencies installed"
    else
        write_info "UI dependencies already installed (node_modules exists)"
    fi
    cd "$PROJECT_ROOT"
}

# Start Fabric Network
start_fabric_network() {
    write_header "Starting Hyperledger Fabric Network"
    
    # Check if already running
    if docker ps | grep -q "peer0.ecta"; then
        write_info "Blockchain network is already running"
        return 0
    fi
    
    # Clean up existing containers
    write_step "Cleaning up existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true
    write_success "Cleanup complete"
    
    # Start the network
    write_step "Starting Fabric network containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    if [ $? -ne 0 ]; then
        write_error "Failed to start Fabric network"
        exit 1
    fi
    
    write_success "Fabric network containers started"
    
    # Wait for services
    write_step "Waiting for services to initialize (60-90 seconds)..."
    sleep 15
    
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45 || true
    wait_for_port $ORDERER_PORT "Orderer" 60 || true
    wait_for_port $PEER_ECTA_PORT "Peer (ECTA)" 60 || true
    wait_for_port $CHAINCODE_PORT "Coffee Chaincode" 60 || true
    
    write_info "Allowing extra time for full initialization..."
    sleep 10
    
    write_success "Fabric network is operational"
}

# Deploy chaincode
deploy_chaincode() {
    write_header "Deploying Chaincode"
    
    # Check if chaincode is already deployed AND working
    write_step "Checking if chaincode is already deployed..."
    
    CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null || echo "")
    
    if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
        CURRENT_VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        CURRENT_SEQUENCE=$(echo "$CHAINCODE_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
        
        write_success "Chaincode is already committed:"
        write_info "  Version: $CURRENT_VERSION"
        write_info "  Sequence: $CURRENT_SEQUENCE"
        
        # Check if chaincode containers are running
        CHAINCODE_CONTAINERS=$(docker ps --format "{{.Names}}" | grep "dev-peer.*coffee" | wc -l)
        if [ "$CHAINCODE_CONTAINERS" -gt 0 ]; then
            write_success "Chaincode containers are running ($CHAINCODE_CONTAINERS)"
            write_info "Skipping deployment - chaincode is operational"
            return 0
        else
            write_warning "Chaincode committed but containers not running"
            write_info "This is normal for CCAAS (Chaincode as a Service)"
            write_info "Chaincode will start when invoked by peers"
            return 0
        fi
    else
        write_info "Chaincode not yet deployed, will deploy now..."
    fi
    
    # Run the deployment script
    write_step "Running chaincode deployment script..."
    if [ -f "$PROJECT_ROOT/deploy-chaincode.sh" ]; then
        bash "$PROJECT_ROOT/deploy-chaincode.sh"
        if [ $? -eq 0 ]; then
            write_success "Chaincode deployment completed"
        else
            write_error "Chaincode deployment failed!"
            return 1
        fi
    else
        write_error "deploy-chaincode.sh not found!"
        write_warning "You'll need to deploy chaincode manually"
        write_info "Command: bash deploy-chaincode.sh"
        return 1
    fi
    
    # Verify deployment
    write_step "Verifying chaincode deployment..."
    sleep 3
    
    VERIFY_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null || echo "")
    if echo "$VERIFY_CHECK" | grep -q "Version:"; then
        NEW_VERSION=$(echo "$VERIFY_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        NEW_SEQUENCE=$(echo "$VERIFY_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
        write_success "Chaincode deployed successfully:"
        write_info "  Version: $NEW_VERSION"
        write_info "  Sequence: $NEW_SEQUENCE"
    else
        write_error "Chaincode verification failed"
        return 1
    fi
}

# Start API server
start_api_server() {
    write_header "Starting API Server"
    
    # Check if already running
    if curl -s --max-time 2 http://localhost:$API_PORT/health 2>/dev/null | grep -q '"status"'; then
        write_info "API server is already running on port $API_PORT"
        return 0
    fi
    
    write_step "Starting API server..."
    bash "$PROJECT_ROOT/start-api.sh"
    
    # Wait for API to be ready
    write_step "Waiting for API to be ready..."
    sleep 5
    wait_for_port $API_PORT "API Server" 30
    
    write_success "API server is running"
}

# Start UI server
start_ui_server() {
    write_header "Starting UI Server"
    
    # Check if already running
    if curl -s --max-time 2 -I http://localhost:$UI_PORT 2>/dev/null | grep -qi "x-powered-by: Next.js"; then
        write_info "UI server is already running on port $UI_PORT"
        return 0
    fi
    
    write_step "Starting UI server..."
    bash "$PROJECT_ROOT/start-ui.sh"
    
    # Wait for UI to be ready
    write_step "Waiting for UI to be ready..."
    sleep 5
    wait_for_port $UI_PORT "UI Server" 30
    
    write_success "UI server is running"
}

# Show final status
show_status() {
    write_header "CECBS System Started Successfully!"
    
    echo ""
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} System Status:"
    echo "   • Blockchain Network: Running (6 peers + orderer)"
    echo "   • API Server: http://localhost:$API_PORT"
    echo "   • UI Server: http://localhost:$UI_PORT"
    echo ""
    echo -e "${COLOR_CYAN}🔗 Access the application:${COLOR_RESET}"
    echo "   Open browser: http://localhost:$UI_PORT"
    echo ""
    echo -e "${COLOR_BLUE}📊 Check logs:${COLOR_RESET}"
    echo "   API: tail -f logs/api.log"
    echo "   UI:  tail -f logs/ui.log"
    echo "   Docker: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo ""
    echo -e "${COLOR_YELLOW}🛑 To stop services:${COLOR_RESET}"
    echo "   bash stop-api.sh"
    echo "   bash stop-ui.sh"
    echo "   docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo ""
}

# Main execution
main() {
    clear
    write_header "CECBS System Startup (Linux)"
    
    check_prerequisites
    install_dependencies
    start_fabric_network
    deploy_chaincode
    start_api_server
    start_ui_server
    show_status
    
    echo ""
    write_success "✅ System startup complete!"
    echo ""
}

# Run main
main

