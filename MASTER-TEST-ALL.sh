#!/bin/bash
################################################################################
# GoCBC MASTER TEST SCRIPT
# Runs all tests: Navigation + Functionality + Integration
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

print_banner() {
    clear
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║            GoCBC MASTER TEST SUITE                                ║"
    echo "  ║            Complete System Validation                             ║"
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

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check system status
check_system() {
    print_header "SYSTEM STATUS CHECK"
    
    local system_ready=true
    
    # Check API
    print_step "Checking API server..."
    if curl -s --max-time 3 http://localhost:3001/health > /dev/null 2>&1; then
        print_success "API server is running (port 3001)"
    else
        print_fail "API server is NOT running"
        system_ready=false
    fi
    
    # Check Database
    print_step "Checking database..."
    if docker ps 2>/dev/null | grep -q "cecbs-postgres"; then
        print_success "PostgreSQL container is running"
    else
        print_fail "PostgreSQL is NOT running"
        system_ready=false
    fi
    
    # Check UI (optional)
    print_step "Checking UI server..."
    if curl -s --max-time 3 -I http://localhost:3000 2>/dev/null | grep -qi "HTTP"; then
        print_success "UI server is running (port 3000)"
    else
        print_info "UI server is not running (optional for API tests)"
    fi
    
    if [ "$system_ready" = false ]; then
        echo ""
        print_fail "System is not fully running!"
        echo ""
        echo "To start the system:"
        echo -e "  ${BOLD}cd $PROJECT_ROOT${NC}"
        echo -e "  ${BOLD}bash start-all.sh${NC}"
        echo ""
        read -p "Press Enter to continue anyway, or Ctrl+C to exit..."
        return 1
    fi
    
    print_success "System is ready for testing!"
    return 0
}

# Run portal navigation tests
run_navigation_tests() {
    print_header "TEST SUITE 1: PORTAL NAVIGATION"
    
    print_step "Running comprehensive portal tests..."
    echo ""
    
    if bash "$PROJECT_ROOT/test-all-portals.sh" > /tmp/master-navigation-results.log 2>&1; then
        local passed=$(grep "Passed:" /tmp/master-navigation-results.log | grep -o "[0-9]*" | head -1)
        local total=$(grep "Total Tests:" /tmp/master-navigation-results.log | grep -o "[0-9]*" | head -1)
        
        print_success "Navigation tests completed: $passed/$total passed"
        
        # Show summary
        tail -15 /tmp/master-navigation-results.log
        
        return 0
    else
        print_fail "Navigation tests encountered errors"
        return 1
    fi
}

# Run functionality tests
run_functionality_tests() {
    print_header "TEST SUITE 2: FUNCTIONALITY & BUSINESS LOGIC"
    
    print_step "Running comprehensive functionality tests..."
    echo ""
    
    if bash "$PROJECT_ROOT/test-functionalities-simple.sh" > /tmp/master-functionality-results.log 2>&1; then
        local passed=$(grep "Tests Passed:" /tmp/master-functionality-results.log | grep -o "[0-9]*" | head -1)
        local total=$(grep "Total Functional Tests:" /tmp/master-functionality-results.log | grep -o "[0-9]*" | head -1)
        
        print_success "Functionality tests completed: $passed/$total passed"
        
        # Show summary
        tail -20 /tmp/master-functionality-results.log
        
        return 0
    else
        print_fail "Functionality tests encountered errors"
        return 1
    fi
}

# Generate comprehensive report
generate_report() {
    print_header "GENERATING COMPREHENSIVE TEST REPORT"
    
    local report_file="/tmp/gocbc-master-test-report.txt"
    
    cat > "$report_file" << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                   GoCBC MASTER TEST REPORT                                ║
║                   Complete System Validation                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

EOF

    echo "Test Date: $(date)" >> "$report_file"
    echo "Test Type: Comprehensive (Navigation + Functionality)" >> "$report_file"
    echo "" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "TEST SUITE 1: PORTAL NAVIGATION" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ -f "/tmp/master-navigation-results.log" ]; then
        tail -30 /tmp/master-navigation-results.log >> "$report_file"
    else
        echo "Navigation tests not run" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "TEST SUITE 2: FUNCTIONALITY & BUSINESS LOGIC" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ -f "/tmp/master-functionality-results.log" ]; then
        tail -30 /tmp/master-functionality-results.log >> "$report_file"
    else
        echo "Functionality tests not run" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "SUMMARY" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "" >> "$report_file"
    
    # Calculate totals
    local nav_passed=0
    local nav_total=0
    local func_passed=0
    local func_total=0
    
    if [ -f "/tmp/master-navigation-results.log" ]; then
        nav_passed=$(grep "Passed:" /tmp/master-navigation-results.log | grep -o "[0-9]*" | head -1 || echo "0")
        nav_total=$(grep "Total Tests:" /tmp/master-navigation-results.log | grep -o "[0-9]*" | head -1 || echo "0")
    fi
    
    if [ -f "/tmp/master-functionality-results.log" ]; then
        func_passed=$(grep "Tests Passed:" /tmp/master-functionality-results.log | grep -o "[0-9]*" | head -1 || echo "0")
        func_total=$(grep "Total Functional Tests:" /tmp/master-functionality-results.log | grep -o "[0-9]*" | head -1 || echo "0")
    fi
    
    local total_passed=$((nav_passed + func_passed))
    local total_tests=$((nav_total + func_total))
    local total_failed=$((total_tests - total_passed))
    
    if [ $total_tests -gt 0 ]; then
        local pass_rate=$((total_passed * 100 / total_tests))
    else
        local pass_rate=0
    fi
    
    echo "Navigation Tests:   $nav_passed/$nav_total passed" >> "$report_file"
    echo "Functionality Tests: $func_passed/$func_total passed" >> "$report_file"
    echo "" >> "$report_file"
    echo "TOTAL TESTS:        $total_tests" >> "$report_file"
    echo "TOTAL PASSED:       $total_passed ✓" >> "$report_file"
    echo "TOTAL FAILED:       $total_failed" >> "$report_file"
    echo "PASS RATE:          ${pass_rate}%" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ $pass_rate -ge 95 ]; then
        echo "STATUS: ✅ EXCELLENT - System fully operational" >> "$report_file"
    elif [ $pass_rate -ge 80 ]; then
        echo "STATUS: ✅ GOOD - Most features working" >> "$report_file"
    elif [ $pass_rate -ge 60 ]; then
        echo "STATUS: ⚠️  FAIR - Some issues need attention" >> "$report_file"
    else
        echo "STATUS: ❌ NEEDS WORK - Multiple issues detected" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    echo "Report saved to: $report_file" >> "$report_file"
    echo "═══════════════════════════════════════════════════════════════════════════" >> "$report_file"
    
    print_success "Report generated: $report_file"
    
    # Display summary
    echo ""
    cat "$report_file"
}

