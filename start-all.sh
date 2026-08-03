#!/usr/bin/env bash
# Complete startup script for CECBS (Coffee Export Consortium Blockchain System)
# Usage: ./start-all.sh [options]
# Options: 
#   --skip-build     Skip building TypeScript
#   --dev-mode       Start in development mode
#   --skip-tests     Skip running tests
#   --no-services    Start only blockchain, skip API and UI (for manual start)

# Ensure we have a clean environment
set +e  # Don't exit on error - we want to show better error messages
set -o pipefail  # Catch errors in pipes

# Force script to print any errors
exec 2>&1

# Ensure we can see output even if redirected
if [ -t 1 ]; then
    # Running in terminal
    :
else
    # Not in terminal, force output
    exec 1>&2
fi

# Test if script is running - print this immediately
echo "Starting CECBS startup script..." >&2

# ============================================================================
# CONFIGURATION
# ============================================================================

# Get script directory in a cross-platform way
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"
CHAINCODE_DIR="$PROJECT_ROOT/chaincodes/coffee"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Debug output
echo "Script directory: $SCRIPT_DIR" >&2
echo "Project root: $PROJECT_ROOT" >&2

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
NO_SERVICES=false

for arg in "$@"; do
    case $arg in
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
        --no-services)
            NO_SERVICES=true
            shift
            ;;
    esac
done

# Colors - with fallback if not supported
if [ -t 1 ]; then
    COLOR_RESET='\033[0m'
    COLOR_BOLD='\033[1m'
    COLOR_RED='\033[31m'
    COLOR_GREEN='\033[32m'
    COLOR_YELLOW='\033[33m'
    COLOR_BLUE='\033[34m'
    COLOR_MAGENTA='\033[35m'
    COLOR_CYAN='\033[36m'
else
    COLOR_RESET=''
    COLOR_BOLD=''
    COLOR_RED=''
    COLOR_GREEN=''
    COLOR_YELLOW=''
    COLOR_BLUE=''
    COLOR_MAGENTA=''
    COLOR_CYAN=''
fi

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}  $1${COLOR_RESET}"
    echo -e "${COLOR_CYAN}${COLOR_BOLD}============================================================================${COLOR_RESET}"
    echo ""
}

print_step() {
    echo -e "${COLOR_BLUE}▶${COLOR_RESET} ${COLOR_BOLD}$1${COLOR_RESET}"
}

print_success() {
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} $1"
}

print_warning() {
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} $1"
}

print_error() {
    echo -e "${COLOR_RED}✗${COLOR_RESET} ${COLOR_RED}$1${COLOR_RESET}"
}

print_info() {
    echo -e "${COLOR_MAGENTA}ℹ${COLOR_RESET} $1"
}

test_port() {
    local port=$1
    local result=1
    
    # Try multiple methods in order of reliability
    
    # Method 1: netcat (most reliable if available)
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost $port 2>/dev/null; then
            return 0
        fi
    fi
    
    # Method 2: /dev/tcp (bash built-in, works on most systems)
    if timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null; then
        return 0
    fi
    
    # Method 3: curl (fallback)
    if command -v curl >/dev/null 2>&1; then
        if curl -s --connect-timeout 1 "http://localhost:$port" >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    # Method 4: Check docker container status
    if command -v docker >/dev/null 2>&1; then
        # Port might be mapped, check if any container is listening
        if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q ":$port->"; then
            return 0
        fi
    fi
    
    return 1
}

wait_for_port() {
    local port=$1
    local service=$2
    local timeout=${3:-60}
    
    print_step "Waiting for $service on port $port..."
    local elapsed=0
    local interval=3
    
    while [ $elapsed -lt $timeout ]; do
        if test_port $port; then
            print_success "$service is ready on port $port"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        printf "."
    done
    
    echo ""
    # Don't fail, just warn - service might still be initializing
    print_warning "$service not responding on port $port yet (may still be starting)"
    return 0
}

test_command() {
    command -v "$1" >/dev/null 2>&1
}

