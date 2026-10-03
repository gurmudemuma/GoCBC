#!/bin/bash
##################################################################
# Complete System Verification Script
# Verifies that start-all.sh did everything correctly
##################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================================================================
print_header "CECBS Complete System Verification"
# ============================================================================

# ============================================================================
print_header "1. Docker Containers (18 Expected)"
# ============================================================================

EXPECTED_CONTAINERS=(
    "orderer.cecbs.et"
    "peer0.ecta.cecbs.et"
    "peer0.ecx.cecbs.et"
    "peer0.banks.cecbs.et"
    "peer0.nbe.cecbs.et"
    "peer0.customs.cecbs.et"
    "peer0.shipping.cecbs.et"
    "couchdb.ecta"
    "couchdb.ecx"
    "couchdb.banks"
    "couchdb.nbe"
    "couchdb.customs"
    "couchdb.shipping"
    "cecbs-postgres"
    "cecbs-redis"
    "coffee-chaincode"
)

RUNNING_COUNT=0
for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        check_pass "$container"
        ((RUNNING_COUNT++))
    else
        check_fail "$container (not running)"
    fi
done

echo ""
echo -e "${BOLD}Containers: $RUNNING_COUNT/16 running${NC}"
echo -e "${BOLD}Note: API and UI run as separate processes, not containers${NC}"

# ============================================================================
print_header "2. Network Ports"
# ============================================================================

check_port() {
    local port=$1
    local service=$2
    
    # Try multiple methods to check if port is listening
    if timeout 2 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
        check_pass "$service (port $port)"
        return 0
    elif docker ps --format '{{.Ports}}' | grep -q ":$port->"; then
        check_pass "$service (port $port - container running)"
        return 0
    elif lsof -i :$port > /dev/null 2>&1; then
        check_pass "$service (port $port)"
        return 0
    elif netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
        check_pass "$service (port $port)"
        return 0
    elif nc -z localhost $port 2>/dev/null; then
        check_pass "$service (port $port)"
        return 0
    else
        check_fail "$service (port $port not responding)"
        return 1
    fi
}

check_port 3000 "Frontend UI"
check_port 3001 "Backend API"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
check_port 7050 "Orderer"
check_port 7051 "Peer (ECTA)"
check_port 9999 "Chaincode Service"
check_port 5984 "CouchDB (ECTA)"
check_port 6984 "CouchDB (ECX)"
check_port 7984 "CouchDB (Banks)"

# ============================================================================
print_header "3. Database Tables"
# ============================================================================

echo "Checking PostgreSQL tables..."
TABLES=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public';
" 2>/dev/null | xargs)

if [ ! -z "$TABLES" ] && [ "$TABLES" -gt 30 ]; then
    check_pass "Application tables created ($TABLES tables)"
elif [ ! -z "$TABLES" ] && [ "$TABLES" -gt 20 ]; then
    check_warn "Application tables exist but incomplete ($TABLES tables)"
else
    check_fail "Application tables missing or incomplete ($TABLES tables)"
fi

# Check blockchain sync tables specifically
SYNC_TABLES=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'blockchain_%';
" 2>/dev/null | xargs)

if [ "$SYNC_TABLES" -eq "5" ]; then
    check_pass "Blockchain sync tables (5/5)"
else
    check_fail "Blockchain sync tables ($SYNC_TABLES/5)"
fi

# Check sync_status table
if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\d sync_status" > /dev/null 2>&1; then
    check_pass "Sync status table"
else
    check_fail "Sync status table missing"
fi

# ============================================================================
print_header "4. Blockchain Network"
# ============================================================================

# Check channel exists
echo "Checking coffeechannel..."
if docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep -q "coffeechannel"; then
    check_pass "Channel 'coffeechannel' exists"
else
    check_fail "Channel 'coffeechannel' not found"
fi

