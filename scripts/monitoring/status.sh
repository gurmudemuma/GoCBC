#!/bin/bash

################################################################################
# GoCBC System Status Check
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
################################################################################

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
API_DIR="$PROJECT_ROOT/api"

# Ports
API_PORT=3001
UI_PORT=3000
POSTGRES_PORT=5432
ORDERER_PORT=7050
PEER_ECTA_PORT=7051

# Colors
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'

# Status indicators
RUNNING="${COLOR_GREEN}✓ Running${COLOR_RESET}"
STOPPED="${COLOR_RED}✗ Stopped${COLOR_RESET}"
UNKNOWN="${COLOR_YELLOW}? Unknown${COLOR_RESET}"

echo ""
echo -e "${COLOR_CYAN}${COLOR_BOLD}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║                      GoCBC System Status                             ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${COLOR_RESET}"
echo ""

################################################################################
# Check Ports
################################################################################

check_port() {
    local port=$1
    if command -v nc &> /dev/null; then
        nc -z localhost $port 2>/dev/null
        return $?
    else
        curl -s --max-time 1 http://localhost:$port &>/dev/null
        return $?
    fi
}

echo -e "${COLOR_CYAN}${COLOR_BOLD}Application Servers:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# API Server
printf "  API Server (port $API_PORT):      "
if check_port $API_PORT; then
    echo -e "$RUNNING"
    
    # Test health endpoint
    API_HEALTH=$(curl -s --max-time 2 "http://localhost:$API_PORT/health" 2>/dev/null)
    if echo "$API_HEALTH" | grep -q '"status"'; then
        printf "    └─ Health endpoint:        ${COLOR_GREEN}✓ Healthy${COLOR_RESET}\n"
    else
        printf "    └─ Health endpoint:        ${COLOR_YELLOW}⚠ Not responding${COLOR_RESET}\n"
    fi
else
    echo -e "$STOPPED"
    printf "    └─ Start with:             ./start-all.sh or cd api && npm run dev\n"
fi

# UI Server
printf "  UI Server (port $UI_PORT):       "
if check_port $UI_PORT; then
    echo -e "$RUNNING"
    
    # Test if it's Next.js
    UI_RESPONSE=$(curl -s --max-time 2 -I "http://localhost:$UI_PORT" 2>/dev/null)
    if echo "$UI_RESPONSE" | grep -qi "Next.js\|x-powered-by"; then
        printf "    └─ Framework:              ${COLOR_GREEN}✓ Next.js${COLOR_RESET}\n"
    fi
else
    echo -e "$STOPPED"
    printf "    └─ Start with:             ./start-all.sh or cd ui && npm run dev\n"
fi

echo ""

################################################################################
# Check Blockchain
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Blockchain Network:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Orderer
printf "  Orderer (port $ORDERER_PORT):     "
if docker ps 2>/dev/null | grep -q "orderer.cecbs.et.*Up"; then
    echo -e "$RUNNING"
else
    echo -e "$STOPPED"
fi

# Peers
PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\..*Up" || echo "0")
printf "  Peers:                        "
if [ "$PEER_COUNT" -gt 0 ]; then
    echo -e "${COLOR_GREEN}✓ $PEER_COUNT running${COLOR_RESET}"
    
    # List peers
    docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep "peer0\." | while read line; do
        PEER_NAME=$(echo "$line" | awk '{print $1}')
        printf "    └─ %-25s ${COLOR_GREEN}✓${COLOR_RESET}\n" "$PEER_NAME"
    done
else
    echo -e "${COLOR_RED}✗ 0 running${COLOR_RESET}"
    printf "    └─ Start with:             ./start-all.sh\n"
fi

