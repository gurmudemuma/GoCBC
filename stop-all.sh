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

# Stop Node.js processes and free ports
print_step "Stopping Node.js processes and freeing ports..."
bash kill-ports.sh
print_success "All Node.js processes stopped and ports freed"

# Stop CouchDB sync service
print_step "Stopping CouchDB → PostgreSQL sync service..."
if [ -f "$PROJECT_ROOT/sync-service/sync-service.pid" ]; then
    SYNC_PID=$(cat "$PROJECT_ROOT/sync-service/sync-service.pid")
    if ps -p $SYNC_PID > /dev/null 2>&1; then
        kill $SYNC_PID 2>/dev/null || true
        rm "$PROJECT_ROOT/sync-service/sync-service.pid"
        print_success "Sync service stopped (PID: $SYNC_PID)"
    else
        print_warning "Sync service was not running"
        rm "$PROJECT_ROOT/sync-service/sync-service.pid"
    fi
else
    # Try to find by process name
    SYNC_PIDS=$(ps aux | grep "couchdb-postgres-sync.js --watch" | grep -v grep | awk '{print $2}' || true)
    if [ ! -z "$SYNC_PIDS" ]; then
        kill $SYNC_PIDS 2>/dev/null || true
        print_success "Sync service stopped"
    else
        print_warning "Sync service was not running"
    fi
fi

# Stop Docker containers
print_step "Stopping Docker containers..."
cd "$PROJECT_ROOT"
docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
print_success "All containers stopped (data volumes preserved)"

# Clean up logs
print_step "Cleaning up log files..."
rm -f /tmp/cecbs-api.log /tmp/cecbs-ui.log
print_success "Log files cleaned"

echo ""
print_success "CECBS system stopped successfully!"
echo ""
