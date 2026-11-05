#!/bin/bash
# Quick blockchain status check

API_URL="http://localhost:3001/api/v1"

# Login as admin
echo "Logging in..."
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    echo "$login_response"
    exit 1
fi

echo "✅ Login successful"
echo ""

# Check blockchain network
echo "Checking blockchain network..."
blockchain_response=$(curl -s -X GET "$API_URL/blockchain/network" \
    -H "Authorization: Bearer $TOKEN")

echo "$blockchain_response" | python3 -m json.tool 2>/dev/null || echo "$blockchain_response"
echo ""

# Check if Fabric peers are running
echo "Checking Hyperledger Fabric peers..."
docker ps --filter "name=peer" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Cannot check Docker containers"
echo ""

# Check CouchDB connection (for direct blockchain queries)
echo "Checking CouchDB (blockchain state database)..."
curl -s http://127.0.0.1:5985/ 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "CouchDB not accessible"
