#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Fix Login Issue & Test                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Seed users
echo "📝 Step 1: Seeding admin users..."
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < scripts/seed-users.sql 2>&1 | grep -E "INSERT|ERROR" || echo "Seed script executed"
echo ""

# 2. Verify users exist
echo "👥 Step 2: Verifying users in database..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT username, role, organization, status FROM users WHERE username IN ('admin', 'ecta_admin');"
echo ""

# 3. Test login endpoint
echo "🔐 Step 3: Testing login endpoint..."
echo "Testing with username: admin, password: admin123"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# 4. Check if successful
if echo "$RESPONSE" | grep -q '"token"'; then
    echo "✅ Login successful!"
    echo ""
    echo "Token:"
    echo "$RESPONSE" | jq -r '.data.token' 2>/dev/null
else
    echo "❌ Login failed!"
    echo ""
    echo "Checking API logs for errors..."
    docker logs cecbs-api --tail 30 2>&1 | grep -A 5 "login\|error\|Error"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Available Login Credentials                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "System Admin:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "ECTA Admin:"
echo "  Username: ecta_admin"
echo "  Password: password123"
echo ""
echo "NBE Admin:"
echo "  Username: nbe_admin"
echo "  Password: password123"
echo ""
