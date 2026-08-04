#!/bin/bash
# Kill all processes on CECBS ports

echo "🔪 Killing all CECBS processes on ports..."

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local name=$2
    
    # Windows/Git Bash: Use netstat to find PID
    local pid=$(netstat -ano | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -1)
    
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        echo "  Killing $name on port $port (PID: $pid)..."
        taskkill //PID $pid //F 2>/dev/null || kill -9 $pid 2>/dev/null
    else
        echo "  ✓ Port $port is free"
    fi
}

# Kill specific ports
kill_port 3000 "UI (Next.js)"
kill_port 3001 "API (Express)"
kill_port 3002 "UI Fallback"

# Kill Node processes by name
echo ""
echo "🔪 Killing Node.js processes..."
pkill -f "node.*next" 2>/dev/null && echo "  ✓ Killed Next.js processes" || echo "  - No Next.js processes"
pkill -f "node.*ts-node" 2>/dev/null && echo "  ✓ Killed ts-node processes" || echo "  - No ts-node processes"
pkill -f "node.*server.ts" 2>/dev/null && echo "  ✓ Killed server processes" || echo "  - No server processes"

# Remove PID files
echo ""
echo "🗑️  Cleaning up PID files..."
rm -f /tmp/cecbs-api.pid /tmp/cecbs-ui.pid

echo ""
echo "✅ All CECBS processes killed and ports freed"
