#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Quick Fix: Login Issue                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd /home/guda/GoCBC

echo "Step 1: Seeding database with users..."
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < scripts/seed-users.sql 2>&1 | grep -E "INSERT|SELECT" || echo "  Seed script executed"
echo ""

echo "Step 2: Verifying users exist..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT username, role FROM users LIMIT 3;"
echo ""

echo "Step 3: Restarting API container..."
docker restart cecbs-api > /dev/null 2>&1
echo "  Waiting for API to initialize (10 seconds)..."
sleep 10
echo ""

echo "Step 4: Testing login endpoint..."
echo "  Attempting login with username: admin, password: admin123"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1)

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"token"'; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           ✅ SUCCESS! Login is working!                        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "You can now:"
    echo "  1. Open UI at http://localhost:3000"
    echo "  2. Login with username: admin, password: admin123"
    echo "  3. Run E2E test: bash complete-e2e-test.sh"
else
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           ❌ Login still failing                               ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Checking API logs for errors..."
    echo ""
    docker logs cecbs-api --tail 30 2>&1 | grep -E "error|Error|ERROR|POST /api/v1/auth/login" | tail -15
fi

echo ""
