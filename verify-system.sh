#!/bin/bash
#
# GoCBC System Verification Script
# Quick health check for all system components
#

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
echo "================================================================"
echo "  GoCBC System Verification"
echo "  Quick Health Check for All Components"
echo "================================================================"
echo -e "${RESET}"

# Test counters
TOTAL=0
PASSED=0
FAILED=0

test_service() {
    local name=$1
    local test_cmd=$2
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing $name... "
    if eval "$test_cmd" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${RESET}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${RESET}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${BOLD}1. Docker Infrastructure${RESET}"
test_service "Docker daemon" "docker ps"
test_service "Docker Compose" "docker-compose --version"
echo ""

echo -e "${BOLD}2. Blockchain Containers${RESET}"
test_service "Orderer" "docker ps | grep orderer.cecbs.et"
test_service "Peer ECTA" "docker ps | grep peer0.ecta.cecbs.et"
test_service "Peer ECX" "docker ps | grep peer0.ecx.cecbs.et"
test_service "Peer Banks" "docker ps | grep peer0.banks.cecbs.et"
test_service "Peer NBE" "docker ps | grep peer0.nbe.cecbs.et"
test_service "Peer Customs" "docker ps | grep peer0.customs.cecbs.et"
test_service "Peer Shipping" "docker ps | grep peer0.shipping.cecbs.et"
test_service "Chaincode" "docker ps | grep coffee-chaincode"
echo ""

echo -e "${BOLD}3. Database Containers${RESET}"
test_service "CouchDB ECTA" "docker ps | grep couchdb.ecta"
test_service "CouchDB ECX" "docker ps | grep couchdb.ecx"
test_service "CouchDB Banks" "docker ps | grep couchdb.banks"
test_service "CouchDB NBE" "docker ps | grep couchdb.nbe"
test_service "CouchDB Customs" "docker ps | grep couchdb.customs"
test_service "CouchDB Shipping" "docker ps | grep couchdb.shipping"
test_service "PostgreSQL" "docker ps | grep cecbs-postgres"
test_service "Redis" "docker ps | grep cecbs-redis"
echo ""

echo -e "${BOLD}4. Service Connectivity${RESET}"
test_service "CouchDB API" "curl -s http://localhost:5984/ | grep -q couchdb"
test_service "API Health" "curl -s http://localhost:3001/health | grep -q healthy"
test_service "UI Access" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q 200"
echo ""

echo -e "${BOLD}5. Blockchain Channel${RESET}"
test_service "Channel Data" "curl -s http://localhost:5984/coffeechannel/_all_docs | grep -q total_rows"
echo ""

echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  Test Results"
echo "================================================================"
echo -e "${RESET}"

echo -e "Total Tests:  ${BOLD}$TOTAL${RESET}"
echo -e "Passed:       ${GREEN}${BOLD}$PASSED${RESET}"
echo -e "Failed:       ${RED}${BOLD}$FAILED${RESET}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL SYSTEMS OPERATIONAL${RESET}"
    echo ""
    echo -e "${CYAN}System Information:${RESET}"
    echo -e "  UI:  http://localhost:3000"
    echo -e "  API: http://localhost:3001"
    echo -e "  Docs: http://localhost:3001/api-docs"
    echo -e "  Health: http://localhost:3001/health"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TESTS FAILED${RESET}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${RESET}"
    echo "  1. Check Docker: docker ps"
    echo "  2. Check logs: docker logs <container-name>"
    echo "  3. Restart system: ./start-all.sh"
    echo ""
    exit 1
fi
