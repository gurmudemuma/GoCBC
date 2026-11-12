#!/bin/bash

################################################################################
# TEST HELPER LIBRARY
# Shared utilities for all test scripts
################################################################################

# Colors
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m'

# Test counters (global)
export TOTAL_TESTS=0
export PASSED_TESTS=0
export FAILED_TESTS=0

# API Configuration
export API_URL="${API_URL:-http://localhost:3001/api/v1}"
export OUTPUT_DIR="${OUTPUT_DIR:-./tests/results}"
export TIMESTAMP=$(date +%s)

################################################################################
# LOGGING FUNCTIONS
################################################################################

log_section() {
    echo "" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
}

log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}TEST #$TOTAL_TESTS:${NC} $1" | tee -a "$LOG_FILE"
}

log_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ PASS:${NC} $1" | tee -a "$LOG_FILE"
}

log_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}✗ FAIL:${NC} $1" | tee -a "$LOG_FILE"
}

# Honest skip: the check could not run (no live fixture / no such endpoint).
# Counts separately from pass/fail so a summary never overstates a pass.
# (Added 2026-11-12, W3: two banking amendment tests have no API endpoint
# to call — see banking-extended-workflow-test.sh.)
log_skip() {
    if [ -z "${SKIPPED_TESTS:-}" ]; then
        SKIPPED_TESTS=0
    fi
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    echo -e "${YELLOW}⊘ SKIP:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1" | tee -a "$LOG_FILE"
}

log_debug() {
    if [ "${DEBUG}" = "true" ]; then
        echo -e "${CYAN}🔍 DEBUG:${NC} $1" | tee -a "$LOG_FILE"
    fi
}

################################################################################
# AUTHENTICATION FUNCTIONS
################################################################################

login_user() {
    local username=$1
    local password=$2
    local role=$3
    
    local response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    local token=$(echo "$response" | jq -r '.data.token // empty')
    
    if [ -n "$token" ] && [ "$token" != "null" ]; then
        echo "$token"
        return 0
    else
        log_debug "Login failed for $username: $response"
        return 1
    fi
}

refresh_token() {
    local old_token=$1
    
    local response=$(curl -s -X POST "$API_URL/auth/refresh" \
        -H "Authorization: Bearer $old_token")
    
    local new_token=$(echo "$response" | jq -r '.data.token // empty')
    
    if [ -n "$new_token" ] && [ "$new_token" != "null" ]; then
        echo "$new_token"
        return 0
    else
        return 1
    fi
}

################################################################################
# API CALL FUNCTIONS
################################################################################

api_call() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local extra_headers=$5
    
    local url="$API_URL$endpoint"
    local auth_header=""
    
    if [ -n "$token" ]; then
        auth_header="-H \"Authorization: Bearer $token\""
    fi
    
    if [ "$method" = "GET" ]; then
        eval curl -s -X GET \"$url\" $auth_header $extra_headers
    elif [ "$method" = "POST" ]; then
        eval curl -s -X POST \"$url\" $auth_header \
            -H \"Content-Type: application/json\" \
            $extra_headers \
            -d \'$data\'
    elif [ "$method" = "PUT" ]; then
        eval curl -s -X PUT \"$url\" $auth_header \
            -H \"Content-Type: application/json\" \
            $extra_headers \
            -d \'$data\'
    elif [ "$method" = "PATCH" ]; then
        eval curl -s -X PATCH \"$url\" $auth_header \
            -H \"Content-Type: application/json\" \
            $extra_headers \
            -d \'$data\'
    elif [ "$method" = "DELETE" ]; then
        eval curl -s -X DELETE \"$url\" $auth_header $extra_headers
    fi
}

api_get() {
    api_call "GET" "$1" "$2" "" "$3"
}

api_post() {
    api_call "POST" "$1" "$2" "$3" "$4"
}

api_put() {
    api_call "PUT" "$1" "$2" "$3" "$4"
}

api_patch() {
    api_call "PATCH" "$1" "$2" "$3" "$4"
}

api_delete() {
    api_call "DELETE" "$1" "$2" "" "$3"
}

################################################################################
# ASSERTION FUNCTIONS
################################################################################

assert_success() {
    local response=$1
    local message=$2
    
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        return 0
    else
        log_debug "Response: $response"
        return 1
    fi
}

assert_failure() {
    local response=$1
    local message=$2
    
    local success=$(echo "$response" | jq -r '.success // true')
    
    if [ "$success" = "false" ]; then
        return 0
    else
        log_debug "Response: $response"
        return 1
    fi
}

assert_status_code() {
    local expected_code=$1
    local url=$2
    local token=$3
    local method=${4:-GET}
    
    local actual_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
        -H "Authorization: Bearer $token" "$API_URL$url")
    
    if [ "$actual_code" -eq "$expected_code" ]; then
        return 0
    else
        log_debug "Expected HTTP $expected_code, got $actual_code"
        return 1
    fi
}

assert_field_equals() {
    local response=$1
    local field=$2
    local expected_value=$3
    
    local actual_value=$(echo "$response" | jq -r ".$field // empty")
    
    if [ "$actual_value" = "$expected_value" ]; then
        return 0
    else
        log_debug "Field '$field': expected '$expected_value', got '$actual_value'"
        return 1
    fi
}

assert_field_exists() {
    local response=$1
    local field=$2
    
    local value=$(echo "$response" | jq -r ".$field // empty")
    
    if [ -n "$value" ] && [ "$value" != "null" ] && [ "$value" != "empty" ]; then
        return 0
    else
        log_debug "Field '$field' does not exist or is null"
        return 1
    fi
}

