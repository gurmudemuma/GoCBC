#!/bin/bash

echo "======================================================================"
echo "GoCBC Simple API Test - Testing All Endpoints"
echo "======================================================================"
echo ""

API_URL="http://localhost:3001/api/v1"

echo "1. Testing Health Endpoint..."
curl -s "$API_URL/health" | head -10
echo ""
echo ""

echo "2. Testing Authentication..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1)
echo "$AUTH_RESPONSE" | head -10
echo ""
echo ""

echo "3. Testing Contracts Endpoint..."
curl -s "$API_URL/contracts" | head -10
echo ""
echo ""

echo "4. Testing Exporters Endpoint..."
curl -s "$API_URL/exporters" | head -10
echo ""
echo ""

echo "5. Testing Shipments Endpoint..."
curl -s "$API_URL/shipments" | head -10
echo ""
echo ""

echo "======================================================================"
echo "Test Complete"
echo "======================================================================"
