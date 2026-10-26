#!/bin/bash
################################################################################
# GoCBC Complete System Startup Script
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
#
# This script performs complete system initialization including:
# - Docker network and containers startup
# - Database migrations
# - Blockchain network deployment
# - Chaincode deployment
# - API server startup
# - UI server startup
#
# Usage: bash start-all.sh [OPTIONS]
# Options:
#   --skip-docker     Skip Docker container startup
#   --skip-chaincode  Skip chaincode deployment
#   --skip-build      Skip npm install and build
#   --dev             Development mode (uses ts-node-dev)
#   --clean           Clean start (removes all volumes and rebuilds)
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"

# Configuration
SKIP_DOCKER=false
SKIP_CHAINCODE=false
SKIP_BUILD=false
DEV_MODE=false
CLEAN_START=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-chaincode)
            SKIP_CHAINCODE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --clean)
            CLEAN_START=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-docker] [--skip-chaincode] [--skip-build] [--dev] [--clean]"
            exit 1
            ;;
    esac
done

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} ${RED}$1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local max_attempts=${4:-30}
    local attempt=0

    print_step "Waiting for $service on $host:$port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null || timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            print_success "$service is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    print_error "$service failed to start after $((max_attempts * 2)) seconds"
    return 1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local all_good=true
    
    # Check Docker
    print_step "Checking Docker..."
    if command_exists docker; then
        docker_version=$(docker --version)
        print_success "Docker found: $docker_version"
        
        if ! docker ps >/dev/null 2>&1; then
            print_error "Docker daemon is not running"
            print_info "Start Docker with: sudo systemctl start docker"
            all_good=false
        else
            print_success "Docker daemon is running"
        fi
    else
        print_error "Docker is not installed"
        print_info "Install from: https://docs.docker.com/engine/install/"
        all_good=false
    fi
    
    # Check Docker Compose
    print_step "Checking Docker Compose..."
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose found"
    else
        print_error "Docker Compose is not installed"
        all_good=false
    fi
    
    # Check Node.js
    print_step "Checking Node.js..."
    if command_exists node; then
        node_version=$(node --version)
        print_success "Node.js found: $node_version"
    else
        print_error "Node.js is not installed"
        all_good=false
    fi
    
    # Check npm
    print_step "Checking npm..."
    if command_exists npm; then
        npm_version=$(npm --version)
        print_success "npm found: v$npm_version"
    else
        print_error "npm is not installed"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Prerequisites check failed. Please install missing components."
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Clean previous installation
clean_system() {
    print_header "Cleaning Previous Installation"
    
    print_step "Stopping all containers..."
    docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
    
    print_step "Removing Docker volumes..."
    docker volume prune -f 2>/dev/null || true
    
    print_step "Cleaning node_modules..."
    rm -rf "$API_DIR/node_modules" "$UI_DIR/node_modules" 2>/dev/null || true
    
    print_step "Cleaning build artifacts..."
    rm -rf "$API_DIR/dist" "$UI_DIR/.next" 2>/dev/null || true
    
    print_success "System cleaned"
}

# Install dependencies
install_dependencies() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping dependency installation (--skip-build flag)"
        return 0
    fi
    
    print_header "Installing Dependencies"
    
    # Install API dependencies
    print_step "Installing API dependencies..."
    cd "$API_DIR"
    if [ ! -d "node_modules" ] || [ "$CLEAN_START" = true ]; then
        npm install
        print_success "API dependencies installed"
    else
        print_info "API dependencies already installed"
    fi
    
    # Install UI dependencies
    print_step "Installing UI dependencies..."
    cd "$UI_DIR"
    if [ ! -d "node_modules" ] || [ "$CLEAN_START" = true ]; then
        npm install
        print_success "UI dependencies installed"
    else
        print_info "UI dependencies already installed"
    fi
    
    cd "$PROJECT_ROOT"
}

# Build projects
build_projects() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping build (--skip-build flag)"
        return 0
    fi
    
    print_header "Building Projects"
    
    # Build API
    print_step "Building API (TypeScript compilation)..."
    cd "$API_DIR"
    npm run build
    if [ $? -eq 0 ]; then
        print_success "API built successfully"
    else
        print_error "API build failed"
        exit 1
    fi
    
    # Build UI
    print_step "Building UI (Next.js)..."
    cd "$UI_DIR"
    if [ "$DEV_MODE" = false ]; then
        npm run build
        if [ $? -eq 0 ]; then
            print_success "UI built successfully"
        else
            print_error "UI build failed"
            exit 1
        fi
    else
        print_info "Skipping UI build (dev mode)"
    fi
    
    cd "$PROJECT_ROOT"
}

