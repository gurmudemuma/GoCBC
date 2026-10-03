#!/bin/bash

# End-to-End System Test
# Tests the complete CECBS system with TLS-enabled chaincode

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  CECBS End-to-End System Test${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""

# Test counters
PASSED=0
FAILED=0
TOTAL=0

test_step() {
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}Test $TOTAL: $1${RESET}"
}

test_pass() {
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}  ✓ PASSED${RESET}"
    echo ""
}

test_fail() {
    FAILED=$((FAILED + 1))
    echo -e "${RED}  ✗ FAILED: $1${RESET}"
    echo ""
}

# =============================================================================
# 1. DATABASE TESTS
# =============================================================================
echo -e "${YELLOW}━━━ Database Tests ━━━${RESET}"

test_step "PostgreSQL connection"
if PGPASSWORD=cecbs123 psql -h localhost -p 5432 -U cecbs -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    test_pass
else
    test_fail "Cannot connect to PostgreSQL"
fi

test_step "Database table count"
TABLE_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -p 5432 -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -ge 40 ]; then
    echo -e "${GREEN}  Found $TABLE_COUNT tables${RESET}"
    test_pass
else
    test_fail "Expected at least 40 tables, found $TABLE_COUNT"
fi

test_step "All migrations applied"
MIGRATION_COUNT=$(cd api && find src/migrations -name "*.sql" | wc -l)
echo -e "  Total migrations: $MIGRATION_COUNT"
if [ "$MIGRATION_COUNT" -eq 22 ]; then
    test_pass
else
    test_fail "Expected 22 migrations, found $MIGRATION_COUNT"
fi

# =============================================================================
# 2. BLOCKCHAIN TESTS
# =============================================================================
echo -e "${YELLOW}━━━ Blockchain Tests ━━━${RESET}"

test_step "Chaincode container running"
if docker ps --format '{{.Names}}' | grep -q '^coffee-chaincode$'; then
    test_pass
else
    test_fail "Chaincode container not running"
fi

test_step "TLS-enabled chaincode committed"
COMMITTED_VERSION=$(docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null | grep "Version:" | awk '{print $2}' | tr -d ',')

if [ "$COMMITTED_VERSION" = "1.9_tls" ]; then
    echo -e "${GREEN}  Committed version: $COMMITTED_VERSION${RESET}"
    test_pass
else
    test_fail "Expected version 1.9_tls, found $COMMITTED_VERSION"
fi

test_step "Chaincode query (QueryAllExporters)"
QUERY_RESULT=$(docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"QueryAllExporters","Args":[]}' 2>&1)

if echo "$QUERY_RESULT" | grep -q "Error"; then
    test_fail "Query failed: $QUERY_RESULT"
else
    echo -e "${GREEN}  Query successful${RESET}"
    test_pass
fi

test_step "Register test exporter"
REGISTER_RESULT=$(docker exec \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    -e CORE_PEER_LOCALMSPID=ECXMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel \
    -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    -c '{"function":"RegisterExporter","Args":["EXP-TEST-001","Test Coffee Exporter Ltd","Addis Ababa","test@exporter.et","251911234567","ACTIVE","STANDARD","Lab001"]}' 2>&1)

if echo "$REGISTER_RESULT" | grep -q "status:200"; then
    echo -e "${GREEN}  Exporter registered successfully${RESET}"
    test_pass
else
    test_fail "Registration failed"
fi

# =============================================================================
# 3. CONTAINER HEALTH CHECKS
# =============================================================================
echo -e "${YELLOW}━━━ Container Health ━━━${RESET}"

test_step "All required containers running"
REQUIRED_CONTAINERS="coffee-chaincode cecbs-postgres cecbs-redis peer0.ecx.cecbs.et peer0.ecta.cecbs.et orderer.cecbs.et"
ALL_RUNNING=true

for container in $REQUIRED_CONTAINERS; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "  ${GREEN}✓${RESET} $container"
    else
        echo -e "  ${RED}✗${RESET} $container (not running)"
        ALL_RUNNING=false
    fi
done

if [ "$ALL_RUNNING" = true ]; then
    test_pass
else
    test_fail "Some containers are not running"
fi

# =============================================================================
# 4. NETWORK CONNECTIVITY
# =============================================================================
echo -e "${YELLOW}━━━ Network Connectivity ━━━${RESET}"

test_step "PostgreSQL port accessible"
if nc -z localhost 5432 2>/dev/null; then
    test_pass
else
    test_fail "PostgreSQL port 5432 not accessible"
fi

test_step "Redis port accessible"
if nc -z localhost 6379 2>/dev/null; then
    test_pass
else
    test_fail "Redis port 6379 not accessible"
fi

test_step "Chaincode port accessible"
if nc -z localhost 9999 2>/dev/null; then
    test_pass
else
    test_fail "Chaincode port 9999 not accessible"
fi

# =============================================================================
# 5. TLS SECURITY
# =============================================================================
echo -e "${YELLOW}━━━ TLS Security ━━━${RESET}"

test_step "Chaincode TLS certificates exist"
if [ -f "chaincodes/coffee/tls/server-cert.pem" ] && [ -f "chaincodes/coffee/tls/server-key.pem" ]; then
    test_pass
else
    test_fail "TLS certificates not found"
fi

test_step "TLS enabled in connection.json"
if grep -q '"tls_required": true' chaincodes/coffee/connection.json; then
    test_pass
else
    test_fail "TLS not enabled in connection.json"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  TEST SUMMARY${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${GREEN}✅ Passed: $PASSED${RESET}"
echo -e "  ${RED}❌ Failed: $FAILED${RESET}"
echo -e "  📊 Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for production.${RESET}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${RESET}"
    exit 1
fi
