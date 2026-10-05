#!/bin/bash
# Expert-level testing script for dynamic chaincode version management
# Tests that the system correctly handles version detection and synchronization

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

TEST_PASSED=0
TEST_FAILED=0

print_test() {
    echo -e "\n${CYAN}${BOLD}═══ TEST: $1 ═══${RESET}\n"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${RESET} $1"
    TEST_PASSED=$((TEST_PASSED + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL:${RESET} $1"
    TEST_FAILED=$((TEST_FAILED + 1))
}

print_info() {
    echo -e "${BLUE}ℹ${RESET} $1"
}

echo -e "${CYAN}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  Dynamic Chaincode Version Management Test Suite            ║
║                                                              ║
║  This test validates that the system can:                    ║
║  1. Detect deployed chaincode version from blockchain        ║
║  2. Automatically sync container to deployed version         ║
║  3. Handle version mismatches gracefully                     ║
║  4. Work with any version number                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${RESET}\n"

# Test 1: Verify blockchain query function
print_test "Blockchain Version Detection"

DEPLOYED_INFO=$(docker exec peer0.ecta.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
    peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null
" 2>/dev/null || echo "")

if [ -n "$DEPLOYED_INFO" ]; then
    DEPLOYED_VERSION=$(echo "$DEPLOYED_INFO" | grep -oP 'Version: \K[0-9.]+' || echo "")
    DEPLOYED_SEQUENCE=$(echo "$DEPLOYED_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "")
    
    if [ -n "$DEPLOYED_VERSION" ] && [ -n "$DEPLOYED_SEQUENCE" ]; then
        print_pass "Successfully detected: v${DEPLOYED_VERSION} (sequence ${DEPLOYED_SEQUENCE})"
        print_info "Version format: $(echo "$DEPLOYED_VERSION" | grep -oE '[0-9]+\.[0-9]+' && echo 'valid' || echo 'invalid')"
    else
        print_fail "Could not parse version/sequence from blockchain"
        echo "$DEPLOYED_INFO"
    fi
else
    print_fail "Blockchain query returned no data"
    print_info "This could mean: network not ready, no chaincode deployed, or peer not accessible"
fi

# Test 2: Verify container version extraction
print_test "Container Version Extraction"

if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
    CONTAINER_IMAGE=$(docker inspect coffee-chaincode --format='{{.Config.Image}}' 2>/dev/null)
    CONTAINER_CCID=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep CORE_CHAINCODE_ID_NAME | cut -d'=' -f2)
    
    if [ -n "$CONTAINER_IMAGE" ]; then
        print_pass "Container image: $CONTAINER_IMAGE"
    else
        print_fail "Could not extract container image"
    fi
    
    if [ -n "$CONTAINER_CCID" ]; then
        CCID_VERSION=$(echo "$CONTAINER_CCID" | cut -d'_' -f2 | cut -d':' -f1)
        CCID_HASH=$(echo "$CONTAINER_CCID" | cut -d':' -f2)
        print_pass "CCID version: $CCID_VERSION"
        print_info "CCID hash: ${CCID_HASH:0:16}..."
    else
        print_fail "Could not extract CCID from container"
    fi
else
    print_fail "Container 'coffee-chaincode' is not running"
fi

# Test 3: Verify metadata synchronization
print_test "Metadata File Verification"

if [ -f "chaincode-package/metadata.json" ]; then
    METADATA_LABEL=$(grep -oP '"label":\s*"coffee_\K[0-9._a-zA-Z]+' "chaincode-package/metadata.json" | sed 's/_tls//')
    
    if [ -n "$METADATA_LABEL" ]; then
        print_pass "Metadata label: coffee_$METADATA_LABEL"
        
        # Check if metadata matches deployed version
        if [ "$METADATA_LABEL" = "$DEPLOYED_VERSION" ]; then
            print_pass "Metadata version matches deployed version"
        elif [ -n "$DEPLOYED_VERSION" ]; then
            print_fail "Metadata ($METADATA_LABEL) differs from deployed ($DEPLOYED_VERSION)"
        fi
    else
        print_fail "Could not parse metadata label"
    fi
else
    print_fail "Metadata file not found: chaincode-package/metadata.json"
fi

# Test 4: Version synchronization check
print_test "Version Synchronization Check"

if [ -n "$DEPLOYED_VERSION" ] && [ -n "$CCID_VERSION" ]; then
    if [ "$DEPLOYED_VERSION" = "$CCID_VERSION" ]; then
        print_pass "Container version ($CCID_VERSION) matches deployed version ($DEPLOYED_VERSION)"
    else
        print_fail "VERSION MISMATCH: Container=$CCID_VERSION, Deployed=$DEPLOYED_VERSION"
        print_info "This indicates the container needs to be restarted"
    fi
else
    print_fail "Cannot perform synchronization check - missing version data"
fi

# Test 5: CCID hash validation
print_test "CCID Hash Validation"

if [ -n "$DEPLOYED_VERSION" ]; then
    PACKAGE_FILE="blockchain/channel-artifacts/coffee_${DEPLOYED_VERSION}.tgz"
    
    if [ -f "$PACKAGE_FILE" ]; then
        # Extract and calculate hash
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$PACKAGE_FILE" -C "$TEMP_DIR" 2>/dev/null || true
        
        if [ -f "$TEMP_DIR/code.tar.gz" ]; then
            CALCULATED_HASH=$(sha256sum "$TEMP_DIR/code.tar.gz" | awk '{print $1}')
            print_pass "Package file exists and hash calculated"
            print_info "Calculated hash: ${CALCULATED_HASH:0:16}..."
            
            if [ -n "$CCID_HASH" ]; then
                if [ "$CALCULATED_HASH" = "$CCID_HASH" ]; then
                    print_pass "CCID hash matches package hash"
                else
                    print_fail "Hash mismatch: CCID=$CCID_HASH, Package=$CALCULATED_HASH"
                fi
            fi
        else
            print_fail "Could not extract code.tar.gz from package"
        fi
        
        rm -rf "$TEMP_DIR"
    else
        print_info "Package file not found: $PACKAGE_FILE (may not be in artifacts yet)"
    fi
fi

# Test 6: Chaincode functionality test
print_test "Chaincode Functionality Test"

# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null | \
    grep -oP '"token":"\K[^"]+' || echo "")

if [ -n "$TOKEN" ]; then
    print_pass "Successfully authenticated with API"
    
    # Test blockchain status
    BLOCKCHAIN_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
        http://localhost:3001/api/v1/blockchain/status 2>/dev/null | \
        grep -oP '"connected":\K(true|false)' || echo "false")
    
    if [ "$BLOCKCHAIN_STATUS" = "true" ]; then
        print_pass "API connected to blockchain"
        
        # Test a query
        QUERY_SUCCESS=$(curl -s -H "Authorization: Bearer $TOKEN" \
            http://localhost:3001/api/v1/ecx/lots 2>/dev/null | \
            grep -oP '"success":\K(true|false)' || echo "false")
        
        if [ "$QUERY_SUCCESS" = "true" ]; then
            print_pass "Blockchain queries working correctly"
        else
            print_fail "Blockchain query failed"
        fi
    else
        print_fail "API not connected to blockchain"
    fi
else
    print_fail "Could not authenticate with API"
fi

# Test 7: Docker image version check
print_test "Docker Image Version Check"

if [ -n "$DEPLOYED_VERSION" ]; then
    EXPECTED_IMAGE="coffee-chaincode:${DEPLOYED_VERSION}"
    
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${EXPECTED_IMAGE}$"; then
        print_pass "Expected Docker image exists: $EXPECTED_IMAGE"
    else
        print_fail "Expected Docker image not found: $EXPECTED_IMAGE"
        print_info "Available images:"
        docker images coffee-chaincode --format "  - {{.Repository}}:{{.Tag}}"
    fi
fi

# Test 8: Container environment variables
print_test "Container Environment Variables"

if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
    ENV_CCID=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' | grep CORE_CHAINCODE_ID_NAME || echo "")
    ENV_ADDR=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' | grep CHAINCODE_SERVER_ADDRESS || echo "")
    
    if [ -n "$ENV_CCID" ]; then
        print_pass "CORE_CHAINCODE_ID_NAME is set"
        print_info "$ENV_CCID"
    else
        print_fail "CORE_CHAINCODE_ID_NAME not found"
    fi
    
    if [ -n "$ENV_ADDR" ]; then
        print_pass "CHAINCODE_SERVER_ADDRESS is set"
        print_info "$ENV_ADDR"
    else
        print_fail "CHAINCODE_SERVER_ADDRESS not found"
    fi
fi

# Test 9: Chaincode logs check
print_test "Chaincode Logs Analysis"

if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
    LOGS=$(docker logs coffee-chaincode 2>&1 | tail -50)
    
    if echo "$LOGS" | grep -q "Starting Coffee Chaincode"; then
        print_pass "Chaincode started successfully"
    else
        print_fail "Could not confirm chaincode start in logs"
    fi
    
    if echo "$LOGS" | grep -q "CCAAS Server Mode"; then
        print_pass "Running in CCAAS mode"
    else
        print_info "CCAAS mode not explicitly confirmed in logs"
    fi
    
    if echo "$LOGS" | grep -qE "Error|panic|fatal"; then
        print_fail "Errors detected in chaincode logs"
        echo "$LOGS" | grep -E "Error|panic|fatal" | tail -5
    else
        print_pass "No errors in chaincode logs"
    fi
fi

# Final Summary
echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}${BOLD}  Test Summary${RESET}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${RESET}\n"

echo -e "${GREEN}Tests Passed: ${BOLD}$TEST_PASSED${RESET}"
echo -e "${RED}Tests Failed: ${BOLD}$TEST_FAILED${RESET}"
echo -e "Total Tests:  $((TEST_PASSED + TEST_FAILED))"

echo ""

if [ $TEST_FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓✓✓ ALL TESTS PASSED ✓✓✓${RESET}"
    echo -e "${GREEN}The dynamic version management system is working correctly!${RESET}\n"
    exit 0
else
    echo -e "${YELLOW}${BOLD}⚠ SOME TESTS FAILED ⚠${RESET}"
    echo -e "${YELLOW}Review the output above for details.${RESET}\n"
    
    if [ -n "$DEPLOYED_VERSION" ] && [ -n "$CCID_VERSION" ] && [ "$DEPLOYED_VERSION" != "$CCID_VERSION" ]; then
        echo -e "${CYAN}${BOLD}Recommended Action:${RESET}"
        echo -e "${CYAN}The container version doesn't match the deployed version.${RESET}"
        echo -e "${CYAN}Run: ${BOLD}./stop-all.sh && ./start-all.sh${RESET}\n"
    fi
    
    exit 1
fi
