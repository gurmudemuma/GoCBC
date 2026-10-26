#!/bin/bash
# Check CECBS System Status

echo "==============================================="
echo "  CECBS System Status Check"
echo "==============================================="
echo ""

# Check Docker containers
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker not available"
echo ""

# Check API
echo "API Server (port 3001):"
if curl -s --max-time 2 http://localhost:3001/api/v1/health | grep -q "status"; then
    echo "✓ API is running and healthy"
else
    echo "✗ API is not responding"
fi
echo ""

# Check UI
echo "UI Server (port 3000):"
if curl -s --max-time 2 -I http://localhost:3000 | grep -q "HTTP"; then
    echo "✓ UI is running"
else
    echo "✗ UI is not responding"
fi
echo ""

# Check if processes are running
echo "Node.js Processes:"
ps aux | grep -E "[n]ode.*api|[n]ode.*ui|[n]pm.*dev|[n]pm.*start" | head -5 || echo "No Node processes found"
echo ""

echo "==============================================="
echo "Access URLs:"
echo "  UI:  http://localhost:3000"
echo "  API: http://localhost:3001"
echo "==============================================="
