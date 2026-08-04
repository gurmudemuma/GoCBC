#!/bin/bash
# Check Status of CECBS Services

echo "=================================================="
echo "  CECBS System Status"
echo "=================================================="
echo ""

# Check ports
echo "📡 Port Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_port() {
    local port=$1
    local name=$2
    local pid=$(netstat -ano 2>/dev/null | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -1)
    
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        echo "✓ Port $port ($name) - RUNNING (PID: $pid)"
        return 0
    else
        echo "✗ Port $port ($name) - NOT RUNNING"
        return 1
    fi
}

api_running=0
ui_running=0

check_port 3001 "API" && api_running=1
check_port 3000 "UI" && ui_running=1 || check_port 3002 "UI Fallback" && ui_running=1

echo ""
echo "📋 PID Files:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f /tmp/cecbs-api.pid ]; then
    pid=$(cat /tmp/cecbs-api.pid)
    if ps -p $pid > /dev/null 2>&1; then
        echo "✓ API PID file exists: $pid (process running)"
    else
        echo "⚠ API PID file exists: $pid (process NOT running - stale)"
    fi
else
    echo "✗ API PID file not found"
fi

if [ -f /tmp/cecbs-ui.pid ]; then
    pid=$(cat /tmp/cecbs-ui.pid)
    if ps -p $pid > /dev/null 2>&1; then
        echo "✓ UI PID file exists: $pid (process running)"
    else
        echo "⚠ UI PID file exists: $pid (process NOT running - stale)"
    fi
else
    echo "✗ UI PID file not found"
fi

echo ""
echo "🌐 Service Health:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $api_running -eq 1 ]; then
    health_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
    if [ "$health_response" = "200" ]; then
        echo "✓ API Health Check: OK (200)"
    else
        echo "⚠ API Health Check: FAILED ($health_response)"
    fi
else
    echo "✗ API not running"
fi

if [ $ui_running -eq 1 ]; then
    # Try both ports
    ui_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
    if [ "$ui_response" = "200" ]; then
        echo "✓ UI Health Check: OK (http://localhost:3000)"
    else
        ui_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null)
        if [ "$ui_response" = "200" ]; then
            echo "✓ UI Health Check: OK (http://localhost:3002)"
        else
            echo "⚠ UI Health Check: FAILED"
        fi
    fi
else
    echo "✗ UI not running"
fi

echo ""
echo "🐳 Docker Containers:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "cecbs|orderer|peer" || echo "No CECBS containers running"

echo ""
echo "=================================================="
echo ""
echo "💡 Quick Commands:"
echo "   View API logs:  bash logs-api.sh"
echo "   View UI logs:   bash logs-ui.sh"
echo "   Restart API:    bash restart-api.sh"
echo "   Restart UI:     bash restart-ui.sh"
echo "   Restart All:    bash restart-all.sh"
echo "   Kill ports:     bash kill-ports.sh"
echo ""
