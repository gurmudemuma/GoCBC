#!/bin/bash

AUTH_TOKEN="test-bypass-admin"
API="http://localhost:3001/api/v1"

echo "Testing Compliance Reports..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API/compliance/reports" > /tmp/test-compliance.json
cat /tmp/test-compliance.json
echo ""

echo "Testing Warehouse Inventory..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API/warehouse/inventory" > /tmp/test-warehouse.json  
cat /tmp/test-warehouse.json
echo ""

echo "Testing EUDR Records..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API/eudr" > /tmp/test-eudr.json
cat /tmp/test-eudr.json
echo ""

echo "Testing Document Verification..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API/customs/document-verification" > /tmp/test-docs.json
cat /tmp/test-docs.json
echo ""