# Chaincode
printf "  Chaincode:                    "
if docker ps 2>/dev/null | grep -q "coffee.*Up\|dev-peer.*coffee"; then
    echo -e "$RUNNING"
    
    # Check committed chaincode
    if docker ps 2>/dev/null | grep -q "peer0.ecta"; then
        CHAINCODE_INFO=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
            --channelID coffeechannel --name coffee 2>/dev/null || echo "")
        
        if echo "$CHAINCODE_INFO" | grep -q "Version:"; then
            VERSION=$(echo "$CHAINCODE_INFO" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
            SEQUENCE=$(echo "$CHAINCODE_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
            printf "    └─ Version:                ${COLOR_GREEN}$VERSION (sequence: $SEQUENCE)${COLOR_RESET}\n"
        fi
    fi
else
    echo -e "$STOPPED"
fi

echo ""

################################################################################
# Check Database
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Database:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PostgreSQL
printf "  PostgreSQL (port $POSTGRES_PORT):  "
if check_port $POSTGRES_PORT; then
    echo -e "$RUNNING"
    
    # Check if we can query the database
    if [ -f "$API_DIR/.env" ]; then
        DATABASE_URL=$(grep "^DATABASE_URL=" "$API_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        
        if [ -n "$DATABASE_URL" ] && command -v psql &> /dev/null; then
            USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ' || echo "")
            
            if [ -n "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
                printf "    └─ Active users:           ${COLOR_GREEN}$USER_COUNT${COLOR_RESET}\n"
            else
                printf "    └─ Active users:           ${COLOR_YELLOW}⚠ Database not seeded${COLOR_RESET}\n"
                printf "    └─ Seed with:              psql \$DATABASE_URL -f scripts/seed-users.sql\n"
            fi
        fi
    fi
else
    echo -e "$STOPPED"
fi

echo ""

################################################################################
# Check Docker Resources
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Docker Resources:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Total containers
TOTAL_CONTAINERS=$(docker ps 2>/dev/null | grep -c "cecbs\|coffee" || echo "0")
printf "  Total Containers:             ${COLOR_CYAN}$TOTAL_CONTAINERS${COLOR_RESET}\n"

# CouchDB instances
COUCHDB_COUNT=$(docker ps 2>/dev/null | grep -c "couchdb" || echo "0")
if [ "$COUCHDB_COUNT" -gt 0 ]; then
    printf "  CouchDB Instances:            ${COLOR_GREEN}$COUCHDB_COUNT${COLOR_RESET}\n"
fi

# Networks
NETWORK_COUNT=$(docker network ls 2>/dev/null | grep -c "cecbs" || echo "0")
printf "  Docker Networks:              ${COLOR_CYAN}$NETWORK_COUNT${COLOR_RESET}\n"

# Volumes
VOLUME_COUNT=$(docker volume ls 2>/dev/null | grep -c "cecbs" || echo "0")
printf "  Docker Volumes:               ${COLOR_CYAN}$VOLUME_COUNT${COLOR_RESET}\n"

echo ""

################################################################################
# System URLs
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Access URLs:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if check_port $UI_PORT; then
    echo -e "  Main Application:             ${COLOR_GREEN}http://localhost:$UI_PORT${COLOR_RESET}"
else
    echo -e "  Main Application:             ${COLOR_RED}Not available${COLOR_RESET}"
fi

if check_port $API_PORT; then
    echo -e "  API Server:                   ${COLOR_GREEN}http://localhost:$API_PORT${COLOR_RESET}"
    echo -e "  API Health:                   ${COLOR_BLUE}http://localhost:$API_PORT/health${COLOR_RESET}"
    echo -e "  API Docs (Swagger):           ${COLOR_BLUE}http://localhost:$API_PORT/api-docs${COLOR_RESET}"
else
    echo -e "  API Server:                   ${COLOR_RED}Not available${COLOR_RESET}"
fi

echo ""

################################################################################
# Test Credentials
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Test Credentials:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Admin:                        admin / admin123"
echo "  Exporter:                     exporter1 / password123"
echo "  ECTA:                         ecta_admin / password123"
echo ""

################################################################################
# Log Files
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Log Files:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$PROJECT_ROOT/logs/api.log" ]; then
    API_LOG_SIZE=$(du -h "$PROJECT_ROOT/logs/api.log" 2>/dev/null | awk '{print $1}')
    API_LOG_LINES=$(wc -l < "$PROJECT_ROOT/logs/api.log" 2>/dev/null || echo "0")
    echo -e "  API Log:                      logs/api.log (${API_LOG_SIZE}, ${API_LOG_LINES} lines)"
    echo -e "    └─ View:                    tail -f logs/api.log"
else
    echo -e "  API Log:                      ${COLOR_YELLOW}Not found${COLOR_RESET}"
fi

if [ -f "$PROJECT_ROOT/logs/ui.log" ]; then
    UI_LOG_SIZE=$(du -h "$PROJECT_ROOT/logs/ui.log" 2>/dev/null | awk '{print $1}')
    UI_LOG_LINES=$(wc -l < "$PROJECT_ROOT/logs/ui.log" 2>/dev/null || echo "0")
    echo -e "  UI Log:                       logs/ui.log (${UI_LOG_SIZE}, ${UI_LOG_LINES} lines)"
    echo -e "    └─ View:                    tail -f logs/ui.log"
else
    echo -e "  UI Log:                       ${COLOR_YELLOW}Not found${COLOR_RESET}"
fi

echo ""

################################################################################
# Quick Actions
################################################################################

echo -e "${COLOR_CYAN}${COLOR_BOLD}Quick Actions:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Start system:                 ./start-all.sh"
echo "  Stop system:                  ./stop-all.sh"
echo "  Restart API:                  cd api && npm run dev"
echo "  Restart UI:                   cd ui && npm run dev"
echo "  View blockchain logs:         docker-compose -f docker-compose-fabric.yml logs -f"
echo "  Seed database:                psql \$DATABASE_URL -f scripts/seed-users.sql"
echo ""

################################################################################
# Overall Status
################################################################################

# Determine overall status
API_OK=0
UI_OK=0
BLOCKCHAIN_OK=0

check_port $API_PORT && API_OK=1
check_port $UI_PORT && UI_OK=1
[ "$PEER_COUNT" -gt 0 ] && BLOCKCHAIN_OK=1

TOTAL_OK=$((API_OK + UI_OK + BLOCKCHAIN_OK))

echo -e "${COLOR_CYAN}${COLOR_BOLD}Overall Status:${COLOR_RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TOTAL_OK -eq 3 ]; then
    echo -e "  ${COLOR_GREEN}${COLOR_BOLD}✓ System is fully operational${COLOR_RESET}"
elif [ $TOTAL_OK -eq 0 ]; then
    echo -e "  ${COLOR_RED}${COLOR_BOLD}✗ System is not running${COLOR_RESET}"
    echo -e "  ${COLOR_YELLOW}  Start with: ./start-all.sh${COLOR_RESET}"
else
    echo -e "  ${COLOR_YELLOW}${COLOR_BOLD}⚠ System is partially running ($TOTAL_OK/3 components)${COLOR_RESET}"
    [ $API_OK -eq 0 ] && echo -e "    • API server is not running"
    [ $UI_OK -eq 0 ] && echo -e "    • UI server is not running"
    [ $BLOCKCHAIN_OK -eq 0 ] && echo -e "    • Blockchain network is not running"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