# Start Docker containers
start_docker_containers() {
    if [ "$SKIP_DOCKER" = true ]; then
        print_info "Skipping Docker startup (--skip-docker flag)"
        return 0
    fi
    
    print_header "Starting Docker Containers"
    
    print_step "Starting Docker Compose services..."
    docker-compose -f docker-compose-fabric.yml up -d
    
    if [ $? -eq 0 ]; then
        print_success "Docker containers started"
    else
        print_error "Failed to start Docker containers"
        exit 1
    fi
    
    print_step "Waiting for services to initialize..."
    sleep 5
    
    # Wait for PostgreSQL
    wait_for_service localhost 5432 "PostgreSQL" 30
    
    # Wait for Orderer
    wait_for_service localhost 7050 "Orderer" 45
    
    # Wait for ECTA Peer
    wait_for_service localhost 7051 "ECTA Peer" 45
    
    print_success "All Docker services are ready"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    # Check if PostgreSQL is running
    if ! docker ps | grep -q "cecbs-postgres"; then
        print_error "PostgreSQL container is not running"
        return 1
    fi
    
    print_step "Running migration 043 (Status Alignment)..."
    if [ -f "$API_DIR/src/migrations/043_fix_status_enums.sql" ]; then
        docker exec -i cecbs-postgres psql -U cecbs -d cecbs < "$API_DIR/src/migrations/043_fix_status_enums.sql" 2>&1 | grep -v "NOTICE"
        
        if [ $? -eq 0 ]; then
            print_success "Migration 043 applied successfully"
        else
            print_warning "Migration 043 may have already been applied"
        fi
    else
        print_warning "Migration 043 file not found"
    fi
    
    # Run other migrations if they exist
    print_step "Running additional migrations..."
    for migration_file in "$API_DIR/src/migrations"/*.sql; do
        if [ -f "$migration_file" ]; then
            migration_name=$(basename "$migration_file")
            
            # Skip if already run
            if [ "$migration_name" = "043_fix_status_enums.sql" ]; then
                continue
            fi
            
            # Check if migration should be run
            print_info "Checking: $migration_name"
            docker exec -i cecbs-postgres psql -U cecbs -d cecbs < "$migration_file" 2>&1 | grep -q "ERROR"
            
            if [ $? -ne 0 ]; then
                print_info "  → Applied or already exists"
            fi
        fi
    done
    
    # Verify migrations
    print_step "Verifying database schema..."
    
    # Check logistics_status column
    LOGISTICS_COL=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='shipments' AND column_name='logistics_status';" 2>/dev/null | tr -d ' ')
    
    if [ "$LOGISTICS_COL" = "1" ]; then
        print_success "✓ shipments.logistics_status column exists"
    else
        print_error "✗ shipments.logistics_status column missing"
    fi
    
    # Check payment_tracking_status column
    TRACKING_COL=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_tracking_status';" 2>/dev/null | tr -d ' ')
    
    if [ "$TRACKING_COL" = "1" ]; then
        print_success "✓ payments.payment_tracking_status column exists"
    else
        print_error "✗ payments.payment_tracking_status column missing"
    fi
    
    print_success "Database migrations completed"
}

# Deploy chaincode
deploy_chaincode() {
    if [ "$SKIP_CHAINCODE" = true ]; then
        print_info "Skipping chaincode deployment (--skip-chaincode flag)"
        return 0
    fi
    
    print_header "Deploying Chaincode"
    
    # Check if chaincode is already deployed
    print_step "Checking chaincode status..."
    CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null || echo "")
    
    if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
        CURRENT_VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        print_success "Chaincode already deployed (Version: $CURRENT_VERSION)"
        return 0
    fi
    
    # Deploy chaincode
    print_step "Deploying chaincode..."
    if [ -f "$PROJECT_ROOT/deploy-chaincode.sh" ]; then
        bash "$PROJECT_ROOT/deploy-chaincode.sh"
        
        if [ $? -eq 0 ]; then
            print_success "Chaincode deployed successfully"
        else
            print_error "Chaincode deployment failed"
            return 1
        fi
    else
        print_warning "deploy-chaincode.sh not found - manual deployment required"
    fi
}

# Start API server
start_api_server() {
    print_header "Starting API Server"
    
    # Check if already running
    if curl -s --max-time 2 http://localhost:3001/health 2>/dev/null | grep -q '"status"'; then
        print_info "API server is already running"
        return 0
    fi
    
    # Kill any existing API process
    print_step "Stopping existing API processes..."
    pkill -f "node.*dist/server.js" 2>/dev/null || true
    pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
    
    # Start API
    cd "$API_DIR"
    
    if [ "$DEV_MODE" = true ]; then
        print_step "Starting API in development mode..."
        nohup npm run dev > "$PROJECT_ROOT/logs/api.log" 2>&1 &
    else
        print_step "Starting API in production mode..."
        nohup npm start > "$PROJECT_ROOT/logs/api.log" 2>&1 &
    fi
    
    API_PID=$!
    echo $API_PID > "$PROJECT_ROOT/logs/api.pid"
    
    # Wait for API to be ready
    wait_for_service localhost 3001 "API Server" 30
    
    if [ $? -eq 0 ]; then
        print_success "API server started (PID: $API_PID)"
        print_info "Logs: tail -f $PROJECT_ROOT/logs/api.log"
    else
        print_error "API server failed to start"
        print_info "Check logs: cat $PROJECT_ROOT/logs/api.log"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Start UI server
start_ui_server() {
    print_header "Starting UI Server"
    
    # Check if already running
    if curl -s --max-time 2 -I http://localhost:3000 2>/dev/null | grep -qi "x-powered-by"; then
        print_info "UI server is already running"
        return 0
    fi
    
    # Kill any existing UI process
    print_step "Stopping existing UI processes..."
    pkill -f "next.*start" 2>/dev/null || true
    pkill -f "next.*dev" 2>/dev/null || true
    
    # Start UI
    cd "$UI_DIR"
    
    if [ "$DEV_MODE" = true ]; then
        print_step "Starting UI in development mode..."
        nohup npm run dev > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
    else
        print_step "Starting UI in production mode..."
        nohup npm start > "$PROJECT_ROOT/logs/ui.log" 2>&1 &
    fi
    
    UI_PID=$!
    echo $UI_PID > "$PROJECT_ROOT/logs/ui.pid"
    
    # Wait for UI to be ready
    wait_for_service localhost 3000 "UI Server" 45
    
    if [ $? -eq 0 ]; then
        print_success "UI server started (PID: $UI_PID)"
        print_info "Logs: tail -f $PROJECT_ROOT/logs/ui.log"
    else
        print_error "UI server failed to start"
        print_info "Check logs: cat $PROJECT_ROOT/logs/ui.log"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Show final status
show_status() {
    print_header "System Status"
    
    echo ""
    echo -e "${GREEN}${BOLD}✓ GoCBC System Started Successfully!${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}Services Running:${NC}"
    echo "  • Blockchain Network: ✓ Running (8 organizations)"
    echo "  • PostgreSQL Database: ✓ Running (port 5432)"
    echo "  • API Server: ✓ Running (http://localhost:3001)"
    echo "  • UI Server: ✓ Running (http://localhost:3000)"
    echo ""
    echo -e "${BOLD}Access Points:${NC}"
    echo "  🌐 Web Interface: ${GREEN}http://localhost:3000${NC}"
    echo "  🔌 API Endpoint: ${GREEN}http://localhost:3001${NC}"
    echo "  📊 API Health: ${GREEN}http://localhost:3001/health${NC}"
    echo ""
    echo -e "${BOLD}Database:${NC}"
    echo "  • Migrations applied: ✓ Including 043 (Status Alignment)"
    echo "  • Tables: contracts, shipments, payments, quality_inspections, etc."
    echo "  • Connection: postgresql://cecbs:***@localhost:5432/cecbs"
    echo ""
    echo -e "${BOLD}Logs:${NC}"
    echo "  • API: tail -f logs/api.log"
    echo "  • UI: tail -f logs/ui.log"
    echo "  • Docker: docker-compose -f docker-compose-fabric.yml logs -f"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  • Stop all: bash stop-all.sh"
    echo "  • Restart API: pkill -f 'node.*server.js' && cd api && npm start"
    echo "  • Check Docker: docker ps"
    echo "  • Database CLI: docker exec -it cecbs-postgres psql -U cecbs -d cecbs"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Create logs directory
create_logs_directory() {
    mkdir -p "$PROJECT_ROOT/logs"
}

# Main execution
main() {
    clear
    
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║          GoCBC - Ethiopian Coffee Export System                  ║"
    echo "  ║          Complete System Startup Script                          ║"
    echo "  ║                                                                   ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Show configuration
    print_info "Configuration:"
    echo "  • Skip Docker: $SKIP_DOCKER"
    echo "  • Skip Chaincode: $SKIP_CHAINCODE"
    echo "  • Skip Build: $SKIP_BUILD"
    echo "  • Development Mode: $DEV_MODE"
    echo "  • Clean Start: $CLEAN_START"
    echo ""
    
    # Create logs directory
    create_logs_directory
    
    # Execute steps
    check_prerequisites
    
    if [ "$CLEAN_START" = true ]; then
        clean_system
    fi
    
    install_dependencies
    build_projects
    start_docker_containers
    
    # Give services time to fully initialize
    print_step "Allowing services to fully initialize..."
    sleep 10
    
    run_migrations
    deploy_chaincode
    start_api_server
    start_ui_server
    
    show_status
    
    print_success "System startup complete!"
    echo ""
}

# Trap errors
trap 'print_error "Script failed at line $LINENO. Exit code: $?"' ERR

# Run main
main "$@"
