#!/bin/bash

# Quick health check for all GoCBC services
echo "=== GoCBC Health Check ==="
echo ""

# Check containers
echo "1. Docker Containers:"
RUNNING=$(docker ps --format "{{.Names}}" | wc -l)
echo "   Running: $RUNNING containers"

# Check API
echo "2. API Health:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✓ API responding"
else
    echo "   ✗ API not responding"
fi

# Check new features
echo "3. New Features:"
for endpoint in repatriation inspection bordercrossing banking; do
    if curl -s http://localhost:3000/api/$endpoint/health > /dev/null 2>&1; then
        echo "   ✓ $endpoint OK"
    else
        echo "   ✗ $endpoint FAILED"
    fi
done

# Check database
echo "4. Database:"
if docker exec $(docker ps -q -f name=postgres) psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ PostgreSQL accessible"
else
    echo "   ✗ PostgreSQL not accessible"
fi

# Check chaincode
echo "5. Chaincode:"
if docker ps | grep -q coffee-chaincode; then
    echo "   ✓ Chaincode container running"
else
    echo "   ✗ Chaincode container not running"
fi

echo ""
echo "Health check complete."
