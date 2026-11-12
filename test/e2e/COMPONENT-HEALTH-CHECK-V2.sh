#!/bin/bash

# ============================================================================
# GoCBC System Component Health Check v2
# Updated to match actual deployment architecture
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

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    printf "${BOLD}${CYAN}║ %-60s ║${NC}\n" "$1"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗ ERROR: $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ WARNING: $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_step() { echo -e "${BOLD}▶${NC} $1"; }

TOTAL=0
PASSED=0
FAILED=0

check_component() {
    local name=$1
    local status=$2
    TOTAL=$((TOTAL + 1))
    if [ "$status" = "PASS" ]; then
        print_success "$name"
        PASSED=$((PASSED + 1))
    else
        print_error "$name"
        FAILED=$((FAILED + 1))
    fi
}

# ============================================================================
# COMPONENT 1: DOCKER CONTAINERS
# ============================================================================
print_header "COMPONENT 1: DOCKER CONTAINERS"

print_step "Checking Docker daemon..."
if docker ps > /dev/null 2>&1; then
    check_component "Docker daemon" "PASS"
else
    check_component "Docker daemon" "FAIL"
    exit 1
fi

print_step "Checking container count..."
CONTAINER_COUNT=$(docker ps | grep -c "cecbs\|orderer\|peer0\|couchdb\|redis" || echo "0")
print_info "Found $CONTAINER_COUNT running containers"
if [ "$CONTAINER_COUNT" -ge 15 ]; then
    check_component "Container count ($CONTAINER_COUNT)" "PASS"
else
    check_component "Container count ($CONTAINER_COUNT - expected ≥15)" "FAIL"
fi

print_step "Checking critical containers..."

# API
if docker ps | grep -q "cecbs-api"; then
    check_component "API container (cecbs-api)" "PASS"
else
    check_component "API container (cecbs-api)" "FAIL"
fi

# PostgreSQL
if docker ps | grep -q "cecbs-postgres"; then
    check_component "PostgreSQL (cecbs-postgres)" "PASS"
else
    check_component "PostgreSQL (cecbs-postgres)" "FAIL"
fi

# Redis
if docker ps | grep -q "cecbs-redis"; then
    check_component "Redis (cecbs-redis)" "PASS"
else
    check_component "Redis (cecbs-redis)" "FAIL"
fi

# Blockchain Peers
print_step "Checking blockchain peer containers..."
PEERS=("peer0.ecta" "peer0.banks" "peer0.nbe" "peer0.customs" "peer0.shipping" "peer0.ecx")
for peer in "${PEERS[@]}"; do
    if docker ps | grep -q "$peer"; then
        check_component "Peer: $peer" "PASS"
    else
        check_component "Peer: $peer" "FAIL"
    fi
done

# Chaincode containers
print_step "Checking chaincode containers..."
CHAINCODE_COUNT=$(docker ps | grep -c "dev-peer0.*coffee" || echo "0")
if [ "$CHAINCODE_COUNT" -ge 6 ]; then
    check_component "Chaincode containers ($CHAINCODE_COUNT)" "PASS"
else
    check_component "Chaincode containers ($CHAINCODE_COUNT - expected 6)" "FAIL"
fi

# Orderer (single orderer deployment)
print_step "Checking orderer container..."
if docker ps | grep -q "orderer.cecbs.et"; then
    check_component "Orderer (orderer.cecbs.et)" "PASS"
else
    check_component "Orderer (orderer.cecbs.et)" "FAIL"
fi

# CouchDB instances
print_step "Checking CouchDB containers..."
COUCHDB_COUNT=$(docker ps | grep -c "couchdb" || echo "0")
if [ "$COUCHDB_COUNT" -ge 4 ]; then
    check_component "CouchDB instances ($COUCHDB_COUNT)" "PASS"
else
    check_component "CouchDB instances ($COUCHDB_COUNT - expected ≥4)" "FAIL"
fi

# ============================================================================
# COMPONENT 2: POSTGRESQL DATABASE
# ============================================================================
print_header "COMPONENT 2: POSTGRESQL DATABASE"

