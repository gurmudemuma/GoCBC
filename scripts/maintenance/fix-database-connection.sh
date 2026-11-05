#!/bin/bash

echo "========================================="
echo "Database Connection Fix"
echo "========================================="

# Check if PostgreSQL container exists and is running
echo "1. Checking PostgreSQL container status..."
PG_STATUS=$(docker inspect -f '{{.State.Running}}' cecbs-postgres 2>/dev/null)

if [ "$PG_STATUS" == "true" ]; then
    echo "   ✓ PostgreSQL container is running"
else
    echo "   ✗ PostgreSQL container is not running"
    echo "   Starting PostgreSQL..."
    cd /home/guda/GoCBC
    docker-compose -f docker-compose-fabric.yml up -d postgres
    sleep 5
    echo "   ✓ PostgreSQL started"
fi

# Check if API container can reach PostgreSQL
echo ""
echo "2. Testing database connection from API container..."
DB_TEST=$(docker exec cecbs-api nc -zv cecbs-postgres 5432 2>&1)

if echo "$DB_TEST" | grep -q "open\|succeeded"; then
    echo "   ✓ API container can reach PostgreSQL"
else
    echo "   ✗ API container cannot reach PostgreSQL"
    echo "   Checking network configuration..."
    
    # Check if both containers are on the same network
    API_NETWORK=$(docker inspect -f '{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}' cecbs-api 2>/dev/null)
    PG_NETWORK=$(docker inspect -f '{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}' cecbs-postgres 2>/dev/null)
    
    echo "   API network: $API_NETWORK"
    echo "   PostgreSQL network: $PG_NETWORK"
    
    # Connect API to cecbs network if not connected
    if ! echo "$API_NETWORK" | grep -q "cecbs"; then
        echo "   Connecting API container to cecbs network..."
        docker network connect cecbs cecbs-api 2>/dev/null || true
        echo "   ✓ Connected"
    fi
fi

# Restart API container to pick up connection
echo ""
echo "3. Restarting API container..."
docker restart cecbs-api
sleep 10

# Test API health
echo ""
echo "4. Testing API health..."
for i in {1..10}; do
    HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
    if echo "$HEALTH" | grep -q "healthy\|ok"; then
        echo "   ✓ API is healthy!"
        echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
        exit 0
    fi
    echo "   Waiting... ($i/10)"
    sleep 2
done

echo "   ✗ API health check failed"
echo ""
echo "Showing API logs:"
docker logs cecbs-api --tail=20

exit 1