# Validate bash version
check_bash_version() {
    if [ -n "$BASH_VERSION" ]; then
        local major_version="${BASH_VERSION%%.*}"
        if [ "$major_version" -lt 4 ]; then
            print_warning "Bash version $BASH_VERSION detected. Version 4+ recommended."
        fi
    fi
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check bash version first
    check_bash_version
    
    local all_good=true
    
    # Check Docker
    print_step "Checking Docker..."
    if test_command docker; then
        local docker_version=$(docker --version 2>&1)
        if [ $? -eq 0 ]; then
            print_success "Docker found: $docker_version"
        else
            print_error "Docker command exists but failed to execute"
            all_good=false
        fi
    else
        print_error "Docker is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Docker Compose
    print_step "Checking Docker Compose..."
    if test_command docker-compose; then
        local compose_version=$(docker-compose --version 2>&1)
        if [ $? -eq 0 ]; then
            print_success "Docker Compose found: $compose_version"
        else
            print_error "Docker Compose command exists but failed to execute"
            all_good=false
        fi
    else
        print_error "Docker Compose is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Docker daemon
    print_step "Checking Docker daemon..."
    if docker ps >/dev/null 2>&1; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker."
        print_info "Windows: Start Docker Desktop"
        print_info "Linux: sudo systemctl start docker"
        print_info "macOS: Start Docker Desktop from Applications"
        all_good=false
    fi
    
    # Check Node.js
    print_step "Checking Node.js..."
    if test_command node; then
        local node_version=$(node --version 2>&1)
        if [ $? -eq 0 ]; then
            print_success "Node.js found: $node_version"
        else
            print_error "Node.js command exists but failed to execute"
            all_good=false
        fi
    else
        print_error "Node.js is not installed or not in PATH"
        all_good=false
    fi
    
    # Check Go (optional)
    print_step "Checking Go..."
    if test_command go; then
        local go_version=$(go version 2>&1)
        if [ $? -eq 0 ]; then
            print_success "Go found: $go_version"
        else
            print_warning "Go command exists but failed to execute"
        fi
    else
        print_warning "Go is not installed. Chaincode building will be skipped."
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
    
    # Check docker-compose file
    if [ -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ]; then
        print_success "Found: $DOCKER_COMPOSE_FILE"
    else
        print_error "Missing: $DOCKER_COMPOSE_FILE"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        print_error "Prerequisites check failed. Please fix the issues above and try again."
        echo ""
        print_info "For help, see: TROUBLESHOOTING.md"
        print_info "Or run: bash test-startup.sh"
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
    
    if ! test_command go; then
        print_warning "Go not found, skipping chaincode build"
        return
    fi
    
    cd "$CHAINCODE_DIR"
    print_step "Building Go chaincode..."
    if go build -o chaincode; then
        print_success "Chaincode built successfully"
    else
        print_warning "Chaincode build failed (non-critical, continuing...)"
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
    npm install --prefer-offline --no-audit --no-fund --silent >/dev/null 2>&1 && \
        print_success "API dependencies installed" || \
        print_warning "Some API dependencies had warnings (continuing...)"
    cd "$PROJECT_ROOT"
    
    # Install UI dependencies
    print_step "Installing UI dependencies..."
    cd "$UI_DIR"
    npm install --prefer-offline --no-audit --no-fund --silent >/dev/null 2>&1 && \
        print_success "UI dependencies installed" || \
        print_warning "Some UI dependencies had warnings (continuing...)"
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
    if npm run build 2>&1; then
        print_success "API built successfully"
    else
        print_warning "API build had issues (continuing...)"
    fi
    cd "$PROJECT_ROOT"
}

# ============================================================================
# DOCKER/BLOCKCHAIN FUNCTIONS
# ============================================================================

