#!/bin/bash

set -e

echo "=============================================="
echo "Complete Login Fix - Killing all conflicts"
echo "=============================================="
echo ""

# 1. Kill all local API processes
echo "1. Killing local API processes..."
pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
pkill -f "node.*api.*3001" 2>/dev/null || true
sleep 2
echo "   ✅ Local processes killed"
echo ""

# 2. Stop and remove API container
echo "2. Stopping API container..."
cd /home/guda/GoCBC
docker-compose -f docker-compose-fabric.yml stop cecbs-api
docker rm -f cecbs-api 2>/dev/null || true
echo "   ✅ Container removed"
echo ""

# 3. Recreate container
echo "3. Recreating API container..."
docker-compose -f docker-compose-fabric.yml up -d cecbs-api
echo "   ✅ Container created"
echo ""

# 4. Wait for startup
echo "4. Waiting for API to start (30 seconds)..."
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""
echo ""

# 5. Check logs
echo "5. Checking API logs..."
docker logs cecbs-api --tail 10 2>&1 | grep -E "started|Gateway|error" || echo "   No startup messages yet"
echo ""

# 6. Test health endpoint
echo "6. Testing health endpoint..."
HEALTH=$(curl -s -w "\nHTTP:%{http_code}" http://localhost:3001/health 2>&1 | tail -1)
echo "   Result: $HEALTH"
echo ""

# 7. Test login
echo "7. Testing login endpoint..."
LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1)

if echo "$LOGIN" | grep -q '"success":true'; then
    echo "   ✅ LOGIN SUCCESSFUL!"
    echo ""
    echo "Token: $(echo "$LOGIN" | jq -r '.data.token' 2>/dev/null | cut -c1-50)..."
else
    echo "   ❌ Login failed"
    echo "   Response: $LOGIN"
fi

echo ""
echo "=============================================="
echo "Fix complete! Try logging in at:"
echo "http://localhost:3000"
echo ""
echo "Credentials: admin / admin123"
echo "=============================================="
