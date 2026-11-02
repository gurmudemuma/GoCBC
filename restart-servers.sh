#!/bin/bash

################################################################################
# Quick Server Restart Script
# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
#
# This script:
# 1. Kills any processes on ports 3000 and 3001
# 2. Provides instructions for manual startup
################################################################################

# Colors
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/api"
UI_DIR="$SCRIPT_DIR/ui"

echo ""
echo -e "${COLOR_CYAN}${COLOR_BOLD}Cleaning up ports 3000 and 3001...${COLOR_RESET}"
echo ""

# Kill processes on API port (3001)
if lsof -ti:3001 &>/dev/null; then
    echo -e "${COLOR_YELLOW}Killing processes on port 3001...${COLOR_RESET}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    pkill -9 -f "ts-node.*server.ts" 2>/dev/null || true
    pkill -9 -f "node.*api" 2>/dev/null || true
    sleep 1
    echo -e "${COLOR_GREEN}✓ Port 3001 cleared${COLOR_RESET}"
else
    echo -e "${COLOR_GREEN}✓ Port 3001 already free${COLOR_RESET}"
fi

# Kill processes on UI port (3000)
if lsof -ti:3000 &>/dev/null; then
    echo -e "${COLOR_YELLOW}Killing processes on port 3000...${COLOR_RESET}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
    echo -e "${COLOR_GREEN}✓ Port 3000 cleared${COLOR_RESET}"
else
    echo -e "${COLOR_GREEN}✓ Port 3000 already free${COLOR_RESET}"
fi

# Clean up PID files
rm -f "$SCRIPT_DIR/.api.pid" "$SCRIPT_DIR/.ui.pid" 2>/dev/null

echo ""
echo -e "${COLOR_GREEN}${COLOR_BOLD}✅ Ports are clean and ready!${COLOR_RESET}"
echo ""
echo -e "${COLOR_CYAN}${COLOR_BOLD}Start the servers manually:${COLOR_RESET}"
echo ""
echo -e "${COLOR_YELLOW}Terminal 1 - API:${COLOR_RESET}"
echo -e "  cd $API_DIR && npm run dev"
echo ""
echo -e "${COLOR_YELLOW}Terminal 2 - UI:${COLOR_RESET}"
echo -e "  cd $UI_DIR && npm run dev"
echo ""
echo -e "${COLOR_BLUE}Then access: http://localhost:3000${COLOR_RESET}"
echo ""
