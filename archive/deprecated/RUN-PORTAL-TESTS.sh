#!/bin/bash
################################################################################
# GoCBC Portal Testing - Quick Test Runner
# Comprehensive test execution for all 7 portals
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

print_error() {
    echo -e "${RED}✗${NC} ${RED}$1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check if API is running
check_api() {
    print_step "Checking if API is running..."
    
    if curl -s --max-time 3 http://localhost:3001/health >/dev/null 2>&1; then
        print_success "API is running on port 3001"
        return 0
    else
        print_error "API is not running on port 3001"
        return 1
    fi
}

# Check if system is running
check_system() {
    print_header "System Status Check"
    
    local all_good=true
    
    # Check API
    if ! check_api; then
        all_good=false
        print_info "Start the API with: bash start-all.sh"
    fi
    
    # Check Docker
    print_step "Checking Docker containers..."
    if docker ps | grep -q "cecbs-postgres"; then
        print_success "PostgreSQL container is running"
    else
        print_error "PostgreSQL container is not running"
        all_good=false
        print_info "Start Docker with: bash start-all.sh"
    fi
    
    # Check UI (optional)
    print_step "Checking UI server..."
    if curl -s --max-time 3 -I http://localhost:3000 2>/dev/null | grep -qi "HTTP"; then
        print_success "UI is running on port 3000"
    else
        print_info "UI is not running (optional)"
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        print_error "System is not fully running!"
        echo ""
        echo "To start the system:"
        echo -e "  ${BOLD}cd $PROJECT_ROOT${NC}"
        echo -e "  ${BOLD}bash start-all.sh${NC}"
        echo ""
        exit 1
    fi
    
    print_success "System is ready for testing!"
}

# Run bash test
run_bash_test() {
    print_header "Running Comprehensive Portal Test"
    
    print_step "Executing test-all-portals.sh..."
    echo ""
    
    bash "$PROJECT_ROOT/test-all-portals.sh"
    
    echo ""
    print_info "Results saved to: /tmp/portal-test-results.log"
    print_info "View results: cat /tmp/portal-test-results.log"
}

# Run TypeScript test
run_typescript_test() {
    print_header "Running TypeScript Automated Test Suite"
    
    cd "$PROJECT_ROOT/tests"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_step "Installing dependencies..."
        npm install
    fi
    
    print_step "Running test suite..."
    npm test
}

# Show menu
show_menu() {
    clear
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║          GoCBC Portal Testing - Quick Test Runner                ║"
    echo "  ║                                                                   ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Select test type:"
    echo ""
    echo "  1) Quick Bash Test (Recommended)"
    echo "     → Tests all 69 API endpoints"
    echo "     → Fast execution (~30 seconds)"
    echo "     → Shows pass/fail for each portal"
    echo ""
    echo "  2) TypeScript Automated Suite"
    echo "     → Complete workflow testing"
    echo "     → Detailed reporting"
    echo "     → Slower (~2-5 minutes)"
    echo ""
    echo "  3) Both (Sequential)"
    echo "     → Run bash test first, then TypeScript"
    echo ""
    echo "  4) Check System Status Only"
    echo "     → Verify API and Docker are running"
    echo ""
    echo "  5) Exit"
    echo ""
    read -p "Enter choice [1-5]: " choice
    echo ""
}

# Main execution
main() {
    case ${1:-menu} in
        --bash)
            check_system
            run_bash_test
            ;;
        --typescript)
            check_system
            run_typescript_test
            ;;
        --both)
            check_system
            run_bash_test
            echo ""
            read -p "Press Enter to continue to TypeScript tests..." 
            run_typescript_test
            ;;
        --status)
            check_system
            ;;
        menu|*)
            show_menu
            case $choice in
                1)
                    check_system
                    run_bash_test
                    ;;
                2)
                    check_system
                    run_typescript_test
                    ;;
                3)
                    check_system
                    run_bash_test
                    echo ""
                    read -p "Press Enter to continue to TypeScript tests..." 
                    run_typescript_test
                    ;;
                4)
                    check_system
                    ;;
                5)
                    echo "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid choice"
                    exit 1
                    ;;
            esac
            ;;
    esac
    
    echo ""
    print_success "Testing complete!"
    echo ""
}

# Run main
main "$@"
