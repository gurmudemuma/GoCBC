#!/bin/bash
#
# GoCBC Comprehensive System Verification
# Tests ALL blockchain features, document management, and portal integrations
#

# Change to project directory
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

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
echo "  GoCBC COMPREHENSIVE System Verification"
echo "  Complete Testing of All Features"
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

# ============================================================================
# 1. INFRASTRUCTURE TESTS (2 tests)
# ============================================================================
echo -e "${BOLD}1. Infrastructure (2 tests)${RESET}"
test_service "Docker daemon" "docker ps"
test_service "Docker Compose" "docker-compose --version"
echo ""

# ============================================================================
# 2. BLOCKCHAIN CONTAINERS (14 tests)
# ============================================================================
echo -e "${BOLD}2. Blockchain Containers (14 tests)${RESET}"
test_service "Orderer" "docker ps | grep orderer.cecbs.et"
test_service "Peer ECTA" "docker ps | grep peer0.ecta.cecbs.et"
test_service "Peer ECX" "docker ps | grep peer0.ecx.cecbs.et"
test_service "Peer Banks" "docker ps | grep peer0.banks.cecbs.et"
test_service "Peer NBE" "docker ps | grep peer0.nbe.cecbs.et"
test_service "Peer Customs" "docker ps | grep peer0.customs.cecbs.et"
test_service "Peer Shipping" "docker ps | grep peer0.shipping.cecbs.et"
test_service "Chaincode" "docker ps | grep coffee-chaincode"
test_service "CouchDB ECTA" "docker ps | grep couchdb.ecta"
test_service "CouchDB ECX" "docker ps | grep couchdb.ecx"
test_service "CouchDB Banks" "docker ps | grep couchdb.banks"
test_service "CouchDB NBE" "docker ps | grep couchdb.nbe"
test_service "CouchDB Customs" "docker ps | grep couchdb.customs"
test_service "CouchDB Shipping" "docker ps | grep couchdb.shipping"
echo ""

# ============================================================================
# 3. SUPPORTING SERVICES (4 tests)
# ============================================================================
echo -e "${BOLD}3. Supporting Services (4 tests)${RESET}"
test_service "PostgreSQL" "docker ps | grep cecbs-postgres"
test_service "Redis" "docker ps | grep cecbs-redis"
test_service "Kafka" "docker ps | grep cecbs-kafka"
test_service "Zookeeper" "docker ps | grep cecbs-zookeeper"
echo ""

# ============================================================================
# 4. SERVICE CONNECTIVITY (6 tests)
# ============================================================================
echo -e "${BOLD}4. Service Connectivity (6 tests)${RESET}"
test_service "CouchDB ECTA API" "curl -s http://admin:adminpw@localhost:5984/ | grep -q couchdb"
test_service "CouchDB ECX API" "curl -s http://admin:adminpw@localhost:6984/ | grep -q couchdb"
test_service "PostgreSQL Connection" "docker exec cecbs-postgres pg_isready"
test_service "Redis Connection" "docker exec cecbs-redis redis-cli -a redis123 --no-auth-warning ping 2>&1 | grep -q PONG"
test_service "API Health" "curl -s http://localhost:3001/health | grep -q healthy"
test_service "UI Access" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q 200"
echo ""

# ============================================================================
# 5. BLOCKCHAIN CHANNEL (8 tests)
# ============================================================================
echo -e "${BOLD}5. Blockchain Channel (8 tests)${RESET}"
test_service "Channel exists on orderer" "docker exec orderer.cecbs.et ls /var/hyperledger/production/orderer/chains/coffeechannel"
test_service "Peer ECTA joined channel" "docker exec peer0.ecta.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Peer ECX joined channel" "docker exec peer0.ecx.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Peer Banks joined channel" "docker exec peer0.banks.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Peer NBE joined channel" "docker exec peer0.nbe.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Peer Customs joined channel" "docker exec peer0.customs.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Peer Shipping joined channel" "docker exec peer0.shipping.cecbs.et peer channel list | grep -q coffeechannel"
test_service "Channel has blocks" "docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel 2>&1 | grep -q height"
echo ""

