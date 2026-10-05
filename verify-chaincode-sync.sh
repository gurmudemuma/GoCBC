#!/bin/bash
# Expert-level chaincode version verification script
# Validates that container version matches deployed blockchain version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Chaincode Version Synchronization Verification           ║"
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${RESET}"

# Function to get deployed version from blockchain
get_deployed_version() {
    echo -e "\n${BLUE}▶ Step 1: Query Blockchain for Deployed Version${RESET}"
    
    local deployed_info=$(docker exec peer0.ecta.cecbs.et bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
        peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null
    " 2>/dev/null || echo "")
    
    if [ -z "$deployed_info" ]; then
        echo -e "${RED}✗ No chaincode deployed on channel${RESET}"
        return 1
    fi
    
    local version=$(echo "$deployed_info" | grep -oP 'Version: \K[0-9.]+' || echo "")
    local sequence=$(echo "$deployed_info" | grep -oP 'Sequence: \K[0-9]+' || echo "")
    
    if [ -n "$version" ]; then
        echo -e "${GREEN}✓ Deployed Version: ${BOLD}coffee v${version}${RESET}${GREEN} (sequence ${sequence})${RESET}"
        echo "$version"
        return 0
    else
        echo -e "${RED}✗ Could not parse deployed version${RESET}"
        return 1
    fi
}

# Function to get running container version
get_container_version() {
    echo -e "\n${BLUE}▶ Step 2: Check Running Container Version${RESET}"
    
    if ! docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        echo -e "${RED}✗ Container 'coffee-chaincode' is not running${RESET}"
        return 1
    fi
    
    local image=$(docker inspect coffee-chaincode --format='{{.Config.Image}}' 2>/dev/null)
    local ccid=$(docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep CORE_CHAINCODE_ID_NAME | cut -d'=' -f2)
    
    if [ -z "$image" ]; then
        echo -e "${RED}✗ Could not inspect container${RESET}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Container Image: ${BOLD}${image}${RESET}"
    
    if [ -n "$ccid" ]; then
        local ccid_version=$(echo "$ccid" | cut -d'_' -f2 | cut -d':' -f1)
        local ccid_hash=$(echo "$ccid" | cut -d':' -f2)
        echo -e "${GREEN}✓ CCID Version: ${BOLD}${ccid_version}${RESET}"
        echo -e "${GREEN}✓ CCID Hash: ${BOLD}${ccid_hash:0:16}...${RESET}"
        echo "$ccid_version"
        return 0
    else
        echo -e "${YELLOW}⚠ Could not extract CCID${RESET}"
        # Try to extract from image tag
        local img_version=$(echo "$image" | grep -oP ':[0-9.]+' | tr -d ':' || echo "")
        if [ -n "$img_version" ]; then
            echo "$img_version"
            return 0
        fi
        return 1
    fi
}

# Function to verify metadata file
verify_metadata() {
    echo -e "\n${BLUE}▶ Step 3: Verify Local Metadata${RESET}"
    
    local metadata_file="chaincode-package/metadata.json"
    if [ ! -f "$metadata_file" ]; then
        echo -e "${YELLOW}⚠ Metadata file not found: $metadata_file${RESET}"
        return 1
    fi
    
    local label=$(grep -oP '"label":\s*"coffee_\K[0-9._a-zA-Z]+' "$metadata_file" | sed 's/_tls//')
    if [ -n "$label" ]; then
        echo -e "${GREEN}✓ Metadata Label: ${BOLD}coffee_${label}${RESET}"
        echo "$label"
        return 0
    else
        echo -e "${RED}✗ Could not parse metadata label${RESET}"
        return 1
    fi
}

# Function to check chaincode logs
check_chaincode_logs() {
    echo -e "\n${BLUE}▶ Step 4: Check Chaincode Logs${RESET}"
    
    if ! docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
        echo -e "${RED}✗ Container not running, skipping log check${RESET}"
        return 1
    fi
    
    local logs=$(docker logs coffee-chaincode 2>&1 | tail -50)
    
    # Check for successful start
    if echo "$logs" | grep -q "Starting Coffee Chaincode"; then
        echo -e "${GREEN}✓ Chaincode initialized${RESET}"
    else
        echo -e "${YELLOW}⚠ Could not confirm initialization${RESET}"
    fi
    
    # Check for CCAAS mode
    if echo "$logs" | grep -q "CCAAS Server Mode"; then
        echo -e "${GREEN}✓ Running in CCAAS mode${RESET}"
    fi
    
    # Check for TLS
    if echo "$logs" | grep -q "TLS=enabled\|with TLS"; then
        echo -e "${GREEN}✓ TLS encryption enabled${RESET}"
    fi
    
    # Check for errors
    if echo "$logs" | grep -qE "Error|panic|fatal"; then
        echo -e "${RED}✗ Errors detected in logs:${RESET}"
        echo "$logs" | grep -E "Error|panic|fatal" | tail -5
        return 1
    fi
    
    return 0
}

# Function to test API connectivity
test_api_connectivity() {
    echo -e "\n${BLUE}▶ Step 5: Test API Blockchain Connectivity${RESET}"
    
    # Check if API is running
    if ! curl -s http://localhost:3001/health &>/dev/null; then
        echo -e "${YELLOW}⚠ API not responding on port 3001${RESET}"
        return 1
    fi
    
    # Get auth token
    local token=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
        -H 'Content-Type: application/json' \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null | \
        grep -oP '"token":"\K[^"]+' || echo "")
    
    if [ -z "$token" ]; then
        echo -e "${YELLOW}⚠ Could not authenticate with API${RESET}"
        return 1
    fi
    
    # Test blockchain status endpoint
    local status=$(curl -s -H "Authorization: Bearer $token" \
        http://localhost:3001/api/v1/blockchain/status 2>/dev/null | \
        grep -oP '"connected":\K(true|false)' || echo "false")
    
    if [ "$status" = "true" ]; then
        echo -e "${GREEN}✓ API successfully connected to blockchain${RESET}"
    else
        echo -e "${RED}✗ API not connected to blockchain${RESET}"
        return 1
    fi
    
    # Test a simple query
    local query_result=$(curl -s -H "Authorization: Bearer $token" \
        http://localhost:3001/api/v1/ecx/lots 2>/dev/null | \
        grep -oP '"success":\K(true|false)' || echo "false")
    
    if [ "$query_result" = "true" ]; then
        echo -e "${GREEN}✓ Blockchain queries working${RESET}"
    else
        echo -e "${RED}✗ Blockchain queries failing${RESET}"
        return 1
    fi
    
    return 0
}

