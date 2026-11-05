#!/bin/bash

# ============================================================================
# GoCBC System Component Health Check
# ============================================================================
# This script verifies all system components are running and healthy
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    printf "${BOLD}${CYAN}║ %-60s ║${NC}\n" "$1"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "${BOLD}▶${NC} $1"
}

# Component counters
TOTAL_COMPONENTS=0
PASSED_COMPONENTS=0
FAILED_COMPONENTS=0

check_component() {
    local name=$1
    local status=$2
    TOTAL_COMPONENTS=$((TOTAL_COMPONENTS + 1))
    if [ "$status" = "PASS" ]; then
        print_success "$name"
        PASSED_COMPONENTS=$((PASSED_COMPONENTS + 1))
    else
        print_error "$name"
        FAILED_COMPONENTS=$((FAILED_COMPONENTS + 1))
    fi
}

# ============================================================================
# COMPONENT 1: DOCKER CONTAINERS
# ============================================================================
print_header "COMPONENT 1: DOCKER CONTAINERS"

print_step "Checking Docker daemon..."
if docker ps > /dev/null 2>&1; then
    check_component "Docker daemon running" "PASS"
else
    check_component "Docker daemon running" "FAIL"
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_step "Checking container count..."
CONTAINER_COUNT=$(docker ps --filter "name=cecbs" --format "{{.Names}}" | wc -l)
if [ "$CONTAINER_COUNT" -gt 20 ]; then
    check_component "Container count ($CONTAINER_COUNT containers)" "PASS"
else
    check_component "Container count ($CONTAINER_COUNT containers - expected >20)" "FAIL"
fi

print_step "Checking critical containers..."

# API Container
if docker ps --filter "name=cecbs-api" --format "{{.Names}}" | grep -q cecbs-api; then
    check_component "API container (cecbs-api)" "PASS"
else
    check_component "API container (cecbs-api)" "FAIL"
fi

# PostgreSQL Container
if docker ps --filter "name=cecbs-postgres" --format "{{.Names}}" | grep -q cecbs-postgres; then
    check_component "PostgreSQL container (cecbs-postgres)" "PASS"
else
    check_component "PostgreSQL container (cecbs-postgres)" "FAIL"
fi

# Blockchain Peers
print_step "Checking blockchain peer containers..."
PEERS=("peer0.ecta" "peer0.banks" "peer0.nbe" "peer0.customs" "peer0.shipping" "peer0.ecx")
for peer in "${PEERS[@]}"; do
    if docker ps --filter "name=$peer" --format "{{.Names}}" | grep -q "$peer"; then
        check_component "Peer: $peer" "PASS"
    else
        check_component "Peer: $peer" "FAIL"
    fi
done

# Orderers
print_step "Checking orderer containers..."
ORDERERS=("orderer1.cecbs.et" "orderer2.cecbs.et" "orderer3.cecbs.et")
for orderer in "${ORDERERS[@]}"; do
    if docker ps --filter "name=$orderer" --format "{{.Names}}" | grep -q "$orderer"; then
        check_component "Orderer: $orderer" "PASS"
    else
        check_component "Orderer: $orderer" "FAIL"
    fi
done

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
if [ "$TABLE_COUNT" -gt 20 ]; then
    check_component "Database tables ($TABLE_COUNT tables)" "PASS"
else
    check_component "Database tables ($TABLE_COUNT tables - expected >20)" "FAIL"
fi

print_step "Checking critical tables..."
TABLES=("exporters" "contracts" "letters_of_credit" "forex_allocations" "shipments" "quality_inspections" "customs_declarations" "payments")
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

print_step "Checking API health endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/health" 2>/dev/null || echo "")
if echo "$HEALTH_RESPONSE" | grep -q "healthy\|UP\|ok"; then
    check_component "API health endpoint" "PASS"
else
    check_component "API health endpoint" "FAIL"
fi

print_step "Checking API authentication..."
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' 2>/dev/null || echo "")
if echo "$AUTH_RESPONSE" | jq -e '.token // .access_token // .data.token' > /dev/null 2>&1; then
    check_component "API authentication (login)" "PASS"
    TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token // .access_token // .data.token')
else
    check_component "API authentication (login)" "FAIL"
    TOKEN=""
fi