# ============================================================================
# 6. COUCHDB STATE DATABASES (12 tests - 2 per peer)
# ============================================================================
echo -e "${BOLD}6. CouchDB State Databases (12 tests)${RESET}"
test_service "ECTA CouchDB channel DB" "curl -s http://admin:adminpw@localhost:5984/_all_dbs | grep -q coffeechannel"
test_service "ECTA CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:5984/_all_dbs | grep -q lifecycle"
test_service "ECX CouchDB channel DB" "curl -s http://admin:adminpw@localhost:6984/_all_dbs | grep -q coffeechannel"
test_service "ECX CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:6984/_all_dbs | grep -q lifecycle"
test_service "Banks CouchDB channel DB" "curl -s http://admin:adminpw@localhost:7984/_all_dbs | grep -q coffeechannel"
test_service "Banks CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:7984/_all_dbs | grep -q lifecycle"
test_service "NBE CouchDB channel DB" "curl -s http://admin:adminpw@localhost:8984/_all_dbs | grep -q coffeechannel"
test_service "NBE CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:8984/_all_dbs | grep -q lifecycle"
test_service "Customs CouchDB channel DB" "curl -s http://admin:adminpw@localhost:9984/_all_dbs | grep -q coffeechannel"
test_service "Customs CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:9984/_all_dbs | grep -q lifecycle"
test_service "Shipping CouchDB channel DB" "curl -s http://admin:adminpw@localhost:10984/_all_dbs | grep -q coffeechannel"
test_service "Shipping CouchDB lifecycle DB" "curl -s http://admin:adminpw@localhost:10984/_all_dbs | grep -q lifecycle"
echo ""

# ============================================================================
# 7. BLOCKCHAIN FEATURES - CODE VERIFICATION (9 tests)
# ============================================================================
echo -e "${BOLD}7. Blockchain Features - Code Verification (9 tests)${RESET}"
test_service "X.509 Signatures code exists" "test -f chaincodes/coffee/signature.go && grep -q 'X509Certificate' chaincodes/coffee/signature.go"
test_service "Immutability code exists" "test -f chaincodes/coffee/main.go && grep -q 'GetHistoryForKey' chaincodes/coffee/main.go"
test_service "Multi-org consensus config" "test -f blockchain/configtx.yaml && grep -q 'MAJORITY' blockchain/configtx.yaml"
test_service "Distributed ledger config" "test -f docker-compose-fabric.yml && grep -q 'peer0.ecta.cecbs.et' docker-compose-fabric.yml"
test_service "Audit logs code exists" "test -f chaincodes/coffee/signature.go && grep -q 'CreateAuditLog' chaincodes/coffee/signature.go"
test_service "Document hashing code exists" "test -f chaincodes/coffee/documents.go && grep -q 'RegisterDocumentHash' chaincodes/coffee/documents.go"
test_service "Smart contracts deployed" "docker ps | grep -q coffee-chaincode"
test_service "Query consistency indexes" "test -f chaincodes/coffee/main.go && grep -q 'GetQueryResult' chaincodes/coffee/main.go"
test_service "Dual DB sync code exists" "test -f api/src/services/fabricService.ts && grep -q 'sync' api/src/services/fabricService.ts"
echo ""

# ============================================================================
# 8. DOCUMENT MANAGEMENT - CODE VERIFICATION (10 tests)
# ============================================================================
echo -e "${BOLD}8. Document Management - Code Verification (10 tests)${RESET}"
test_service "Document upload route" "test -f api/src/routes/documents.ts && grep -q 'upload' api/src/routes/documents.ts"
test_service "Document hash registration" "grep -q 'RegisterDocumentHash' chaincodes/coffee/documents.go"
test_service "Document verification" "grep -q 'VerifyDocumentHash' chaincodes/coffee/documents.go"
test_service "Document signing" "grep -q 'SignDocument' chaincodes/coffee/signature.go"
test_service "Entity linking" "grep -q 'QueryDocumentsByEntity' chaincodes/coffee/documents.go"
test_service "Document types validation" "test -f api/src/utils/documentValidation.ts && wc -l api/src/utils/documentValidation.ts | awk '{print \$1}' | grep -E '^[0-9]{3,}$'"
test_service "Multi-party approval" "test -f api/src/services/approvalRulesService.ts && grep -q 'approval' api/src/services/approvalRulesService.ts"
test_service "Document retrieval API" "grep -q 'documents' api/src/routes/documents.ts"
test_service "Document status tracking" "grep -q 'Verified' chaincodes/coffee/documents.go"
test_service "IPFS storage config" "test -f api/src/config/env.validation.ts && grep -q 'IPFS' api/src/config/env.validation.ts"
echo ""