assert_field_contains() {
    local response=$1
    local field=$2
    local substring=$3
    
    local value=$(echo "$response" | jq -r ".$field // empty")
    
    if [[ "$value" == *"$substring"* ]]; then
        return 0
    else
        log_debug "Field '$field' value '$value' does not contain '$substring'"
        return 1
    fi
}

assert_array_length() {
    local response=$1
    local field=$2
    local expected_length=$3
    
    local actual_length=$(echo "$response" | jq ".$field | length")
    
    if [ "$actual_length" -eq "$expected_length" ]; then
        return 0
    else
        log_debug "Array '$field': expected length $expected_length, got $actual_length"
        return 1
    fi
}

assert_greater_than() {
    local response=$1
    local field=$2
    local min_value=$3
    
    local actual_value=$(echo "$response" | jq -r ".$field // 0")
    
    if (( $(echo "$actual_value > $min_value" | bc -l) )); then
        return 0
    else
        log_debug "Field '$field': value $actual_value is not greater than $min_value"
        return 1
    fi
}

################################################################################
# DATA EXTRACTION FUNCTIONS
################################################################################

extract_id() {
    local response=$1
    local field=${2:-data.id}
    
    echo "$response" | jq -r ".$field // empty"
}

extract_field() {
    local response=$1
    local field=$2
    
    echo "$response" | jq -r ".$field // empty"
}

extract_array_item() {
    local response=$1
    local array_field=$2
    local index=$3
    local item_field=$4
    
    echo "$response" | jq -r ".${array_field}[${index}].${item_field} // empty"
}

################################################################################
# FILE OPERATIONS
################################################################################

upload_file() {
    local endpoint=$1
    local token=$2
    local file_path=$3
    local field_name=${4:-file}
    
    curl -s -X POST "$API_URL$endpoint" \
        -H "Authorization: Bearer $token" \
        -F "${field_name}=@${file_path}"
}

create_test_file() {
    local filename=$1
    local content=${2:-"Test content"}
    
    echo "$content" > "/tmp/$filename"
    echo "/tmp/$filename"
}

################################################################################
# WAIT & RETRY FUNCTIONS
################################################################################

wait_for_status() {
    local endpoint=$1
    local token=$2
    local expected_status=$3
    local max_attempts=${4:-10}
    local sleep_seconds=${5:-2}
    
    for ((i=1; i<=max_attempts; i++)); do
        local response=$(api_get "$endpoint" "$token")
        local status=$(echo "$response" | jq -r '.data.status // empty')
        
        if [ "$status" = "$expected_status" ]; then
            return 0
        fi
        
        sleep $sleep_seconds
    done
    
    return 1
}

retry_on_failure() {
    local max_attempts=$1
    shift
    local command="$@"
    
    for ((i=1; i<=max_attempts; i++)); do
        if eval "$command"; then
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            sleep 2
        fi
    done
    
    return 1
}

################################################################################
# TEST SUMMARY FUNCTIONS
################################################################################

print_test_summary() {
    local suite_name=$1
    
    echo "" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
    echo "TEST SUMMARY - $suite_name" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo "Total Tests: $TOTAL_TESTS" | tee -a "$LOG_FILE"
    echo -e "Passed: ${GREEN}$PASSED_TESTS ✓${NC}" | tee -a "$LOG_FILE"
    echo -e "Failed: ${RED}$FAILED_TESTS ✗${NC}" | tee -a "$LOG_FILE"
    if [ -n "${SKIPPED_TESTS:-}" ] && [ "$SKIPPED_TESTS" -gt 0 ]; then
        echo -e "Skipped: ${YELLOW}$SKIPPED_TESTS ⊘${NC}" | tee -a "$LOG_FILE"
    fi
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        local success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
        echo "Success Rate: ${success_rate}%" | tee -a "$LOG_FILE"
    fi
    
    echo "" | tee -a "$LOG_FILE"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}" | tee -a "$LOG_FILE"
        return 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}" | tee -a "$LOG_FILE"
        return 1
    fi
}

reset_test_counters() {
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0
}

################################################################################
# UTILITY FUNCTIONS
################################################################################

generate_unique_id() {
    local prefix=$1
    echo "${prefix}-$(date +%s)"
}

random_string() {
    local length=${1:-8}
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

current_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

sleep_with_message() {
    local seconds=$1
    local message=${2:-"Waiting"}
    
    log_info "$message ($seconds seconds)..."
    sleep $seconds
}

################################################################################
# CLEANUP FUNCTIONS
################################################################################

cleanup_test_files() {
    rm -f /tmp/test_*.pdf
    rm -f /tmp/test_*.json
    rm -f /tmp/test_*.txt
}

trap_cleanup() {
    log_info "Cleaning up test files..."
    cleanup_test_files
}

# Register cleanup on exit
trap trap_cleanup EXIT

################################################################################
# EXPORT ALL FUNCTIONS
################################################################################

export -f log_section log_test log_pass log_fail log_skip log_info log_debug
export -f login_user refresh_token
export -f api_call api_get api_post api_put api_patch api_delete
export -f assert_success assert_failure assert_status_code
export -f assert_field_equals assert_field_exists assert_field_contains
export -f assert_array_length assert_greater_than
export -f extract_id extract_field extract_array_item
export -f upload_file create_test_file
export -f wait_for_status retry_on_failure
export -f print_test_summary reset_test_counters
export -f generate_unique_id random_string current_timestamp sleep_with_message
export -f cleanup_test_files trap_cleanup

log_debug "Test helper library loaded successfully"