print_step "Checking API endpoints..."
if [ -n "$TOKEN" ]; then
    # Test exporter endpoint
    EXPORTER_TEST=$(curl -s -X GET "$API_BASE/exporters/exporter-applications" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$EXPORTER_TEST" | jq -e '.data // .exporters' > /dev/null 2>&1; then
        check_component "Exporter API endpoint" "PASS"
    else
        check_component "Exporter API endpoint" "FAIL"
    fi
    
    # Test contract endpoint
    CONTRACT_TEST=$(curl -s -X GET "$API_BASE/contracts" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$CONTRACT_TEST" | jq -e '.data // .contracts' > /dev/null 2>&1; then
        check_component "Contract API endpoint" "PASS"
    else
        check_component "Contract API endpoint" "FAIL"
    fi
else
    print_warning "Skipping endpoint tests - authentication failed"
fi

# ============================================================================
# COMPONENT 4: BLOCKCHAIN NETWORK
# ============================================================================
print_header "COMPONENT 4: BLOCKCHAIN NETWORK"

print_step "Checking blockchain channel..."
CHANNEL_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep cecbschannel || echo "")
if [ -n "$CHANNEL_CHECK" ]; then
    check_component "Blockchain channel (cecbschannel)" "PASS"
else
    check_component "Blockchain channel (cecbschannel)" "FAIL"
fi

print_step "Checking chaincode installation..."
CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | grep coffee || echo "")
if [ -n "$CHAINCODE_CHECK" ]; then
    check_component "Chaincode installed (coffee)" "PASS"
else
    check_component "Chaincode installed (coffee)" "FAIL"
fi

print_step "Checking chaincode commitment..."
CHAINCODE_COMMIT=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C cecbschannel 2>/dev/null | grep coffee || echo "")
if [ -n "$CHAINCODE_COMMIT" ]; then
    check_component "Chaincode committed (coffee)" "PASS"
else
    check_component "Chaincode committed (coffee)" "FAIL"
fi

print_step "Checking peer connectivity..."
for peer in "${PEERS[@]}"; do
    PEER_STATUS=$(docker logs "${peer}.cecbs.et" 2>&1 | tail -20 | grep -i "error\|panic\|fatal" || echo "")
    if [ -z "$PEER_STATUS" ]; then
        check_component "Peer connectivity: $peer" "PASS"
    else
        check_component "Peer connectivity: $peer (has errors)" "FAIL"
    fi
done

# ============================================================================
# COMPONENT 5: NETWORK PORTS
# ============================================================================
print_header "COMPONENT 5: NETWORK PORTS"

print_step "Checking critical ports..."

# API Port
if netstat -tuln 2>/dev/null | grep -q ":3001 " || ss -tuln 2>/dev/null | grep -q ":3001 "; then
    check_component "API port (3001)" "PASS"
else
    check_component "API port (3001)" "FAIL"
fi

# PostgreSQL Port
if netstat -tuln 2>/dev/null | grep -q ":5432 " || ss -tuln 2>/dev/null | grep -q ":5432 "; then
    check_component "PostgreSQL port (5432)" "PASS"
else
    check_component "PostgreSQL port (5432)" "FAIL"
fi

# Peer Ports (7051, 8051, 9051, 10051, 11051, 12051)
PEER_PORTS=(7051 8051 9051 10051 11051 12051)
for port in "${PEER_PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        check_component "Peer port ($port)" "PASS"
    else
        check_component "Peer port ($port)" "FAIL"
    fi
done

# ============================================================================
# COMPONENT 6: FILE SYSTEM
# ============================================================================
print_header "COMPONENT 6: FILE SYSTEM"

print_step "Checking critical directories..."

