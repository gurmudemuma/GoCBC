#!/bin/bash

echo "=================================="
echo "  FULL SYSTEM STATUS CHECK"
echo "=================================="
echo ""

echo "1. API PROCESS CHECK"
echo "--------------------"
ps aux | grep -E "[n]ode.*server|[n]pm.*start" | head -5 || echo "No API processes found"
echo ""

echo "2. PORT STATUS"
echo "--------------------"
ss -tln | grep -E ":3001|:3000|:5984" || echo "Ports not listening"
echo ""

echo "3. API HEALTH CHECK"
echo "--------------------"
curl -s -m 3 http://localhost:3001/health 2>&1 || echo "API not responding"
echo ""

echo "4. UI STATUS"
echo "--------------------"
curl -s -m 3 http://localhost:3000 2>&1 | head -3 || echo "UI not responding"
echo ""

echo "5. DOCKER CONTAINERS"
echo "--------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|peer|couchdb|postgres|orderer" | head -10
echo ""

echo "6. DATABASE MIGRATION STATUS"
echo "--------------------"
docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT migration_name FROM _schema_migrations ORDER BY applied_at DESC LIMIT 5;" 2>&1
echo ""

echo "7. RECENT API ERRORS (if any)"
echo "--------------------"
if [ -f /home/guda/GoCBC/logs/api.log ]; then
    grep -i "error\|failed" /home/guda/GoCBC/logs/api.log | tail -5 || echo "No recent errors"
else
    echo "No API log file found"
fi
echo ""

echo "=================================="
echo "  END OF STATUS CHECK"
echo "=================================="
