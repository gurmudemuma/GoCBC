#!/bin/bash

################################################################################
# GoCBC System Test Script
# Comprehensive testing of all system components
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                       ║${NC}"
echo -e "${CYAN}║                    GoCBC System Test Suite                           ║${NC}"
echo -e "${CYAN}║                                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    local expected=$3
    
    echo -e "${BLUE}Testing:${NC} $test_name"
    
    result=$(eval "$test_command" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$result" | grep -q "$expected"; then
        echo -e "  ${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}✗ FAILED${NC}"
        if [ ! -z "$result" ]; then
            echo -e "  ${YELLOW}Output:${NC} $(echo "$result" | head -3)"
        fi
        ((FAILED++))
        return 1
    fi
}

# Section 1: API Tests
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Section 1: API Server Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_test "API Health Endpoint" \
    "curl -s --max-time 5 http://localhost:3001/health" \
    "status"

run_test "API Authentication (admin login)" \
    "curl -s --max-time 5 -X POST http://localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" \
    "token"

# Get token for further tests
TOKEN=$(curl -s --max-time 5 -X POST http://localhost:3001/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}  ℹ Token obtained for authenticated tests${NC}"
    
    run_test "API /me Endpoint (with auth)" \
        "curl -s --max-time 5 http://localhost:3001/api/v1/auth/me -H 'Authorization: Bearer $TOKEN'" \
        "username"
else
    echo -e "${YELLOW}  ⚠ No token obtained - skipping authenticated tests${NC}"
    ((WARNINGS++))
fi

echo ""

# Section 2: UI Tests
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Section 2: UI Server Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

run_test "UI Server Responding" \
    "curl -s --max-time 5 -I http://localhost:3000" \
    "200"

run_test "UI Login Page" \
    "curl -s --max-time 5 http://localhost:3000/login" \
    "login"

echo ""

# Section 3: Database Tests
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Section 3: Database Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "api/.env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [ ! -z "$DATABASE_URL" ] && command -v psql &> /dev/null; then
        run_test "Database Connection" \
            "psql \"$DATABASE_URL\" -c 'SELECT 1;'" \
            "1 row"
        
        run_test "Users Table Exists" \
            "psql \"$DATABASE_URL\" -c 'SELECT COUNT(*) FROM users;'" \
            "row"
        
        USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ')
        if [ ! -z "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
            echo -e "${BLUE}Testing:${NC} Active Users Count"
            echo -e "  ${GREEN}✓ PASSED${NC} ($USER_COUNT active users found)"
            ((PASSED++))
        else
            echo -e "${BLUE}Testing:${NC} Active Users Count"
            echo -e "  ${RED}✗ FAILED${NC} (No active users found)"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}  ⚠ Skipping database tests (psql not available or DATABASE_URL not set)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}  ⚠ Skipping database tests (api/.env not found)${NC}"
    ((WARNINGS++))
fi

echo ""

# Section 4: Blockchain Tests
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Section 4: Blockchain Network Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v docker &> /dev/null; then
    run_test "Orderer Container Running" \
        "docker ps --format '{{.Names}}' | grep orderer.cecbs.et" \
        "orderer"
    
    PEER_COUNT=$(docker ps --format '{{.Names}}' | grep -c "peer0\." 2>/dev/null || echo "0")
    echo -e "${BLUE}Testing:${NC} Peer Containers Running"
    if [ "$PEER_COUNT" -ge 6 ]; then
        echo -e "  ${GREEN}✓ PASSED${NC} ($PEER_COUNT peers running)"
        ((PASSED++))
    else
        echo -e "  ${RED}✗ FAILED${NC} (Expected 6 peers, found $PEER_COUNT)"
        ((FAILED++))
    fi
    
    run_test "Chaincode Container Running" \
        "docker ps --format '{{.Names}}' | grep coffee" \
        "coffee"
    
    # Test chaincode query
    echo -e "${BLUE}Testing:${NC} Chaincode Query (committed status)"
    CHAINCODE_RESULT=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID coffeechannel --name coffee 2>&1 || echo "FAILED")
    
    if echo "$CHAINCODE_RESULT" | grep -q "Version:"; then
        VERSION=$(echo "$CHAINCODE_RESULT" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
        echo -e "  ${GREEN}✓ PASSED${NC} (Version: $VERSION)"
        ((PASSED++))
    else
        echo -e "  ${RED}✗ FAILED${NC} (Chaincode not committed)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}  ⚠ Skipping blockchain tests (docker not available)${NC}"
    ((WARNINGS++))
fi

echo ""

# Section 5: Integration Tests
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Section 5: Integration Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -z "$TOKEN" ]; then
    # Test exporters endpoint
    run_test "API Exporters Endpoint" \
        "curl -s --max-time 5 http://localhost:3001/api/v1/exporters -H 'Authorization: Bearer $TOKEN'" \
        "success"
    
    # Test contracts endpoint
    run_test "API Contracts Endpoint" \
        "curl -s --max-time 5 http://localhost:3001/api/v1/contracts -H 'Authorization: Bearer $TOKEN'" \
        "success"
else
    echo -e "${YELLOW}  ⚠ Skipping integration tests (no auth token)${NC}"
    ((WARNINGS++))
fi

echo ""

# Summary
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                          Test Summary                                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=0
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
fi

echo -e "  Total Tests:     ${CYAN}$TOTAL${NC}"
echo -e "  Passed:          ${GREEN}$PASSED${NC}"
echo -e "  Failed:          ${RED}$FAILED${NC}"
echo -e "  Warnings:        ${YELLOW}$WARNINGS${NC}"
echo -e "  Success Rate:    ${CYAN}${SUCCESS_RATE}%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                       ║${NC}"
    echo -e "${GREEN}║                    ✓ ALL TESTS PASSED!                               ║${NC}"
    echo -e "${GREEN}║                                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}System is fully operational and ready to use!${NC}"
    echo ""
    echo -e "${YELLOW}Access URLs:${NC}"
    echo -e "  • Main Application:  http://localhost:3000"
    echo -e "  • API Server:        http://localhost:3001"
    echo -e "  • API Docs:          http://localhost:3001/api-docs"
    echo ""
    echo -e "${YELLOW}Test Credentials:${NC}"
    echo -e "  • Username:  admin"
    echo -e "  • Password:  admin123"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                       ║${NC}"
    echo -e "${RED}║                    ✗ SOME TESTS FAILED                               ║${NC}"
    echo -e "${RED}║                                                                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Please check the failed tests above and review logs:${NC}"
    echo -e "  • API Logs:  tail -f logs/api.log"
    echo -e "  • UI Logs:   tail -f logs/ui.log"
    echo -e "  • Status:    ./status.sh"
    echo ""
    exit 1
fi
