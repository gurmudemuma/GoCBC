#!/bin/bash
# Check CECBS system status

# Colors
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[32m'
COLOR_RED='\033[31m'
COLOR_YELLOW='\033[33m'
COLOR_CYAN='\033[36m'
COLOR_BOLD='\033[1m'
COLOR_GRAY='\033[90m'

test_port() {
    local port=$1
    if command -v nc &> /dev/null; then
        nc -z localhost $port 2>/dev/null
        return $?
    elif command -v timeout &> /dev/null; then
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null
        return $?
    else
        curl -s --connect-timeout 1 http://localhost:$port > /dev/null 2>&1
        return $?
    fi
}

get_status_icon() {
    if [ "$1" = "true" ]; then
        echo -e "${COLOR_GREEN}●${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}○${COLOR_RESET}"
    fi
}

echo ""
echo -e "${COLOR_CYAN}${COLOR_BOLD}CECBS System Status${COLOR_RESET}"
echo -e "${COLOR_CYAN}══════════════════════════════════════${COLOR_RESET}"
echo ""

# Check services
echo -e "${COLOR_BOLD}Service Status:${COLOR_RESET}"

services=(
    "3000:Frontend UI (Next.js):http://localhost:3000"
    "3001:Backend API:http://localhost:3001/api/health"
    "5432:PostgreSQL:"
    "6379:Redis:"
    "7050:Orderer:"
    "7051:Peer ECTA:"
    "9999:Coffee Chaincode:"
)

for service in "${services[@]}"; do
    IFS=':' read -r port name url <<< "$service"
    
    if test_port $port; then
        icon=$(get_status_icon "true")
        status="${COLOR_GREEN}Running${COLOR_RESET}"
        echo -e "$icon $(printf '%-30s' "$name") $status"
        if [ -n "$url" ]; then
            echo -e "${COLOR_GRAY}   └─ $url${COLOR_RESET}"
        fi
    else
        icon=$(get_status_icon "false")
        status="${COLOR_RED}Stopped${COLOR_RESET}"
        echo -e "$icon $(printf '%-30s' "$name") $status"
    fi
done

echo ""
echo -e "${COLOR_BOLD}Docker Containers:${COLOR_RESET}"

containers=$(docker ps --format "{{.Names}}\t{{.Status}}" 2>/dev/null)

if [ -n "$containers" ]; then
    while IFS=$'\t' read -r name status; do
        if [[ "$status" == *"Up"* ]]; then
            echo -e "${COLOR_GREEN}●${COLOR_RESET} $name ${COLOR_GRAY}- $status${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}◐${COLOR_RESET} $name ${COLOR_GRAY}- $status${COLOR_RESET}"
        fi
    done <<< "$containers"
else
    echo -e "${COLOR_RED}No Docker containers running${COLOR_RESET}"
fi

echo ""
echo -e "${COLOR_BOLD}Node.js Processes:${COLOR_RESET}"
node_processes=$(pgrep -f "node" 2>/dev/null | wc -l)
if [ "$node_processes" -gt 0 ]; then
    echo -e "${COLOR_GREEN}● $node_processes Node.js process(es) running${COLOR_RESET}"
    ps aux | grep "[n]ode" | awk '{printf "   └─ PID: %-6s Memory: %s\n", $2, $6}' | head -5
else
    echo -e "${COLOR_RED}○ No Node.js processes running${COLOR_RESET}"
fi

echo ""
echo -e "${COLOR_CYAN}══════════════════════════════════════${COLOR_RESET}"

# Overall status
ui_running=false
api_running=false
db_running=false

test_port 3000 && ui_running=true
test_port 3001 && api_running=true
test_port 5432 && db_running=true

if [ "$ui_running" = true ] && [ "$api_running" = true ] && [ "$db_running" = true ]; then
    echo ""
    echo -e "${COLOR_GREEN}${COLOR_BOLD}✓ System is fully operational${COLOR_RESET}"
    echo ""
    echo -e "Access the system at: ${COLOR_CYAN}http://localhost:3000${COLOR_RESET}"
elif [ "$api_running" = true ] || [ "$ui_running" = true ] || [ "$db_running" = true ]; then
    echo ""
    echo -e "${COLOR_YELLOW}${COLOR_BOLD}⚠ System is partially running${COLOR_RESET}"
    echo ""
    echo -e "To start all services: ${COLOR_CYAN}./start-all.sh --skip-build${COLOR_RESET}"
else
    echo ""
    echo -e "${COLOR_RED}${COLOR_BOLD}✗ System is not running${COLOR_RESET}"
    echo ""
    echo -e "To start the system: ${COLOR_CYAN}./start-all.sh --skip-build${COLOR_RESET}"
fi

echo ""