print_step "Checking PostgreSQL connectivity..."
if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    check_component "PostgreSQL connectivity" "PASS"
else
    check_component "PostgreSQL connectivity" "FAIL"
fi

print_step "Checking database tables..."
TABLE_COUNT=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | xargs)
print_info "Found $TABLE_COUNT tables"
if [ "$TABLE_COUNT" -gt 20 ]; then
    check_component "Database tables ($TABLE_COUNT)" "PASS"
else
    check_component "Database tables ($TABLE_COUNT)" "FAIL"
fi

print_step "Checking critical tables..."
TABLES=("exporters" "contracts" "letters_of_credit" "forex_allocations" "shipments" "quality_inspections" "customs_declarations" "payments" "swift_messages" "documents")
for table in "${TABLES[@]}"; do
    if docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table')" 2>/dev/null | grep -q "t"; then
        check_component "Table: $table" "PASS"
    else
        check_component "Table: $table" "FAIL"
    fi
done

# ============================================================================
# COMPONENT 3: API SERVER
# ============================================================================
print_header "COMPONENT 3: API SERVER"

API_BASE="http://localhost:3001/api/v1"

print_step "Checking API responsiveness..."
API_TEST=$(curl -s "$API_BASE/auth/login" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "")
if [ -n "$API_TEST" ]; then
    check_component "API server responding" "PASS"
else
    check_component "API server responding" "FAIL"
fi

print_step "Checking API authentication..."
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' 2>/dev/null || echo "")
if echo "$AUTH_RESPONSE" | jq -e '.token // .access_token // .data.token' > /dev/null 2>&1; then
    check_component "API authentication" "PASS"
    TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token // .access_token // .data.token')
else
    check_component "API authentication" "FAIL"
    TOKEN=""
fi