DIRS=(
    "/home/guda/GoCBC/api"
    "/home/guda/GoCBC/blockchain"
    "/home/guda/GoCBC/chaincodes"
    "/home/guda/GoCBC/blockchain/organizations"
    "/home/guda/GoCBC/blockchain/channel-artifacts"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_component "Directory: $dir" "PASS"
    else
        check_component "Directory: $dir" "FAIL"
    fi
done

print_step "Checking critical files..."

FILES=(
    "/home/guda/GoCBC/start-all.sh"
    "/home/guda/GoCBC/COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh"
    "/home/guda/GoCBC/api/package.json"
    "/home/guda/GoCBC/chaincodes/coffee/main.go"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_component "File: $(basename $file)" "PASS"
    else
        check_component "File: $(basename $file)" "FAIL"
    fi
done

# ============================================================================
# COMPONENT 7: SYSTEM RESOURCES
# ============================================================================
print_header "COMPONENT 7: SYSTEM RESOURCES"

print_step "Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    check_component "Disk space ($DISK_USAGE% used)" "PASS"
else
    check_component "Disk space ($DISK_USAGE% used - WARNING)" "FAIL"
fi

print_step "Checking memory..."
MEMORY_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
if [ "$MEMORY_AVAILABLE" -gt 500 ]; then
    check_component "Available memory (${MEMORY_AVAILABLE}MB)" "PASS"
else
    check_component "Available memory (${MEMORY_AVAILABLE}MB - LOW)" "FAIL"
fi

print_step "Checking Docker resources..."
DOCKER_CONTAINERS_RUNNING=$(docker ps --filter "status=running" --filter "name=cecbs" -q | wc -l)
if [ "$DOCKER_CONTAINERS_RUNNING" -gt 20 ]; then
    check_component "Running Docker containers ($DOCKER_CONTAINERS_RUNNING)" "PASS"
else
    check_component "Running Docker containers ($DOCKER_CONTAINERS_RUNNING - expected >20)" "FAIL"
fi

# ============================================================================
# COMPONENT 8: LOGS AND MONITORING
# ============================================================================
print_header "COMPONENT 8: LOGS AND MONITORING"

print_step "Checking API logs..."
API_ERRORS=$(docker logs cecbs-api 2>&1 | tail -100 | grep -i "error\|fatal\|panic" | wc -l)
if [ "$API_ERRORS" -eq 0 ]; then
    check_component "API logs (no recent errors)" "PASS"
else
    check_component "API logs ($API_ERRORS recent errors)" "FAIL"
fi

print_step "Checking PostgreSQL logs..."
PG_ERRORS=$(docker logs cecbs-postgres 2>&1 | tail -100 | grep -i "error\|fatal" | grep -v "checkpoint starting\|checkpoint complete" | wc -l)
if [ "$PG_ERRORS" -eq 0 ]; then
    check_component "PostgreSQL logs (no recent errors)" "PASS"
else
    check_component "PostgreSQL logs ($PG_ERRORS recent errors)" "FAIL"
fi

print_step "Checking orderer logs..."
ORDERER_ERRORS=$(docker logs orderer1.cecbs.et 2>&1 | tail -100 | grep -i "error\|fatal\|panic" | wc -l)
if [ "$ORDERER_ERRORS" -eq 0 ]; then
    check_component "Orderer logs (no recent errors)" "PASS"
else
    check_component "Orderer logs ($ORDERER_ERRORS recent errors)" "FAIL"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print_header "COMPONENT HEALTH CHECK SUMMARY"

echo ""
echo -e "${BOLD}Component Test Results:${NC}"
echo "═══════════════════════════════════════════════════════════"
echo -e "Total Components Checked: ${BOLD}$TOTAL_COMPONENTS${NC}"
echo -e "Components Passed:        ${GREEN}${BOLD}$PASSED_COMPONENTS${NC}"
echo -e "Components Failed:        ${RED}${BOLD}$FAILED_COMPONENTS${NC}"
echo ""

# Calculate percentage
if [ "$TOTAL_COMPONENTS" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_COMPONENTS * 100 / TOTAL_COMPONENTS))
    echo -e "Success Rate:             ${BOLD}${SUCCESS_RATE}%${NC}"
    echo ""
    
    if [ "$SUCCESS_RATE" -ge 95 ]; then
        echo -e "${GREEN}${BOLD}✓ SYSTEM STATUS: EXCELLENT${NC}"
        echo -e "${GREEN}All critical components are operational.${NC}"
        EXIT_CODE=0
    elif [ "$SUCCESS_RATE" -ge 80 ]; then
        echo -e "${YELLOW}${BOLD}⚠ SYSTEM STATUS: GOOD${NC}"
        echo -e "${YELLOW}Most components operational with minor issues.${NC}"
        EXIT_CODE=0
    elif [ "$SUCCESS_RATE" -ge 60 ]; then
        echo -e "${YELLOW}${BOLD}⚠ SYSTEM STATUS: DEGRADED${NC}"
        echo -e "${YELLOW}Some components have issues. Manual check recommended.${NC}"
        EXIT_CODE=1
    else
        echo -e "${RED}${BOLD}✗ SYSTEM STATUS: CRITICAL${NC}"
        echo -e "${RED}Multiple components failing. System may not function properly.${NC}"
        EXIT_CODE=1
    fi
else
    echo -e "${RED}${BOLD}✗ ERROR: No components were tested${NC}"
    EXIT_CODE=1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAILED_COMPONENTS" -gt 0 ]; then
    echo -e "${YELLOW}Failed Components Summary:${NC}"
    echo "Review the output above for details on failed components."
    echo ""
fi

echo -e "${BOLD}${CYAN}Component health check complete.${NC}"
echo ""

exit $EXIT_CODE
