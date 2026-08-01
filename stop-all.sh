#!/bin/bash
# Complete shutdown script for CECBS (Coffee Export Consortium Blockchain System)
# Usage: ./stop-all.sh [--keep-data]

set -e

# Parse arguments
KEEP_DATA=false

for arg in "$@"; do
    case $arg in
        --keep-data)
            KEEP_DATA=true
            shift
            ;;
    esac
done

# Colors
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[31m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_BLUE='\033[34m'
COLOR_CYAN='\033[36m'

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

print_header "Stopping CECBS System"

# Stop Node.js processes (API & UI)
print_step "Stopping Node.js processes (API & UI)..."
if pgrep -f "node.*api\|node.*ui" > /dev/null; then
    pkill -f "node.*api" 2>/dev/null || true
    pkill -f "node.*ui" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    sleep 2
    print_success "Stopped Node.js processes"
else
    print_warning "No Node.js processes found"
fi

# Remove PID files
rm -f /tmp/cecbs-api.pid /tmp/cecbs-ui.pid 2>/dev/null || true

# Stop Docker containers
print_step "Stopping Docker containers..."
if [ "$KEEP_DATA" = true ]; then
    print_warning "Keeping data volumes (--keep-data flag)"
    if docker-compose -f docker-compose-fabric.yml down; then
        print_success "Docker containers stopped"
    else
        print_error "Error stopping Docker containers"
    fi
else
    print_step "Removing containers and volumes..."
    if docker-compose -f docker-compose-fabric.yml down -v; then
        print_success "Docker containers stopped and volumes removed"
    else
        print_error "Error stopping Docker containers"
    fi
fi

# Show remaining containers (if any)
print_step "Checking for remaining containers..."
remaining=$(docker ps -a --filter "name=cecbs" --filter "name=coffee" --filter "name=peer" --filter "name=orderer" --filter "name=couchdb" --format "{{.Names}}" 2>/dev/null || true)

if [ -n "$remaining" ]; then
    print_warning "Some containers are still running:"
    echo "$remaining" | sed 's/^/  - /'
    echo ""
    read -p "Force remove these containers? (y/N): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "$remaining" | xargs -r docker rm -f 2>/dev/null || true
        print_success "Forced removal complete"
    fi
else
    print_success "No CECBS containers running"
fi

echo ""
print_success "CECBS system stopped successfully!"
echo ""

# Show summary
print_header "Summary"
echo -e "${COLOR_GREEN}All services have been stopped.${COLOR_RESET}"
echo ""
echo "To start the system again, run:"
echo -e "  ${COLOR_CYAN}./start-all.sh --skip-build${COLOR_RESET}"
echo ""

if [ "$KEEP_DATA" = false ]; then
    print_warning "Note: Data volumes were removed. Database will be re-initialized on next start."
else
    echo -e "${COLOR_GREEN}Data volumes were preserved.${COLOR_RESET}"
fi
echo ""