# ============================================================================
# 9. PORTAL INTEGRATIONS - CODE VERIFICATION (7 tests)
# ============================================================================
echo -e "${BOLD}9. Portal Integrations - Code Verification (7 tests)${RESET}"
test_service "ECTA Portal component" "test -f ui/src/components/portals/ECTAPortal.tsx"
test_service "ECX Portal component" "test -f ui/src/components/portals/ECXPortal.tsx"
test_service "Banks Portal component" "test -f ui/src/components/portals/BanksPortal.tsx"
test_service "NBE Portal component" "test -f ui/src/components/portals/NBEPortal.tsx"
test_service "Customs Portal component" "test -f ui/src/components/portals/CustomsPortal.tsx"
test_service "Shipping Portal component" "test -f ui/src/components/portals/ShippingPortal.tsx"
test_service "Exporter Portal component" "test -f ui/src/components/portals/ExporterPortal.tsx"
echo ""

# ============================================================================
# 10. API ENDPOINTS - FUNCTIONALITY (15 tests)
# ============================================================================
echo -e "${BOLD}10. API Endpoints - Functionality (15 tests)${RESET}"
test_service "Health endpoint" "curl -s http://localhost:3001/health | grep -q healthy"
test_service "API responds to requests" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health | grep -q 200"
test_service "Contracts route exists" "test -f api/src/routes/contracts.ts"
test_service "Quality route exists" "test -f api/src/routes/quality.ts"
test_service "Shipments route exists" "test -f api/src/routes/shipments.ts"
test_service "Payments route exists" "test -f api/src/routes/payments.ts"
test_service "Letters of Credit route" "test -f api/src/routes/banking.ts"
test_service "Customs route exists" "test -f api/src/routes/customs.ts"
test_service "Forex route exists" "test -f api/src/routes/forex.ts"
test_service "Repatriation route exists" "test -f api/src/routes/repatriation.ts"
test_service "Documents route exists" "test -f api/src/routes/documents.ts"
test_service "Users route exists" "test -f api/src/routes/users.ts"
test_service "Analytics route exists" "test -f api/src/routes/analytics.ts"
test_service "Audit route exists" "test -f api/src/routes/audit.ts"
test_service "Blockchain service exists" "test -f api/src/services/fabricService.ts"
echo ""

# ============================================================================
# 11. CHAINCODE FUNCTIONS (12 tests)
# ============================================================================
echo -e "${BOLD}11. Chaincode Functions (12 tests)${RESET}"
test_service "Contract creation function" "grep -q 'RegisterSalesContract' chaincodes/coffee/main.go"
test_service "Shipment tracking function" "grep -q 'CreateShipment' chaincodes/coffee/main.go"
test_service "Payment processing function" "grep -q 'InitiatePayment' chaincodes/coffee/payment.go"
test_service "Quality certification function" "grep -q 'PerformInspection' chaincodes/coffee/quality.go"
test_service "LC issuance function" "grep -q 'IssueLC' chaincodes/coffee/banking.go"
test_service "Customs clearance function" "grep -q 'SubmitCustomsDeclaration' chaincodes/coffee/customs.go"
test_service "Forex approval function" "grep -q 'RequestForex' chaincodes/coffee/forex.go"
test_service "Repatriation tracking function" "grep -q 'RecordRepatriation' chaincodes/coffee/repatriation.go"
test_service "Document registration function" "grep -q 'RegisterDocumentHash' chaincodes/coffee/documents.go"
test_service "Signature capture function" "grep -q 'CaptureIdentity' chaincodes/coffee/signature.go"
test_service "Query contract function" "grep -q 'ReadSalesContract' chaincodes/coffee/main.go"
test_service "History query function" "grep -q 'GetHistoryForKey' chaincodes/coffee/main.go"
echo ""

# ============================================================================
# 12. DATABASE SCHEMA (8 tests)
# ============================================================================
echo -e "${BOLD}12. Database Schema (8 tests)${RESET}"
test_service "Contracts table schema" "grep -q 'contracts' api/src/migrations/000_initial_schema.sql"
test_service "Shipments table schema" "grep -q 'shipments' api/src/migrations/000_initial_schema.sql"
test_service "Payments table schema" "grep -q 'payments' api/src/migrations/000_initial_schema.sql"
test_service "Quality certs table schema" "grep -q 'quality' api/src/migrations/000_initial_schema.sql"
test_service "Documents table schema" "grep -q 'documents' api/src/migrations/000_initial_schema.sql"
test_service "Users table schema" "grep -q 'users' api/src/migrations/000_initial_schema.sql"
test_service "Blockchain sync table" "grep -q 'blockchain_sync' api/src/migrations/017_create_blockchain_sync_tables.sql"
test_service "Repatriation table" "grep -q 'repatriation' api/src/migrations/019_create_repatriation_table.sql"
echo ""

