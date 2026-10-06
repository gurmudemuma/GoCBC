#!/bin/bash

# GoCBC System Monitor - Real-time dashboard
# Press Ctrl+C to exit

while true; do
    clear
    echo "=========================================="
    echo "   GoCBC SYSTEM MONITOR"
    echo "   $(date)"
    echo "=========================================="
    echo ""
    
    # Container status
    echo "📦 CONTAINERS:"
    RUNNING=$(docker ps --format "{{.Names}}" | wc -l)
    echo "   Running: $RUNNING containers"
    echo ""
    
    # API Status
    echo "🔌 API STATUS:"
    for endpoint in health repatriation/health inspection/health bordercrossing/health banking/health; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/$endpoint 2>&1 | grep -q "200"; then
            echo "   ✓ /api/$endpoint"
        else
            echo "   ✗ /api/$endpoint"
        fi
    done
    echo ""
    
    # Database
    echo "💾 DATABASE:"
    if docker exec $(docker ps -q -f name=postgres) psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
        echo "   ✓ PostgreSQL OK"
    else
        echo "   ✗ PostgreSQL FAILED"
    fi
    echo ""
    
    # Chaincode
    echo "⛓️  CHAINCODE:"
    if docker ps | grep -q coffee-chaincode; then
        echo "   ✓ Container running"
    else
        echo "   ✗ Container not running"
    fi
    echo ""
    
    # Resources
    echo "📊 RESOURCES:"
    echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
    echo "   Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "   Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo ""
    
    echo "=========================================="
    echo "Refreshing in 5 seconds... (Ctrl+C to exit)"
    sleep 5
done
