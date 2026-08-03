#!/bin/bash
#
# Stop script for CECBS (Coffee Export Consortium Blockchain System)
# Stops all running components gracefully

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DOCKER_COMPOSE_FILE="docker-compose-fabric.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
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
    echo -e "${CYAN}▶${RESET} ${BOLD}$1${RESET}"
}

print_success() {
    echo -e "${GREEN}✓${RESET} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${RESET} $1"
}

print_header "Stopping CECBS System"

# Stop Node.js processes
print_step "Stopping Node.js processes..."
if [ -f /tmp/cecbs-api.pid ]; then
    api_pid=$(cat /tmp/cecbs-api.pid)
    if kill -0 "$api_pid" 2>/dev/null; then
        kill "$api_pid" 2>/dev/null || true
        print_success "Stopped API (PID: $api_pid)"
    fi
    rm /tmp/cecbs-api.pid
fi

if [ -f /tmp/cecbs-ui.pid ]; then
    ui_pid=$(cat /tmp/cecbs-ui.pid)
    if kill -0 "$ui_pid" 2>/dev/null; then
        kill "$ui_pid" 2>/dev/null || true
        print_success "Stopped UI (PID: $ui_pid)"
    fi
    rm /tmp/cecbs-ui.pid
fi

# Fallback: kill any remaining node processes
pkill -f "node.*api" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
print_success "All Node.js processes stopped"

# Stop Docker containers
print_step "Stopping Docker containers..."
cd "$PROJECT_ROOT"
docker-compose -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true
print_success "All containers stopped and removed"

# Clean up logs
print_step "Cleaning up log files..."
rm -f /tmp/cecbs-api.log /tmp/cecbs-ui.log
print_success "Log files cleaned"

echo ""
print_success "CECBS system stopped successfully!"
echo ""
