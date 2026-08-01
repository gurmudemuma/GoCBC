#!/bin/bash
# Start CECBS in development mode with separate terminals
# Usage: ./dev-mode.sh

set -e

# Colors
COLOR_CYAN='\033[36m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_BOLD='\033[1m'
COLOR_RESET='\033[0m'

echo ""
echo -e "${COLOR_CYAN}${COLOR_BOLD}Starting CECBS Development Environment${COLOR_RESET}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if tmux is available
if command -v tmux &> /dev/null; then
    USE_TMUX=true
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} tmux detected - will use terminal multiplexer"
elif command -v gnome-terminal &> /dev/null || command -v xterm &> /dev/null || command -v konsole &> /dev/null; then
    USE_TMUX=false
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} Terminal emulator detected"
else
    USE_TMUX=false
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} No terminal multiplexer found"
    echo "Install tmux for better experience: sudo apt-get install tmux (Ubuntu/Debian)"
    echo ""
fi

# Start infrastructure first
echo "Starting blockchain infrastructure..."
echo "(This will take about 60 seconds)"
echo ""

# Start in background
./start-all.sh --skip-build > /tmp/cecbs-infra.log 2>&1 &
INFRA_PID=$!

# Wait for infrastructure
echo -n "Waiting for infrastructure"
for i in {1..30}; do
    if ps -p $INFRA_PID > /dev/null 2>&1; then
        echo -n "."
        sleep 2
    else
        break
    fi
done
echo ""

if ! ps -p $INFRA_PID > /dev/null 2>&1; then
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} Infrastructure started"
else
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} Infrastructure startup is still running..."
    echo "You can continue - opening development terminals..."
    sleep 3
fi

echo ""
echo "Opening development terminals..."
echo ""

if [ "$USE_TMUX" = true ]; then
    # Use tmux
    SESSION_NAME="cecbs-dev"
    
    # Kill existing session if it exists
    tmux kill-session -t $SESSION_NAME 2>/dev/null || true
    
    # Create new session with API
    tmux new-session -d -s $SESSION_NAME -n "API" "cd '$PROJECT_ROOT/api' && echo '🔥 Backend API Development Server' && echo '================================' && echo '' && echo 'Starting with hot-reload...' && echo '' && npm run dev; bash"
    
    # Create UI window
    tmux new-window -t $SESSION_NAME -n "UI" "cd '$PROJECT_ROOT/ui' && echo '🔥 Frontend UI Development Server' && echo '===============================' && echo '' && echo 'Starting with hot-reload...' && echo '' && npm run dev; bash"
    
    # Create Docker logs window
    tmux new-window -t $SESSION_NAME -n "Logs" "cd '$PROJECT_ROOT' && echo '📋 Docker Container Logs' && echo '=====================' && echo '' && echo 'Watching all container logs...' && echo '' && sleep 2 && docker-compose -f docker-compose-fabric.yml logs -f"
    
    # Create monitor window
    tmux new-window -t $SESSION_NAME -n "Monitor" "cd '$PROJECT_ROOT' && echo '📊 CECBS System Monitor' && echo '====================' && echo '' && echo 'Commands:' && echo '  ./status.sh          - Check system status' && echo '  ./stop-all.sh        - Stop all services' && echo '  ./restart-all.sh     - Restart services' && echo '' && echo 'Checking initial status...' && echo '' && sleep 3 && ./status.sh; bash"
    
    # Attach to session
    echo -e "${COLOR_GREEN}${COLOR_BOLD}✓ tmux session created!${COLOR_RESET}"
    echo ""
    echo "Attaching to tmux session..."
    echo ""
    echo -e "${COLOR_CYAN}tmux keyboard shortcuts:${COLOR_RESET}"
    echo "  Ctrl+b then c - Create new window"
    echo "  Ctrl+b then n - Next window"
    echo "  Ctrl+b then p - Previous window"
    echo "  Ctrl+b then d - Detach session"
    echo "  Ctrl+b then [ - Scroll mode (q to exit)"
    echo ""
    echo "To reattach later: tmux attach -t $SESSION_NAME"
    echo ""
    sleep 3
    
    tmux attach -t $SESSION_NAME

else
    # Fallback to manual instructions
    echo -e "${COLOR_YELLOW}Manual terminal setup:${COLOR_RESET}"
    echo ""
    echo "Please open 4 separate terminals and run:"
    echo ""
    echo -e "${COLOR_GREEN}Terminal 1 (API):${COLOR_RESET}"
    echo "  cd '$PROJECT_ROOT/api' && npm run dev"
    echo ""
    echo -e "${COLOR_GREEN}Terminal 2 (UI):${COLOR_RESET}"
    echo "  cd '$PROJECT_ROOT/ui' && npm run dev"
    echo ""
    echo -e "${COLOR_GREEN}Terminal 3 (Logs):${COLOR_RESET}"
    echo "  cd '$PROJECT_ROOT' && docker-compose -f docker-compose-fabric.yml logs -f"
    echo ""
    echo -e "${COLOR_GREEN}Terminal 4 (Monitor):${COLOR_RESET}"
    echo "  cd '$PROJECT_ROOT' && ./status.sh"
    echo ""
    
    # Try to open terminals automatically on Linux with GUI
    if [ -n "$DISPLAY" ]; then
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --tab --title="API Dev" -- bash -c "cd '$PROJECT_ROOT/api' && npm run dev; bash" \
                          --tab --title="UI Dev" -- bash -c "cd '$PROJECT_ROOT/ui' && npm run dev; bash" \
                          --tab --title="Docker Logs" -- bash -c "cd '$PROJECT_ROOT' && docker-compose -f docker-compose-fabric.yml logs -f" \
                          --tab --title="Monitor" -- bash -c "cd '$PROJECT_ROOT' && ./status.sh; bash" 2>/dev/null || true
        elif command -v xterm &> /dev/null; then
            xterm -T "API Dev" -e "cd '$PROJECT_ROOT/api' && npm run dev; bash" &
            xterm -T "UI Dev" -e "cd '$PROJECT_ROOT/ui' && npm run dev; bash" &
            xterm -T "Docker Logs" -e "cd '$PROJECT_ROOT' && docker-compose -f docker-compose-fabric.yml logs -f" &
            xterm -T "Monitor" -e "cd '$PROJECT_ROOT' && ./status.sh; bash" &
        fi
    fi
fi

echo ""
echo -e "${COLOR_GREEN}${COLOR_BOLD}✓ Development environment ready!${COLOR_RESET}"
echo ""
echo -e "${COLOR_CYAN}Access Points:${COLOR_RESET}"
echo "  Frontend: ${COLOR_GREEN}http://localhost:3000${COLOR_RESET}"
echo "  Backend:  ${COLOR_GREEN}http://localhost:3001${COLOR_RESET}"
echo "  API Docs: ${COLOR_GREEN}http://localhost:3001/api-docs${COLOR_RESET}"
echo ""
echo -e "${COLOR_YELLOW}Pro Tips:${COLOR_RESET}"
echo "  • API and UI will auto-reload on file changes"
echo "  • Watch Docker logs for blockchain events"
echo "  • Run ./status.sh anytime to check status"
echo "  • Press Ctrl+C in any terminal to stop that service"
echo ""
echo "Happy coding! 🚀"
echo ""
