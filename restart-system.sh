#!/bin/bash
#
# Quick Restart Script - Preserves all data
# Only restarts containers, keeps volumes intact
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

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

print_info() {
    echo -e "${YELLOW}ℹ${RESET} $1"
}

print_header "Quick System Restart (Data Preserved)"

print_step "Stopping Docker containers..."
cd "$PROJECT_ROOT"
docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
print_success "Containers stopped (volumes preserved)"

print_step "Starting Docker containers..."
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
print_success "Containers started"

print_step "Waiting for services (30 seconds)..."
sleep 30

print_step "Restarting API..."
bash restart-all.sh

echo ""
print_success "System restarted successfully!"
print_info "All data has been preserved"
echo ""
echo -e "${CYAN}Access URLs:${RESET}"
echo -e "  UI:  http://localhost:3000"
echo -e "  API: http://localhost:3001"
echo ""