# Main execution
main() {
    print_banner
    
    print_info "Starting comprehensive system testing..."
    print_info "This will run all test suites"
    echo ""
    
    # Check system
    check_system
    local system_status=$?
    
    # Run navigation tests
    run_navigation_tests
    local nav_status=$?
    
    # Run functionality tests (only if system is ready)
    if [ $system_status -eq 0 ]; then
        run_functionality_tests
        local func_status=$?
    else
        print_info "Skipping functionality tests (system not ready)"
        func_status=1
    fi
    
    # Generate report
    generate_report
    
    # Final summary
    echo ""
    print_header "TEST EXECUTION COMPLETE"
    
    if [ $nav_status -eq 0 ] && [ $func_status -eq 0 ]; then
        echo -e "${GREEN}${BOLD}🎉 ALL TEST SUITES PASSED! 🎉${NC}"
        echo ""
        echo "✅ Portal navigation: PASSING"
        echo "✅ Functionality tests: PASSING"
        echo "✅ System validation: COMPLETE"
    elif [ $nav_status -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Partial Success${NC}"
        echo ""
        echo "✅ Portal navigation: PASSING"
        echo "⚠️  Functionality tests: NEEDS SYSTEM RUNNING"
    else
        echo -e "${RED}⚠️  Some tests failed${NC}"
        echo ""
        echo "Please review the detailed logs"
    fi
    
    echo ""
    echo "Detailed results:"
    echo "  • Navigation: /tmp/master-navigation-results.log"
    echo "  • Functionality: /tmp/master-functionality-results.log"
    echo "  • Full Report: /tmp/gocbc-master-test-report.txt"
    echo ""
}

# Run main
main "$@"
