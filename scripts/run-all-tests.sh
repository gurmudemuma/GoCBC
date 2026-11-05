#!/bin/bash

# ============================================================================
# MASTER TEST RUNNER - ALL E2E WORKFLOWS
# ============================================================================
# Runs all E2E test suites sequentially with LIVE OUTPUT
# Output is displayed in real-time AND saved to log files
# Usage: ./run-all-tests.sh [--quick | --full | --specific TEST_NAME]
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

TEST_DIR="/home/guda/GoCBC"
LOG_DIR="/tmp/gocbc-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log directory
mkdir -p "$LOG_DIR"

# Test configuration - ORDERED BY BUSINESS WORKFLOW
declare -A TESTS=(
    ["happy-path"]="complete-e2e-test.sh|Complete Happy Path (9 Stages)|CRITICAL"
    ["compliance"]="compliance-workflows-test.sh|Compliance (EUDR, Insurance, Documents)|HIGH"
    ["swift"]="swift-processing-test.sh|SWIFT Message Processing (MT700, MT103, MT707, MT910)|HIGH"
    ["border-crossing"]="border-crossing-test.sh|Border Crossing & Land Transport|MEDIUM"
    ["rejections"]="rejection-flows-test.sh|Rejection Flows (Contract, LC, Inspection)|MEDIUM"
)

# Test execution results
declare -A RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Utility functions
print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                      ║${NC}"
    echo -e "${CYAN}║           ${BOLD}GOCBC E2E TEST SUITE - COMPREHENSIVE COVERAGE${NC}${CYAN}            ║${NC}"
    echo -e "${CYAN}║                                                                      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_test_header() {
    local test_name=$1
    local description=$2
    local priority=$3
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ TEST: ${BOLD}${test_name}${NC}"
    echo -e "${BLUE}║ DESC: ${description}${NC}"
    echo -e "${BLUE}║ PRIORITY: ${priority}${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick       Run only critical tests (happy path)"
    echo "  --full        Run all test suites (default)"
    echo "  --specific    Run specific test: happy-path|rejections|border-crossing|compliance"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                              # Run all tests"
    echo "  $0 --quick                      # Run only happy path"
    echo "  $0 --specific rejections        # Run only rejection flows test"
    echo ""
}

run_test() {
    local test_key=$1
    local test_info="${TESTS[$test_key]}"
    
    if [ -z "$test_info" ]; then
        print_error "Test '$test_key' not found"
        return 1
    fi
    
    IFS='|' read -r script description priority <<< "$test_info"
    
    local script_path="$TEST_DIR/$script"
    local log_file="$LOG_DIR/${test_key}_${TIMESTAMP}.log"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_test_header "$test_key" "$description" "$priority"
    
    if [ ! -f "$script_path" ]; then
        print_error "Test script not found: $script_path"
        RESULTS[$test_key]="NOT_FOUND"
        SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
        return 1
    fi
    
    print_info "Starting test execution..."
    print_info "Log file: $log_file"
    echo ""
    
    # Run the test with both live output and logging
    if bash "$script_path" 2>&1 | tee "$log_file"; then
        print_success "TEST PASSED: $test_key"
        RESULTS[$test_key]="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "TEST FAILED: $test_key"
        RESULTS[$test_key]="FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

print_summary() {
    print_header "TEST EXECUTION SUMMARY"
    
    echo -e "${BOLD}Overall Results:${NC}"
    echo -e "  Total Tests:   $TOTAL_TESTS"
    echo -e "  ${GREEN}Passed:        $PASSED_TESTS${NC}"
    echo -e "  ${RED}Failed:        $FAILED_TESTS${NC}"
    echo -e "  ${YELLOW}Skipped:       $SKIPPED_TESTS${NC}"
    echo ""
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        local pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo -e "${BOLD}Pass Rate: ${pass_rate}%${NC}"
        echo ""
    fi
    
    echo -e "${BOLD}Individual Test Results:${NC}"
    echo ""
    
    for test_key in "${!TESTS[@]}"; do
        local result="${RESULTS[$test_key]}"
        local test_info="${TESTS[$test_key]}"
        IFS='|' read -r script description priority <<< "$test_info"
        
        case "$result" in
            PASS)
                echo -e "  ${GREEN}✓ PASS${NC}  [$priority] $test_key - $description"
                ;;
            FAIL)
                echo -e "  ${RED}✗ FAIL${NC}  [$priority] $test_key - $description"
                ;;
            NOT_FOUND)
                echo -e "  ${YELLOW}⊘ SKIP${NC}  [$priority] $test_key - $description (script not found)"
                ;;
            *)
                echo -e "  ${YELLOW}- N/A ${NC}  [$priority] $test_key - $description (not run)"
                ;;
        esac
    done
    
    echo ""
    echo -e "${CYAN}Log files saved in: $LOG_DIR${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║                   🎉 ALL TESTS PASSED! 🎉                           ║${NC}"
        echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${NC}"
        return 0
    else
        echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}${BOLD}║                   ⚠️  SOME TESTS FAILED  ⚠️                          ║${NC}"
        echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_banner
    
    MODE="full"
    SPECIFIC_TEST=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                MODE="quick"
                shift
                ;;
            --full)
                MODE="full"
                shift
                ;;
            --specific)
                MODE="specific"
                SPECIFIC_TEST="$2"
                shift 2
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    print_header "TEST CONFIGURATION"
    echo -e "Mode:      ${BOLD}$MODE${NC}"
    echo -e "Timestamp: $TIMESTAMP"
    echo -e "Log Dir:   $LOG_DIR"
    echo ""
    
    # Execute tests based on mode
    case "$MODE" in
        quick)
            print_info "Running QUICK mode - Critical tests only"
            run_test "happy-path"
            ;;
            
        specific)
            if [ -z "$SPECIFIC_TEST" ]; then
                print_error "No test specified for --specific mode"
                print_usage
                exit 1
            fi
            print_info "Running SPECIFIC test: $SPECIFIC_TEST"
            run_test "$SPECIFIC_TEST"
            ;;
            
        full)
            print_info "Running FULL test suite - All workflows"
            echo ""
            
            # Run tests in BUSINESS PROCESS order
            print_info "Running CRITICAL tests (Complete Workflow)..."
            run_test "happy-path"
            
            echo ""
            print_info "Running HIGH priority tests (Compliance & International Banking)..."
            run_test "compliance"
            run_test "swift"
            
            echo ""
            print_info "Running MEDIUM priority tests (Transport & Error Handling)..."
            run_test "border-crossing"
            run_test "rejections"
            ;;
    esac
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
