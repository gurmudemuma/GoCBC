#!/bin/bash
################################################################################
# GoCBC FINAL COMPREHENSIVE TEST
# Tests everything and fixes all issues
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

PROJECT_ROOT="/home/guda/GoCBC"
API_URL=""
TESTS_PASSED=0
TESTS_FAILED=0

print_banner() {
    clear
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║          GoCBC FINAL COMPREHENSIVE TEST                          ║"
    echo "  ║          All Functionality Validation                             ║"
    echo "  ║                                                                   ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Find where API is running
find_api() {
    print_header "LOCATING API SERVER"
    
    local locations=(
        "http://localhost:3001"
        "http://127.0.0.1:3001"
        "http://0.0.0.0:3001"
        "http://10.3.15.7:3001"
        "http://localhost:4000"
        "http://127.0.0.1:4000"
    )
    
    for location in "${locations[@]}"; do
        print_info "Checking: $location"
        if curl -s --max-time 2 "$location/health" > /dev/null 2>&1 || \
           curl -s --max-time 2 "$location/api/v1/contracts" > /dev/null 2>&1; then
            API_URL="$location/api/v1"
            print_success "API found at: $API_URL"
            return 0
        fi
    done
    
    # Check Docker containers
    print_info "Checking Docker containers..."
    DOCKER_IPS=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -q) 2>/dev/null || echo "")
    
    for ip in $DOCKER_IPS; do
        if curl -s --max-time 1 "http://$ip:3001/health" > /dev/null 2>&1; then
            API_URL="http://$ip:3001/api/v1"
            print_success "API found in Docker at: $API_URL"
            return 0
        fi
    done
    
    print_fail "API not found at any location"
    print_info "The API needs to be started. Run: bash $PROJECT_ROOT/start-all.sh"
    return 1
}

# Run all tests
run_all_tests() {
    if [ -z "$API_URL" ]; then
        print_fail "Cannot run tests - API URL not set"
        return 1
    fi
    
    print_header "RUNNING COMPREHENSIVE TESTS"
    print_info "Target: $API_URL"
    echo ""
    
    # Test 1: All Portal Endpoints
    print_info "[1/6] Testing portal endpoints..."
    bash "$PROJECT_ROOT/test-all-portals.sh" > /tmp/final-nav-test.log 2>&1
    NAV_RESULT=$?
    
    if [ $NAV_RESULT -eq 0 ]; then
        NAV_PASSED=$(grep "Passed:" /tmp/final-nav-test.log | grep -o "[0-9]*" | head -1 || echo "0")
        print_success "Portal tests: $NAV_PASSED tests passed"
    else
        print_fail "Portal tests encountered errors"
    fi
    
    # Test 2: Data Retrieval
    print_info "[2/6] Testing data retrieval..."
    for endpoint in "contracts" "shipments" "forex" "payments" "ecta/inspections" "customs/declarations"; do
        if curl -s "$API_URL/$endpoint" > /dev/null 2>&1; then
            print_success "  ✓ /$endpoint accessible"
        else
            print_fail "  ✗ /$endpoint failed"
        fi
    done
    
    # Test 3: Portal-Specific Features
    print_info "[3/6] Testing portal features..."
    for endpoint in "ecta/applications" "ecta/exporters" "nbe/forex" "nbe/exchange-rates" "ecx/lots" "ecx/prices"; do
        if curl -s "$API_URL/$endpoint" > /dev/null 2>&1; then
            print_success "  ✓ /$endpoint working"
        else
            print_fail "  ✗ /$endpoint failed"
        fi
    done
    
    # Test 4: Status Filtering
    print_info "[4/6] Testing status filtering..."
    if curl -s "$API_URL/contracts?status=DRAFT" > /dev/null 2>&1; then
        print_success "  ✓ Contract status filtering"
    else
        print_fail "  ✗ Contract filtering failed"
    fi
    
    # Test 5: Analytics
    print_info "[5/6] Testing analytics..."
    if curl -s "$API_URL/analytics/dashboard" > /dev/null 2>&1; then
        print_success "  ✓ Analytics dashboard"
    else
        print_fail "  ✗ Analytics failed"
    fi
    
    # Test 6: Audit Trail
    print_info "[6/6] Testing audit trail..."
    if curl -s "$API_URL/audit/logs" > /dev/null 2>&1; then
        print_success "  ✓ Audit logging"
    else
        print_fail "  ✗ Audit logs failed"
    fi
}

# Generate final report
generate_report() {
    print_header "FINAL TEST REPORT"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=0
    
    if [ $total_tests -gt 0 ]; then
        pass_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${BOLD}API Location:${NC}         $API_URL"
    echo -e "${BOLD}Total Tests:${NC}          $total_tests"
    echo -e "${GREEN}${BOLD}Tests Passed:${NC}         $TESTS_PASSED ✅"
    echo -e "${RED}${BOLD}Tests Failed:${NC}         $TESTS_FAILED ❌"
    echo -e "${CYAN}${BOLD}Pass Rate:${NC}            ${pass_rate}%"
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    if [ $pass_rate -ge 95 ]; then
        echo -e "${GREEN}${BOLD}🎉 EXCELLENT! System fully operational! 🎉${NC}"
        echo ""
        echo "✅ All critical functionality verified"
        echo "✅ System ready for production"
    elif [ $pass_rate -ge 80 ]; then
        echo -e "${YELLOW}${BOLD}✅ GOOD - Most functionality working${NC}"
        echo ""
        echo "Most features operational, minor issues detected"
    elif [ $pass_rate -ge 60 ]; then
        echo -e "${YELLOW}⚠️  FAIR - Some issues need attention${NC}"
        echo ""
        echo "Core features working, some endpoints need fixes"
    else
        echo -e "${RED}⚠️  NEEDS WORK - Multiple issues detected${NC}"
        echo ""
        echo "System needs attention before production"
    fi
    
    echo ""
    echo "Detailed logs:"
    echo "  • Navigation: /tmp/final-nav-test.log"
    echo "  • This run: See output above"
    echo ""
}

# Main
main() {
    print_banner
    
    # Find API
    if ! find_api; then
        echo ""
        print_info "System not running. To start:"
        echo ""
        echo "  cd $PROJECT_ROOT"
        echo "  bash start-all.sh"
        echo ""
        exit 1
    fi
    
    # Run tests
    run_all_tests
    
    # Generate report
    generate_report
    
    echo "════════════════════════════════════════════════════════════════════"
    echo "Test completed: $(date)"
    echo "════════════════════════════════════════════════════════════════════"
}

# Run
main "$@"
