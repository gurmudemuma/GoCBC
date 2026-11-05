#!/bin/bash

echo "=== Building API ==="
cd /home/guda/GoCBC/api
npx tsc
echo "Build complete"

echo ""
echo "=== Running Migration ==="
PGCONTAINER=$(docker ps -q -f name=postgres | head -1)
if [ -n "$PGCONTAINER" ]; then
    docker exec -i $PGCONTAINER psql -U postgres -d coffee_export < src/migrations/029_add_missing_portal_tables.sql
    echo "Migration complete"
else
    echo "Postgres container not found"
fi

echo ""
echo "=== Restarting API Server ==="
pkill -9 -f "node.*dist/server.js"
sleep 2
nohup node dist/server.js > /tmp/api-server.log 2>&1 &
sleep 3

echo ""
echo "=== Checking API Health ==="
curl -s http://localhost:3001/api/v1/health | jq '.' || echo "API not responding"

echo ""
echo "=== Running Comprehensive Portal Tests ==="
cd /home/guda/GoCBC
bash test-all-portals-comprehensive.sh

echo ""
echo "=== Done ==="
