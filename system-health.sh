#!/usr/bin/env bash
# Real-time system health dashboard
# Shows live status of all CECBS components

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

while true; do
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       CECBS SYSTEM HEALTH DASHBOARD - Live View           ║${NC}"
    echo -e "${CYAN}║     Coffee Export Consortium Blockchain System            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # Docker Status
    echo -e "${CYAN}━━━ INFRASTRUCTURE ━━━${NC}"
    RUNNING_CONTAINERS=$(docker ps -q | wc -l | tr -d ' ')
    if [ "$RUNNING_CONTAINERS" -ge 18 ]; then
        echo -e "  ${GREEN}●${NC} Docker:      ${GREEN}$RUNNING_CONTAINERS/18 containers running${NC}"
    else
        echo -e "  ${YELLOW}●${NC} Docker:      ${YELLOW}$RUNNING_CONTAINERS/18 containers running${NC}"
    fi
    
    # Frontend
    echo ""
    echo -e "${CYAN}━━━ APPLICATIONS ━━━${NC}"
    if curl -s --connect-timeout 2 "http://localhost:3000" >/dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} Frontend UI: ${GREEN}Online${NC} (http://localhost:3000)"
    else
        echo -e "  ${RED}●${NC} Frontend UI: ${RED}Offline${NC}"
    fi
    
    if curl -s --connect-timeout 2 "http://localhost:3001/health" >/dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} Backend API: ${GREEN}Online${NC} (http://localhost:3001)"
    else
        echo -e "  ${RED}●${NC} Backend API: ${RED}Offline${NC}"
    fi
    
    # Database Services
    echo ""
    echo -e "${CYAN}━━━ DATA SERVICES ━━━${NC}"
    if docker exec cecbs-postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} PostgreSQL:  ${GREEN}Ready${NC}"
    else
        echo -e "  ${RED}●${NC} PostgreSQL:  ${RED}Not Ready${NC}"
    fi
    
    if docker exec cecbs-redis redis-cli -a redis123 ping 2>/dev/null | grep -q "PONG" || docker exec cecbs-redis redis-cli ping 2>/dev/null | grep -q "PONG\|NOAUTH"; then
        echo -e "  ${GREEN}●${NC} Redis Cache: ${GREEN}Active${NC}"
    else
        echo -e "  ${RED}●${NC} Redis Cache: ${RED}Inactive${NC}"
    fi
    
    # Blockchain
    echo ""
    echo -e "${CYAN}━━━ BLOCKCHAIN NETWORK ━━━${NC}"
    if docker ps --format '{{.Names}}' | grep -q "orderer.cecbs.et"; then
        echo -e "  ${GREEN}●${NC} Orderer:     ${GREEN}Running${NC}"
    else
        echo -e "  ${RED}●${NC} Orderer:     ${RED}Stopped${NC}"
    fi
    
    PEER_COUNT=$(docker ps --format '{{.Names}}' | grep -c "peer0" || echo "0")
    if [ "$PEER_COUNT" -eq 6 ]; then
        echo -e "  ${GREEN}●${NC} Peers:       ${GREEN}6/6 running${NC}"
    else
        echo -e "  ${YELLOW}●${NC} Peers:       ${YELLOW}$PEER_COUNT/6 running${NC}"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "coffee-chaincode"; then
        echo -e "  ${GREEN}●${NC} Chaincode:   ${GREEN}Deployed${NC}"
    else
        echo -e "  ${RED}●${NC} Chaincode:   ${RED}Not Deployed${NC}"
    fi
    
    # System Resources
    echo ""
    echo -e "${CYAN}━━━ SYSTEM RESOURCES ━━━${NC}"
    
    # CPU Usage (average of all containers)
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" | sed 's/%//' | awk '{s+=$1; n++} END {if (n>0) printf "%.1f", s/n; else print "0"}')
    if (( $(echo "$CPU_USAGE < 50" | bc -l) )); then
        echo -e "  ${GREEN}●${NC} CPU Usage:   ${GREEN}${CPU_USAGE}%${NC}"
    elif (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
        echo -e "  ${YELLOW}●${NC} CPU Usage:   ${YELLOW}${CPU_USAGE}%${NC}"
    else
        echo -e "  ${RED}●${NC} CPU Usage:   ${RED}${CPU_USAGE}%${NC}"
    fi
    
    # Memory Usage
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" | sed 's/%//' | awk '{s+=$1; n++} END {if (n>0) printf "%.1f", s/n; else print "0"}')
    if (( $(echo "$MEM_USAGE < 50" | bc -l) )); then
        echo -e "  ${GREEN}●${NC} Memory:      ${GREEN}${MEM_USAGE}% avg${NC}"
    elif (( $(echo "$MEM_USAGE < 80" | bc -l) )); then
        echo -e "  ${YELLOW}●${NC} Memory:      ${YELLOW}${MEM_USAGE}% avg${NC}"
    else
        echo -e "  ${RED}●${NC} Memory:      ${RED}${MEM_USAGE}% avg${NC}"
    fi
    
    # Disk Space
    DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "  ${GREEN}●${NC} Disk Space:  ${GREEN}${DISK_USAGE}% used${NC}"
    else
        echo -e "  ${YELLOW}●${NC} Disk Space:  ${YELLOW}${DISK_USAGE}% used${NC}"
    fi
    
    # Recent Activity
    echo ""
    echo -e "${CYAN}━━━ RECENT API ACTIVITY ━━━${NC}"
    if [ -f "/tmp/cecbs-api.log" ]; then
        tail -3 /tmp/cecbs-api.log | sed 's/^/  /'
    else
        echo "  No logs available"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Press Ctrl+C to exit | Refreshing in 5 seconds...${NC}"
    
    sleep 5
done
