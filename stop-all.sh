#!/bin/bash
################################################################################
# GoCBC System Shutdown Script
# Stops all services gracefully
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header "Stopping GoCBC System"

# Stop UI server
print_step "Stopping UI server..."
if [ -f "$PROJECT_ROOT/logs/ui.pid" ]; then
    UI_PID=$(cat "$PROJECT_ROOT/logs/ui.pid")
    if kill -0 "$UI_PID" 2>/dev/null; then
        kill "$UI_PID"
        print_success "UI server stopped (PID: $UI_PID)"
    else
        print_warning "UI server not running"
    fi
    rm -f "$PROJECT_ROOT/logs/ui.pid"
else
    pkill -f "next.*start" 2>/dev/null && print_success "UI server stopped" || print_warning "UI server not running"
    pkill -f "next.*dev" 2>/dev/null || true
fi

# Stop API server
print_step "Stopping API server..."
if [ -f "$PROJECT_ROOT/logs/api.pid" ]; then
    API_PID=$(cat "$PROJECT_ROOT/logs/api.pid")
    if kill -0 "$API_PID" 2>/dev/null; then
        kill "$API_PID"
        print_success "API server stopped (PID: $API_PID)"
    else
        print_warning "API server not running"
    fi
    rm -f "$PROJECT_ROOT/logs/api.pid"
else
    pkill -f "node.*dist/server.js" 2>/dev/null && print_success "API server stopped" || print_warning "API server not running"
    pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
fi

# Stop Docker containers
print_step "Stopping Docker containers..."
docker-compose -f docker-compose-fabric.yml down 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Docker containers stopped"
else
    print_warning "Some Docker containers may still be running"
fi

echo ""
print_success "System stopped successfully!"
echo ""
