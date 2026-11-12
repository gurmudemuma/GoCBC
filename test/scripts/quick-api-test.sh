#!/bin/bash

API_BASE="http://localhost:3001/api/v1"

echo "=== Quick API Test ==="
echo ""

# Test 1: Root endpoint (no auth)
echo "1. Testing root endpoint..."
curl -s http://localhost:3001/ | head -c 200
echo ""
echo ""

# Test 2: Try login with username
echo "2. Attempting login..."
curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | head -c 300
echo ""
echo ""

# Test 3: If that fails, try with test-admin
echo "3. Attempting login with test-admin..."
curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test-admin","password":"password123"}' | head -c 300
echo ""
echo ""

# Test 4: Get users list from database
echo "4. Checking database for users..."
PGPASSWORD=postgres psql -h localhost -U postgres -d cecbs_db -c "SELECT username, role, organization FROM users LIMIT 5;" 2>&1 | head -n 20

echo ""
echo "=== Test Complete ==="