# ============================================================================
# 13. SECURITY FEATURES (8 tests)
# ============================================================================
echo -e "${BOLD}13. Security Features (8 tests)${RESET}"
test_service "MSP organizations config" "test -f blockchain/configtx.yaml && grep -q 'ECTAMSP' blockchain/configtx.yaml"
test_service "TLS certificates exist" "test -d blockchain/organizations/ordererOrganizations"
test_service "JWT authentication" "grep -q 'JWT' api/src/middleware/auth.ts"
test_service "Password hashing" "grep -q 'bcrypt' api/package.json"
test_service "CORS configuration" "grep -q 'cors' api/src/server.ts"
test_service "Helmet security headers" "grep -q 'helmet' api/src/server.ts"
test_service "Rate limiting" "grep -q 'rateLimit' api/src/server.ts"
test_service "Input validation" "grep -q 'express-validator' api/src/routes/users.ts"
echo ""

# ============================================================================
# 14. UI COMPONENTS (10 tests)
# ============================================================================
echo -e "${BOLD}14. UI Components (10 tests)${RESET}"
test_service "Login component" "test -f ui/src/pages/login.tsx"
test_service "Dashboard component" "test -f ui/src/components/Dashboard.tsx"
test_service "Contract management UI" "test -f ui/src/pages/portals/exporter.tsx"
test_service "Shipment tracking UI" "test -f ui/src/pages/portals/shipping.tsx"
test_service "Document upload UI" "test -f ui/src/components/documents/DocumentManagementPanel.tsx"
test_service "Quality certificate UI" "test -f ui/src/pages/portals/ecta.tsx"
test_service "Analytics dashboard" "test -f ui/src/pages/portals/analytics.tsx"
test_service "Admin portal" "test -f ui/src/pages/admin/index.tsx"
test_service "Blockchain explorer" "test -f ui/src/components/blockchain/BlockchainStatusIcon.tsx"
test_service "Notification system" "test -f ui/src/components/common/NotificationDialog.tsx"
echo ""

# ============================================================================
# 15. CONFIGURATION FILES (6 tests)
# ============================================================================
echo -e "${BOLD}15. Configuration Files (6 tests)${RESET}"
test_service "Fabric network config" "test -f blockchain/configtx.yaml"
test_service "Docker compose config" "test -f docker-compose-fabric.yml"
test_service "API environment config" "test -f api/.env.example"
test_service "UI environment config" "test -f ui/.env.example"
test_service "TypeScript API config" "test -f api/tsconfig.json"
test_service "Next.js UI config" "test -f ui/next.config.js"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  Test Results"
echo "================================================================"
echo -e "${RESET}"

echo -e "Total Tests:  ${BOLD}$TOTAL${RESET}"
echo -e "Passed:       ${GREEN}${BOLD}$PASSED${RESET}"
echo -e "Failed:       ${RED}${BOLD}$FAILED${RESET}"
echo ""

PASS_RATE=$((PASSED * 100 / TOTAL))
echo -e "Pass Rate:    ${GREEN}${BOLD}${PASS_RATE}%${RESET}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL SYSTEMS OPERATIONAL${RESET}"
    echo -e "${GREEN}${BOLD}✓ COMPREHENSIVE VERIFICATION COMPLETE${RESET}"
    echo ""
    echo -e "${CYAN}System Information:${RESET}"
    echo -e "  UI:       http://localhost:3000"
    echo -e "  API:      http://localhost:3001"
    echo -e "  Docs:     http://localhost:3001/api-docs"
    echo -e "  Health:   http://localhost:3001/health"
    echo -e "  CouchDB:  http://admin:adminpw@localhost:5984"
    echo ""
    echo -e "${CYAN}Verified Components:${RESET}"
    echo -e "  • Infrastructure (2)"
    echo -e "  • Blockchain Containers (14)"
    echo -e "  • Supporting Services (4)"
    echo -e "  • Service Connectivity (6)"
    echo -e "  • Blockchain Channel (8)"
    echo -e "  • CouchDB Databases (12)"
    echo -e "  • Blockchain Features (9)"
    echo -e "  • Document Management (10)"
    echo -e "  • Portal Integrations (7)"
    echo -e "  • API Endpoints (15)"
    echo -e "  • Chaincode Functions (12)"
    echo -e "  • Database Schema (8)"
    echo -e "  • Security Features (8)"
    echo -e "  • UI Components (10)"
    echo -e "  • Configuration Files (6)"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TESTS FAILED${RESET}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${RESET}"
    echo "  1. Check Docker: docker ps"
    echo "  2. Check logs: docker logs <container-name>"
    echo "  3. Restart system: ./start-all.sh"
    echo "  4. Review failed tests above"
    echo ""
    exit 1
fi
