#!/bin/bash
#
# Complete shutdown script for CECBS (Coffee Export Consortium Blockchain System)
# This script stops all components in the correct order:
# 1. Frontend UI
# 2. Backend API
# 3. CouchDB Sync Service
# 4. Chaincode Container
# 5. Hyperledger Fabric Network (peers, orderer)
# 6. PostgreSQL & Redis (databases)
#
# Usage:
#   ./stop-all.sh                    # Stop all services
#   ./stop-all.sh --keep-data        # Stop services but preserve data volumes
#   ./stop-all.sh --clean            # Stop and remove all data (full cleanup)

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Parse arguments
KEEP_DATA=false
CLEAN_ALL=false

for arg in "$@"; do
    case $arg in
        --keep-data)
            KEEP_DATA=true
            ;;
        --clean)
            CLEAN_ALL=true
            ;;
        *)
            echo "Unknown argument: $arg"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --keep-data     Stop services but keep all data volumes"
            echo "  --clean         Stop services and remove all data (full cleanup)"
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
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# ============================================================================
# BANNER
# ============================================================================

echo ""
echo -e "${CYAN}"
cat << "EOF"
   _____ ______ _____ ____   _____ 
  / ____|  ____/ ____|  _ \ / ____|
 | |    | |__ | |    | |_) | (___  
 | |    |  __|| |    |  _ < \___ \ 
 | |____| |___| |____| |_) |____) |
  \_____|______\_____|____/|_____/ 

 Coffee Export Consortium Blockchain System
 SHUTDOWN SEQUENCE
EOF
echo -e "${NC}"

# ============================================================================
# STOP UI
# ============================================================================

print_header "Stopping Frontend UI"

if pgrep -f "next dev" > /dev/null || pgrep -f "node.*ui" > /dev/null; then
    print_step "Stopping Next.js UI process..."
    pkill -f "next dev" || true
    pkill -f "node.*ui" || true
    sleep 2
    print_success "UI stopped"
else
    print_info "UI is not running"
fi

# ============================================================================
# STOP API
# ============================================================================

print_header "Stopping Backend API"

if pgrep -f "tsx.*api" > /dev/null || pgrep -f "node.*api" > /dev/null; then
    print_step "Stopping API process..."
    pkill -f "tsx.*api" || true
    pkill -f "node.*api" || true
    sleep 2
    print_success "API stopped"
else
    print_info "API is not running"
fi

# ============================================================================
# STOP SYNC SERVICE
# ============================================================================

print_header "Stopping CouchDB Sync Service"

if pgrep -f "couchdb-sync-service" > /dev/null; then
    print_step "Stopping sync service..."
    pkill -f "couchdb-sync-service" || true
    sleep 1
    print_success "Sync service stopped"
else
    print_info "Sync service is not running"
fi

# ============================================================================
# STOP CHAINCODE CONTAINER
# ============================================================================

print_header "Stopping Chaincode Container"

if docker ps -q -f name=coffee-chaincode > /dev/null 2>&1; then
    print_step "Stopping coffee-chaincode container..."
    docker stop coffee-chaincode 2>/dev/null || true
    docker rm coffee-chaincode 2>/dev/null || true
    print_success "Chaincode container stopped"
else
    print_info "Chaincode container is not running"
fi

# ============================================================================
# STOP FABRIC NETWORK
# ============================================================================

print_header "Stopping Hyperledger Fabric Network"

cd "$PROJECT_ROOT"

if [ "$CLEAN_ALL" = true ]; then
    print_step "Stopping all containers and removing volumes..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
    print_success "Fabric network stopped and volumes removed"
elif [ "$KEEP_DATA" = true ]; then
    print_step "Stopping all containers (keeping data volumes)..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop
    print_success "Fabric network stopped (data preserved)"
else
    print_step "Stopping all containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    print_success "Fabric network stopped"
fi

# ============================================================================
# CLEANUP ORPHANED CONTAINERS
# ============================================================================

print_header "Cleaning Up"

print_step "Checking for orphaned containers..."
ORPHANED=$(docker ps -a -f "network=cecbs-network" --format "{{.Names}}" 2>/dev/null | grep -v "^$" | wc -l)

if [ "$ORPHANED" -gt 0 ]; then
    print_warning "Found $ORPHANED orphaned container(s)"
    docker ps -a -f "network=cecbs-network" --format "{{.Names}}" | while read container; do
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    done
    print_success "Orphaned containers removed"
else
    print_info "No orphaned containers found"
fi

# ============================================================================
# OPTIONAL: FULL CLEANUP
# ============================================================================

if [ "$CLEAN_ALL" = true ]; then
    print_header "Full Cleanup"
    
    print_step "Removing Docker network..."
    docker network rm cecbs-network 2>/dev/null || print_info "Network already removed"
    
    print_step "Removing chaincode image..."
    docker rmi coffee-chaincode:latest 2>/dev/null || print_info "Image already removed"
    
    print_step "Removing unused volumes..."
    docker volume prune -f > /dev/null 2>&1
    
    print_success "Full cleanup completed"
fi

# ============================================================================
# SUMMARY
# ============================================================================

print_header "Shutdown Complete"

if [ "$CLEAN_ALL" = true ]; then
    print_success "All services stopped and data removed"
    print_info "To restart: ./start-all.sh"
elif [ "$KEEP_DATA" = true ]; then
    print_success "All services stopped (data preserved)"
    print_info "To restart: docker-compose -f $DOCKER_COMPOSE_FILE start && ./start-all.sh --skip-build"
else
    print_success "All services stopped"
    print_info "To restart: ./start-all.sh"
fi

echo ""
echo -e "${GREEN}System shutdown successful!${NC}"
echo ""