# Check chaincode deployment
echo "Checking chaincode deployment..."
# Check if chaincode files exist on peer
if docker exec peer0.ecta.cecbs.et ls -la /var/hyperledger/production/lifecycle/chaincodes/ 2>/dev/null | grep -q "coffee_1\."; then
    LATEST_CC=$(docker exec peer0.ecta.cecbs.et ls -lat /var/hyperledger/production/lifecycle/chaincodes/ 2>/dev/null | grep "coffee_" | head -1 | awk '{print $NF}' | sed 's/coffee_//' | sed 's/\..*$//')
    check_pass "Coffee chaincode deployed (v$LATEST_CC installed)"
elif docker logs coffee-chaincode 2>&1 | tail -50 | grep -q "Starting Coffee Chaincode"; then
    check_pass "Coffee chaincode deployed (container active)"
elif docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep -q "coffee"; then
    check_pass "Coffee chaincode deployed"
else
    check_fail "Coffee chaincode not deployed"
fi

# Check if chaincode container is running
if docker ps | grep -q "coffee-chaincode"; then
    check_pass "Chaincode container running"
else
    check_fail "Chaincode container not running"
fi

# ============================================================================
print_header "5. API & Backend Services"
# ============================================================================

# Check API health
if curl -s http://localhost:3001/health 2>/dev/null | grep -q "healthy"; then
    check_pass "API health endpoint"
else
    check_fail "API health endpoint not responding"
fi

# Check API docs
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api-docs 2>/dev/null | grep -qE "200|301"; then
    check_pass "API documentation"
else
    check_warn "API documentation not accessible"
fi

# Check if API PID exists
if [ -f /tmp/cecbs-api.pid ]; then
    API_PID=$(cat /tmp/cecbs-api.pid)
    if ps -p $API_PID > /dev/null 2>&1; then
        check_pass "API process (PID: $API_PID)"
    else
        check_fail "API process (stale PID file)"
    fi
else
    check_warn "API PID file not found"
fi

# ============================================================================
print_header "6. Frontend UI"
# ============================================================================

# Check UI
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$UI_STATUS" = "200" ] || [ "$UI_STATUS" = "304" ]; then
    check_pass "UI accessible (HTTP $UI_STATUS)"
else
    check_fail "UI not accessible (HTTP $UI_STATUS)"
fi

# Check if UI PID exists
if [ -f /tmp/cecbs-ui.pid ]; then
    UI_PID=$(cat /tmp/cecbs-ui.pid)
    if ps -p $UI_PID > /dev/null 2>&1; then
        check_pass "UI process (PID: $UI_PID)"
    else
        check_fail "UI process (stale PID file)"
    fi
else
    check_warn "UI PID file not found"
fi

# ============================================================================
print_header "7. CouchDB Sync Service"
# ============================================================================

# Check if sync service is running
SYNC_RUNNING=false
if [ -f "$SCRIPT_DIR/sync-service/sync-service.pid" ]; then
    SYNC_PID=$(cat "$SCRIPT_DIR/sync-service/sync-service.pid")
    if ps -p $SYNC_PID > /dev/null 2>&1; then
        check_pass "Sync service process (PID: $SYNC_PID)"
        SYNC_RUNNING=true
    fi
fi

# Also check for running sync process even without PID file
if [ "$SYNC_RUNNING" = false ]; then
    if ps aux | grep "[c]ouchdb-postgres-sync" > /dev/null 2>&1; then
        SYNC_PID=$(ps aux | grep "[c]ouchdb-postgres-sync" | awk '{print $2}' | head -1)
        check_pass "Sync service running (PID: $SYNC_PID)"
        SYNC_RUNNING=true
    else
        check_fail "Sync service not running"
    fi
fi

# Check sync logs
if [ -f "$SCRIPT_DIR/sync-service/sync-continuous.log" ]; then
    if grep -q "sync completed" "$SCRIPT_DIR/sync-service/sync-continuous.log" 2>/dev/null; then
        check_pass "Sync service active (logs show activity)"
    else
        check_warn "Sync service may not be syncing yet"
    fi