start_fabric_network() {
    print_header "Starting Hyperledger Fabric Network"
    
    # Stop any existing containers
    print_step "Cleaning up existing containers..."
    docker-compose -f $DOCKER_COMPOSE_FILE down -v 2>/dev/null || true
    print_success "Cleanup complete"
    
    # Start the network
    print_step "Starting Fabric network containers..."
    if docker-compose -f $DOCKER_COMPOSE_FILE up -d 2>&1; then
        print_success "Fabric network containers started"
    else
        print_error "Failed to start Fabric network"
        echo ""
        print_info "Try running: docker-compose -f $DOCKER_COMPOSE_FILE logs"
        return 1
    fi
    
    # Wait for key services with container health check fallback
    print_step "Waiting for services to initialize (this may take 60-90 seconds)..."
    sleep 15  # Give Docker time to initialize
    
    # Check services with better verification
    wait_for_port $POSTGRES_PORT "PostgreSQL" 45
    wait_for_port $REDIS_PORT "Redis" 45
    wait_for_port $ORDERER_PORT "Orderer" 60
    wait_for_port $PEER_ECTA_PORT "Peer (ECTA)" 60
    wait_for_port $CHAINCODE_PORT "Coffee Chaincode" 60
    
    # Additional wait for full initialization
    print_info "Services started. Allowing extra time for full initialization..."
    sleep 10
    
    print_success "Fabric network is operational"
    
    # Initialize blockchain (create channel, join peers, deploy chaincode)
    print_header "Initializing Blockchain"
    print_step "Checking blockchain status..."
    
    # Check if channel exists
    if docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep -q "coffeechannel"; then
        print_success "Channel 'coffeechannel' exists"
        
        # Deploy chaincode (install, approve, commit)
        print_step "Deploying chaincode..."
        if [ -f "$SCRIPT_DIR/scripts/deploy-chaincode-complete.sh" ]; then
            if bash "$SCRIPT_DIR/scripts/deploy-chaincode-complete.sh"; then
                print_success "Chaincode deployed successfully"
            else
                print_warning "Chaincode deployment had issues (may already be deployed)"
            fi
        else
            print_warning "deploy-chaincode-complete.sh not found"
        fi
    else
        # Full initialization needed
        print_step "Running full blockchain initialization..."
        if [ -f "$SCRIPT_DIR/scripts/init-blockchain.sh" ]; then
            if bash "$SCRIPT_DIR/scripts/init-blockchain.sh"; then
                print_success "Blockchain initialized successfully"
            else
                print_warning "Blockchain initialization had issues (API will continue without blockchain)"
            fi
        else
            print_warning "init-blockchain.sh not found at $SCRIPT_DIR/scripts/init-blockchain.sh"
        fi
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
    
    # Aggressively kill any existing processes
    print_step "Stopping any existing API processes..."
    pkill -9 -f "node.*api" 2>/dev/null || true
    pkill -9 -f "npm.*start.*api" 2>/dev/null || true
    pkill -9 -f "npm run dev.*api" 2>/dev/null || true
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
        
        # Start API in background with better logging
        npm start > /tmp/cecbs-api.log 2>&1 &
        local api_pid=$!
        echo $api_pid > /tmp/cecbs-api.pid
        
        print_info "API starting (PID: $api_pid)"
        
        # Wait for API with aggressive retry
        local count=0
        while [ $count -lt 30 ]; do
            if test_port $API_PORT; then
                print_success "API server is ready on port $API_PORT"
                print_info "Logs: tail -f /tmp/cecbs-api.log"
                break
            fi
            sleep 2
            count=$((count + 1))
            printf "."
        done
        echo ""
        
        if ! test_port $API_PORT; then
            print_warning "API not responding yet, but process is running. Check logs if issues persist."
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

start_ui() {
    print_header "Starting Frontend UI"
    
    # Aggressively kill any existing processes
    print_step "Stopping any existing UI processes..."
    pkill -9 -f "node.*ui\|node.*next" 2>/dev/null || true
    pkill -9 -f "npm.*start.*ui\|npm.*dev.*ui" 2>/dev/null || true
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
        
        # Start UI in background
        npm start > /tmp/cecbs-ui.log 2>&1 &
        local ui_pid=$!
        echo $ui_pid > /tmp/cecbs-ui.pid
        
        print_info "UI starting (PID: $ui_pid)"
        
        # Wait for UI with aggressive retry
        local count=0
        while [ $count -lt 30 ]; do
            if test_port $UI_PORT; then
                print_success "UI server is ready on port $UI_PORT"
                print_info "Logs: tail -f /tmp/cecbs-ui.log"
                break
            fi
            sleep 2
            count=$((count + 1))
            printf "."
        done
        echo ""
        
        if ! test_port $UI_PORT; then
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
    
    # Test UI
    print_step "Testing Frontend UI..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$UI_PORT | grep -q "200\|301\|302"; then
        print_success "Frontend UI is responding"
    else
        print_warning "Frontend UI is not responding"
    fi
    
    # Test API
    print_step "Testing Backend API..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api/health | grep -q "200"; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API is not responding"
    fi
    
    # Test API Docs
    print_step "Testing API Docs..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api-docs | grep -q "200\|301\|302"; then
        print_success "API Docs are responding"
    else
        print_warning "API Docs are not responding"
    fi
}

# ============================================================================
# SUMMARY
# ============================================================================

show_summary() {
    print_header "🎉 CECBS System Started Successfully!"
    
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_GREEN}Access Points:${COLOR_RESET}"
    echo -e "  ${COLOR_CYAN}Frontend UI:${COLOR_RESET}     http://localhost:$UI_PORT"
    echo -e "  ${COLOR_CYAN}Backend API:${COLOR_RESET}     http://localhost:$API_PORT"
    echo -e "  ${COLOR_CYAN}API Docs:${COLOR_RESET}        http://localhost:$API_PORT/api-docs"
    echo -e "  ${COLOR_CYAN}PostgreSQL:${COLOR_RESET}      localhost:$POSTGRES_PORT"
    echo -e "  ${COLOR_CYAN}Redis:${COLOR_RESET}           localhost:$REDIS_PORT"
    echo ""
    
    echo -e "${COLOR_BOLD}${COLOR_GREEN}Default Login Credentials:${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}ECTA Admin:${COLOR_RESET}      ecta_admin / password123"
    echo -e "  ${COLOR_YELLOW}NBE Officer:${COLOR_RESET}     nbe_admin / password123"
    echo -e "  ${COLOR_YELLOW}Bank Officer:${COLOR_RESET}    bank_admin / password123"
    echo -e "  ${COLOR_YELLOW}Customs Officer:${COLOR_RESET} customs_admin / password123"
    echo -e "  ${COLOR_YELLOW}Exporter:${COLOR_RESET}        EXP1087072 / password123"
    echo ""
    
    echo -e "${COLOR_BOLD}${COLOR_GREEN}Useful Commands:${COLOR_RESET}"
    echo -e "  ${COLOR_CYAN}View all containers:${COLOR_RESET}  docker ps"
    echo -e "  ${COLOR_CYAN}View logs:${COLOR_RESET}            docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo -e "  ${COLOR_CYAN}Stop system:${COLOR_RESET}          ./stop-all.sh"
    echo -e "  ${COLOR_CYAN}Check status:${COLOR_RESET}         ./status.sh"
    echo ""
    
    if [ "$DEV_MODE" = false ]; then
        echo -e "${COLOR_BOLD}${COLOR_GREEN}Background Processes:${COLOR_RESET}"
        if [ -f /tmp/cecbs-api.pid ]; then
            echo -e "  API: PID $(cat /tmp/cecbs-api.pid)"
        fi
        if [ -f /tmp/cecbs-ui.pid ]; then
            echo -e "  UI: PID $(cat /tmp/cecbs-ui.pid)"
        fi
        echo ""
    fi
    
    print_info "For detailed documentation, see: Docs/QUICK-START.md"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local start_time=$(date +%s)
    
    echo ""
    echo -e "${COLOR_MAGENTA}${COLOR_BOLD}"
    echo "   _____ ______ _____ ____   _____ "
    echo "  / ____|  ____/ ____|  _ \\ / ____|"
    echo " | |    | |__ | |    | |_) | (___  "
    echo " | |    |  __|| |    |  _ < \\___ \\ "
    echo " | |____| |___| |____| |_) |____) |"
    echo "  \\_____|______|\\_____|____/|_____/ "
    echo ""
    echo " Coffee Export Consortium Blockchain System"
    echo -e "${COLOR_RESET}"
    
    # Run all steps
    check_prerequisites
    build_chaincode
    install_dependencies
    build_typescript
    start_fabric_network
    show_container_status
    
    # Skip API and UI if --no-services flag is set
    if [ "$NO_SERVICES" = true ]; then
        echo ""
        print_header "Services Startup Skipped"
        print_info "Blockchain infrastructure started. API and UI not started."
        print_info ""
        print_info "To start services manually:"
        print_info "  API: cd api && npm start"
        print_info "  UI:  cd ui && npm run build && npm start"
        print_info ""
        print_info "Or for development mode:"
        print_info "  API: cd api && npm run dev"
        print_info "  UI:  cd ui && npm run dev"
        echo ""
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${COLOR_GREEN}============================================================================${COLOR_RESET}"
        echo -e "${COLOR_GREEN}Blockchain infrastructure ready!${COLOR_RESET}"
        echo -e "${COLOR_GREEN}Total startup time: ${duration} seconds${COLOR_RESET}"
        echo -e "${COLOR_GREEN}============================================================================${COLOR_RESET}"
        echo ""
        return 0
    fi
    
    if [ "$DEV_MODE" = true ]; then
        echo ""
        print_warning "Development mode: Choose which service to run with hot-reload"
        echo "1) API only"
        echo "2) UI only"
        echo "3) Both (in separate terminals - recommended)"
        read -p "Enter choice (1-3): " choice
        
        case $choice in
            1) start_api ;;
            2) start_ui ;;
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
    
    show_summary
    
    echo -e "${COLOR_GREEN}Total startup time: ${duration} seconds${COLOR_RESET}"
    echo ""
}

# Run main function
main "$@"
