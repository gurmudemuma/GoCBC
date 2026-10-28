#!/bin/bash

# Quick System Test
echo "======================================"
echo "GoCBC Quick System Test"
echo "======================================"
echo ""

# Test 1: API Health
echo "1. Testing API Health..."
API_HEALTH=$(curl -s --max-time 3 http://localhost:3001/health 2>&1)
if echo "$API_HEALTH" | grep -q "status"; then
    echo "   ✓ API is healthy"
else
    echo "   ✗ API is not responding"
fi

# Test 2: UI Server
echo "2. Testing UI Server..."
UI_TEST=$(curl -s --max-time 3 -I http://localhost:3000 2>&1)
if echo "$UI_TEST" | grep -q "200"; then
    echo "   ✓ UI is running"
else
    echo "   ✗ UI is not responding"
fi

# Test 3: Login
echo "3. Testing Login..."
LOGIN_RESULT=$(curl -s --max-time 5 -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>&1)
if echo "$LOGIN_RESULT" | grep -q "token"; then
    echo "   ✓ Login successful"
    TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   ✓ Auth token received"
else
    echo "   ✗ Login failed"
fi

# Test 4: Database
echo "4. Testing Database..."
if [ -f "api/.env" ]; then
    DB_URL=$(grep "^DATABASE_URL=" api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ ! -z "$DB_URL" ] && command -v psql &> /dev/null; then
        USER_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM users WHERE status='active';" 2>/dev/null | tr -d ' ')
        if [ ! -z "$USER_COUNT" ]; then
            echo "   ✓ Database connected ($USER_COUNT active users)"
        else
            echo "   ⚠ Database query failed"
        fi
    else
        echo "   ⚠ psql not available, skipping"
    fi
else
    echo "   ⚠ .env file not found"
fi

# Test 5: Blockchain
echo "5. Testing Blockchain..."
PEER_COUNT=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c "peer0\." || echo "0")
ORDERER_COUNT=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c "orderer" || echo "0")
echo "   ✓ Peers: $PEER_COUNT/6 running"
echo "   ✓ Orderer: $ORDERER_COUNT/1 running"

# Test 6: Chaincode
echo "6. Testing Chaincode..."
CHAINCODE_STATUS=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "NOT_FOUND")
if echo "$CHAINCODE_STATUS" | grep -q "Version:"; then
    echo "   ✓ Chaincode committed"
else
    echo "   ✗ Chaincode not committed"
fi

echo ""
echo "======================================"
echo "Test Complete"
echo "======================================"
echo ""
echo "Access the application at:"
echo "  http://localhost:3000"
echo ""
echo "Login credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