else
    check_fail "Sync service log file not found"
fi

# Check sync_status table has data
SYNC_RECORDS=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "
SELECT count(*) FROM sync_status;
" 2>/dev/null | xargs)

if [ ! -z "$SYNC_RECORDS" ] && [ "$SYNC_RECORDS" -gt 0 ]; then
    check_pass "Sync records in database ($SYNC_RECORDS records)"
else
    check_warn "No sync records yet (service may be starting)"
fi

# ============================================================================
print_header "8. Database Migrations"
# ============================================================================

# Check if migrations were applied
MIGRATION_FILES=$(ls -1 api/src/migrations/*.sql 2>/dev/null | wc -l)
echo "Found $MIGRATION_FILES migration files"

if [ "$MIGRATION_FILES" -gt 0 ]; then
    check_pass "Migration files present ($MIGRATION_FILES files)"
else
    check_fail "No migration files found"
fi

# Verify migration 017 (blockchain sync tables)
if [ -f "api/src/migrations/017_create_blockchain_sync_tables.sql" ]; then
    check_pass "Migration 017 (blockchain sync) present"
else
    check_fail "Migration 017 missing"
fi

# ============================================================================
print_header "9. File Structure"
# ============================================================================

# Check critical files
check_file() {
    if [ -f "$1" ]; then
        check_pass "$2"
    else
        check_fail "$2 missing"
    fi
}

check_file "start-all.sh" "start-all.sh"
check_file "stop-all.sh" "stop-all.sh"
check_file "deploy-chaincode.sh" "deploy-chaincode.sh"
check_file "docker-compose-fabric.yml" "docker-compose-fabric.yml"
check_file "sync-service/couchdb-postgres-sync.js" "Sync service script"
check_file "sync-service/manage-sync.sh" "Sync management script"

# ============================================================================
print_header "10. System Integration"
# ============================================================================

# Test blockchain query
echo "Testing blockchain integration..."
if docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"Args":["GetBlockchainInfo"]}' 2>/dev/null | grep -q "Channel"; then
    check_pass "Chaincode query successful"
else
    check_warn "Chaincode query failed (may need initialization)"
fi

# Test CouchDB connectivity
echo "Testing CouchDB connectivity..."
COUCH_DBS=0
for port in 5984 6984 7984 8984 9984 10984; do
    if curl -s -u admin:adminpw http://localhost:$port/_up > /dev/null 2>&1; then
        ((COUCH_DBS++))
    fi
done

if [ "$COUCH_DBS" -eq 6 ]; then
    check_pass "All 6 CouchDB instances accessible"
else
    check_fail "Only $COUCH_DBS/6 CouchDB instances accessible"
fi

# ============================================================================
print_header "SUMMARY"
# ============================================================================

TOTAL_PERCENT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo ""
echo -e "${BOLD}Total Checks: $TOTAL_CHECKS${NC}"
echo -e "${GREEN}✓ Passed:   $PASSED_CHECKS${NC}"
echo -e "${RED}✗ Failed:   $FAILED_CHECKS${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNING_CHECKS${NC}"
echo ""
echo -e "${BOLD}System Health: $TOTAL_PERCENT%${NC}"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 SYSTEM FULLY OPERATIONAL!${NC}"
    echo ""
    echo "Access points:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • API: http://localhost:3001"
    echo "  • API Docs: http://localhost:3001/api-docs"
    echo ""
    exit 0
elif [ "$FAILED_CHECKS" -lt 5 ]; then
    echo -e "${YELLOW}${BOLD}⚠ SYSTEM PARTIALLY OPERATIONAL${NC}"
    echo ""
    echo "Some components have issues. Review failed checks above."
    echo ""
    exit 1
else
    echo -e "${RED}${BOLD}❌ SYSTEM NOT OPERATIONAL${NC}"
    echo ""
    echo "Multiple critical failures detected. Run:"
    echo "  ./stop-all.sh"
    echo "  ./start-all.sh"
    echo ""
    exit 2
fi
