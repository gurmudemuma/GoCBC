#!/bin/bash

echo "======================================"
echo "CECBS System Status Check"
echo "======================================"
echo ""

# Check Docker
echo "1. Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | head -20
echo ""

# Check Node processes  
echo "2. Node.js Processes:"
ps aux | grep "[n]ode" | awk '{print $11, $12, $13, $14}' | head -10
echo ""

# Check ports
echo "3. Listening Ports (3000, 3001):"
netstat -tlnp 2>/dev/null | grep -E ":(3000|3001)" || echo "Port check failed"
echo ""

# Check API
echo "4. API Health Check:"
curl -s http://localhost:3001/health 2>&1 | head -5
echo ""

# Check UI
echo "5. UI Server Check:"
curl -s http://localhost:3000 2>&1 | head -5
echo ""

# Check Database
echo "6. Database Check:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 'DB_OK' as status" 2>&1 | grep -E "DB_OK|ERROR"
echo ""

echo "======================================"