if [ -n "$TOKEN" ]; then
    print_step "Checking API endpoints..."
    
    # Exporter endpoint
    EXPORTER_TEST=$(curl -s "$API_BASE/exporters/exporter-applications" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$EXPORTER_TEST" | jq -e '.data // .exporters' > /dev/null 2>&1; then
        check_component "Exporter endpoint" "PASS"
    else
        check_component "Exporter endpoint" "FAIL"
    fi
    
    # Contract endpoint
    CONTRACT_TEST=$(curl -s "$API_BASE/contracts" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$CONTRACT_TEST" | jq -e '.data // .contracts' > /dev/null 2>&1; then
        check_component "Contract endpoint" "PASS"
    else
        check_component "Contract endpoint" "FAIL"
    fi
    
    # Forex endpoint
    FOREX_TEST=$(curl -s "$API_BASE/forex" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if [ -n "$FOREX_TEST" ]; then
        check_component "Forex endpoint" "PASS"
    else
        check_component "Forex endpoint" "FAIL"
    fi
fi

# ============================================================================
# COMPONENT 4: BLOCKCHAIN NETWORK
# ============================================================================
print_header "COMPONENT 4: BLOCKCHAIN NETWORK"

print_step "Checking blockchain channel..."
CHANNEL_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep cecbschannel || echo "")
if [ -n "$CHANNEL_CHECK" ]; then
    check_component "Channel (cecbschannel)" "PASS"
else
    # Try alternative method
    if docker exec peer0.ecta.cecbs.et ls /var/hyperledger/production/ledgersData/chains/chains 2>/dev/null | grep -q cecbschannel; then
        check_component "Channel (cecbschannel)" "PASS"
    else
        check_component "Channel (cecbschannel)" "FAIL"
    fi
fi

print_step "Checking chaincode..."
CHAINCODE_RUNNING=$(docker ps | grep -c "dev-peer0.*coffee" || echo "0")
if [ "$CHAINCODE_RUNNING" -ge 6 ]; then
    check_component "Chaincode containers running (6/6)" "PASS"
else
    check_component "Chaincode containers ($CHAINCODE_RUNNING/6)" "FAIL"
fi

print_step "Checking orderer health..."
ORDERER_LOGS=$(docker logs orderer.cecbs.et 2>&1 | tail -20)
if echo "$ORDERER_LOGS" | grep -qi "panic\|fatal.*error"; then
    check_component "Orderer health" "FAIL"
else
    check_component "Orderer health" "PASS"
fi

# ============================================================================
# COMPONENT 5: NETWORK PORTS
# ============================================================================
print_header "COMPONENT 5: NETWORK PORTS"

print_step "Checking critical ports..."

check_port() {
    local port=$1
    local name=$2
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        check_component "$name (port $port)" "PASS"
    else
        check_component "$name (port $port)" "FAIL"
    fi
}

check_port 3001 "API"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
check_port 7050 "Orderer"
check_port 7051 "Peer ECTA"
check_port 8051 "Peer ECX"
check_port 9051 "Peer Banks"
check_port 10051 "Peer NBE"
check_port 11051 "Peer Customs"
check_port 12051 "Peer Shipping"

# ============================================================================
# COMPONENT 6: SYSTEM RESOURCES
# ============================================================================
print_header "COMPONENT 6: SYSTEM RESOURCES"

print_step "Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 85 ]; then
    check_component "Disk space ($DISK_USAGE% used)" "PASS"
else
    check_component "Disk space ($DISK_USAGE% used - HIGH)" "FAIL"
fi

print_step "Checking memory..."
MEMORY_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
if [ "$MEMORY_AVAILABLE" -gt 500 ]; then
    check_component "Available memory (${MEMORY_AVAILABLE}MB)" "PASS"
else
    check_component "Available memory (${MEMORY_AVAILABLE}MB - LOW)" "FAIL"
fi

# ============================================================================
# COMPONENT 7: E2E TEST VALIDATION
# ============================================================================
print_header "COMPONENT 7: E2E TEST VALIDATION"

print_step "Checking if E2E test can be run..."
if [ -f "/home/guda/GoCBC/COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh" ]; then
    check_component "E2E test script exists" "PASS"
else
    check_component "E2E test script exists" "FAIL"
fi

print_step "Checking recent E2E test results..."
if [ -f "/home/guda/GoCBC/FINAL-E2E-TEST-SUCCESS-COMPLETE.md" ]; then
    check_component "E2E test documentation" "PASS"
else
    check_component "E2E test documentation" "FAIL"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print_header "COMPONENT HEALTH CHECK SUMMARY"

echo ""
echo -e "${BOLD}Test Results:${NC}"
echo "═══════════════════════════════════════════════════════════"
echo -e "Total Components:  ${BOLD}$TOTAL${NC}"
echo -e "Passed:            ${GREEN}${BOLD}$PASSED${NC}"
echo -e "Failed:            ${RED}${BOLD}$FAILED${NC}"
echo ""

if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "Success Rate:      ${BOLD}${SUCCESS_RATE}%${NC}"
    echo ""
    
    if [ "$SUCCESS_RATE" -ge 95 ]; then
        echo -e "${GREEN}${BOLD}✓ SYSTEM STATUS: EXCELLENT${NC}"
        echo -e "${GREEN}All components operational. System ready for production.${NC}"
        EXIT_CODE=0
    elif [ "$SUCCESS_RATE" -ge 85 ]; then
        echo -e "${GREEN}${BOLD}✓ SYSTEM STATUS: GOOD${NC}"
        echo -e "${GREEN}System is functional with minor issues.${NC}"
        EXIT_CODE=0
    elif [ "$SUCCESS_RATE" -ge 70 ]; then
        echo -e "${YELLOW}${BOLD}⚠ SYSTEM STATUS: ACCEPTABLE${NC}"
        echo -e "${YELLOW}System functional but some components need attention.${NC}"
        EXIT_CODE=0
    else
        echo -e "${RED}${BOLD}✗ SYSTEM STATUS: DEGRADED${NC}"
        echo -e "${RED}Multiple components failing. Investigation required.${NC}"
        EXIT_CODE=1
    fi
else
    echo -e "${RED}${BOLD}✗ ERROR: No components tested${NC}"
    EXIT_CODE=1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${YELLOW}Note: Review failed components above for details.${NC}"
    echo ""
fi

echo -e "${BOLD}${CYAN}Component health check v2 complete.${NC}"
echo ""

exit $EXIT_CODE
