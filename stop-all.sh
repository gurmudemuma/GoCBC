#!/bin/bash

################################################################################
# GoCBC Complete System Stop Script
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
################################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"
UI_DIR="$PROJECT_ROOT/ui"

# Ports
API_PORT=3001
UI_PORT=3000

# Colors
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'

# Helper functions
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
    echo -e "${COLOR_CYAN}ℹ${COLOR_RESET} $1"
}

################################################################################
# Stop API Server
################################################################################

stop_api_server() {
    write_header "Stopping API Server"
    
    # Try to stop using PID file
    if [ -f "$PROJECT_ROOT/.api.pid" ]; then
        API_PID=$(cat "$PROJECT_ROOT/.api.pid")
        write_step "Stopping API server (PID: $API_PID)..."
        
        if kill -0 $API_PID 2>/dev/null; then
            kill $API_PID 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            if kill -0 $API_PID 2>/dev/null; then
                kill -9 $API_PID 2>/dev/null || true
            fi
            
            write_success "API server stopped"
        else
            write_info "API server was not running (stale PID file)"
        fi
        
        rm -f "$PROJECT_ROOT/.api.pid"
    else
        write_info "No API PID file found"
    fi
    
    # Kill any process on API port
    write_step "Ensuring port $API_PORT is free..."
    API_PROC=$(lsof -ti:$API_PORT 2>/dev/null || echo "")
    if [ -n "$API_PROC" ]; then
        kill -9 $API_PROC 2>/dev/null || true
        write_success "Killed process on port $API_PORT"
    else
        write_info "Port $API_PORT is already free"
    fi
}

################################################################################
# Stop UI Server
################################################################################

stop_ui_server() {
    write_header "Stopping UI Server"
    
    # Try to stop using PID file
    if [ -f "$PROJECT_ROOT/.ui.pid" ]; then
        UI_PID=$(cat "$PROJECT_ROOT/.ui.pid")
        write_step "Stopping UI server (PID: $UI_PID)..."
        
        if kill -0 $UI_PID 2>/dev/null; then
            kill $UI_PID 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            if kill -0 $UI_PID 2>/dev/null; then
                kill -9 $UI_PID 2>/dev/null || true
            fi
            
            write_success "UI server stopped"
        else
            write_info "UI server was not running (stale PID file)"
        fi
        
        rm -f "$PROJECT_ROOT/.ui.pid"
    else
        write_info "No UI PID file found"
    fi
    
    # Kill any process on UI port
    write_step "Ensuring port $UI_PORT is free..."
    UI_PROC=$(lsof -ti:$UI_PORT 2>/dev/null || echo "")
    if [ -n "$UI_PROC" ]; then
        kill -9 $UI_PROC 2>/dev/null || true
        write_success "Killed process on port $UI_PORT"
    else
        write_info "Port $UI_PORT is already free"
    fi
}

################################################################################
# Stop Blockchain Network
################################################################################

stop_blockchain_network() {
    write_header "Stopping Blockchain Network"
    
    cd "$PROJECT_ROOT"
    
    # Check if docker-compose file exists
    if [ ! -f "docker-compose-fabric.yml" ]; then
        write_warning "docker-compose-fabric.yml not found"
        return 0
    fi
    
    # Check if any containers are running
    RUNNING_CONTAINERS=$(docker-compose -f docker-compose-fabric.yml ps -q 2>/dev/null | wc -l)
    
    if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
        write_info "No blockchain containers running"
        return 0
    fi
    
    write_step "Stopping blockchain containers..."
    docker-compose -f docker-compose-fabric.yml down
    
    if [ $? -eq 0 ]; then
        write_success "Blockchain containers stopped"
    else
        write_error "Failed to stop some containers"
    fi
    
    # Optionally remove volumes
    read -p "Do you want to remove volumes (will delete blockchain data)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        write_step "Removing volumes..."
        docker-compose -f docker-compose-fabric.yml down -v
        write_success "Volumes removed"
    fi
}

################################################################################
# Clean Up Processes
################################################################################

cleanup_processes() {
    write_header "Cleaning Up Remaining Processes"
    
    # Kill any node processes from this project
    write_step "Checking for orphaned Node.js processes..."
    ORPHANS=$(ps aux | grep -E "node.*($API_DIR|$UI_DIR)" | grep -v grep | awk '{print $2}' || echo "")
    
    if [ -n "$ORPHANS" ]; then
        echo "$ORPHANS" | while read pid; do
            if [ -n "$pid" ]; then
                kill -9 $pid 2>/dev/null || true
                write_info "Killed orphaned process: $pid"
            fi
        done
        write_success "Orphaned processes cleaned up"
    else
        write_info "No orphaned processes found"
    fi
}

################################################################################
# Display Status
################################################################################

show_status() {
    write_header "System Status"
    
    echo ""
    echo -e "${COLOR_CYAN}Port Status:${COLOR_RESET}"
    
    # Check API port
    if lsof -ti:$API_PORT &>/dev/null; then
        echo -e "  • Port $API_PORT (API):  ${COLOR_RED}Still in use${COLOR_RESET}"
    else
        echo -e "  • Port $API_PORT (API):  ${COLOR_GREEN}Free${COLOR_RESET}"
    fi
    
    # Check UI port
    if lsof -ti:$UI_PORT &>/dev/null; then
        echo -e "  • Port $UI_PORT (UI):   ${COLOR_RED}Still in use${COLOR_RESET}"
    else
        echo -e "  • Port $UI_PORT (UI):   ${COLOR_GREEN}Free${COLOR_RESET}"
    fi
    
    echo ""
    echo -e "${COLOR_CYAN}Docker Containers:${COLOR_RESET}"
    
    # Check blockchain containers
    PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\." || echo "0")
    ORDERER_COUNT=$(docker ps 2>/dev/null | grep -c "orderer\." || echo "0")
    
    if [ "$PEER_COUNT" -eq 0 ] && [ "$ORDERER_COUNT" -eq 0 ]; then
        echo -e "  • Blockchain: ${COLOR_GREEN}No containers running${COLOR_RESET}"
    else
        echo -e "  • Blockchain: ${COLOR_YELLOW}$((PEER_COUNT + ORDERER_COUNT)) containers still running${COLOR_RESET}"
        write_info "Run: docker-compose -f docker-compose-fabric.yml down"
    fi
    
    echo ""
    write_success "System stopped successfully!"
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
    echo "║                     System Shutdown                                  ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${COLOR_RESET}"
    
    stop_api_server
    stop_ui_server
    stop_blockchain_network
    cleanup_processes
    show_status
    
    echo -e "${COLOR_GREEN}✅ Shutdown complete${COLOR_RESET}"
    echo ""
}

# Run main function
main "$@"