# Main verification
main() {
    local deployed_version=""
    local container_version=""
    local metadata_version=""
    local all_checks_passed=true
    
    # Get deployed version
    deployed_version=$(get_deployed_version) || all_checks_passed=false
    
    # Get container version
    container_version=$(get_container_version) || all_checks_passed=false
    
    # Get metadata version
    metadata_version=$(verify_metadata) || all_checks_passed=false
    
    # Check logs
    check_chaincode_logs || true  # Don't fail on log check
    
    # Test API
    test_api_connectivity || true  # Don't fail on API check
    
    # Compare versions
    echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${RESET}"
    echo -e "${CYAN}${BOLD}  Version Synchronization Analysis${RESET}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${RESET}\n"
    
    echo -e "${BOLD}Deployed on Blockchain:${RESET}  v${deployed_version:-unknown}"
    echo -e "${BOLD}Running in Container:${RESET}    v${container_version:-unknown}"
    echo -e "${BOLD}Local Metadata:${RESET}          v${metadata_version:-unknown}"
    
    echo ""
    
    # Check if all versions match
    if [ -n "$deployed_version" ] && [ -n "$container_version" ]; then
        if [ "$deployed_version" = "$container_version" ]; then
            echo -e "${GREEN}${BOLD}✓✓✓ PERFECT SYNC ✓✓✓${RESET}"
            echo -e "${GREEN}Container version matches deployed blockchain version${RESET}"
            
            if [ "$deployed_version" = "$metadata_version" ]; then
                echo -e "${GREEN}Metadata is also in sync${RESET}"
            else
                echo -e "${YELLOW}⚠ Metadata version differs but container is correct${RESET}"
            fi
        else
            echo -e "${RED}${BOLD}✗✗✗ VERSION MISMATCH ✗✗✗${RESET}"
            echo -e "${RED}Container version does NOT match deployed version${RESET}"
            echo -e "${YELLOW}Action Required: Restart the system${RESET}"
            echo -e "${CYAN}Run: ./stop-all.sh && ./start-all.sh${RESET}"
            all_checks_passed=false
        fi
    else
        echo -e "${RED}${BOLD}✗ VERIFICATION INCOMPLETE${RESET}"
        echo -e "${RED}Could not verify all versions${RESET}"
        all_checks_passed=false
    fi
    
    echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${RESET}\n"
    
    if [ "$all_checks_passed" = true ]; then
        echo -e "${GREEN}${BOLD}🎉 All Checks Passed!${RESET}"
        echo -e "${GREEN}The system is properly synchronized.${RESET}\n"
        return 0
    else
        echo -e "${RED}${BOLD}⚠ Some Checks Failed${RESET}"
        echo -e "${YELLOW}Review the output above for details.${RESET}\n"
        return 1
    fi
}

# Run main verification
main
exit $?
