#!/bin/bash

echo "Testing new document routes..."

# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ectaAdmin","password":"password123"}' | \
  grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Get documents by entity
echo "1. Testing GET /documents/entity/EXPORTER_APPLICATION/APP-00433126"
curl -s "http://localhost:3001/api/v1/documents/entity/EXPORTER_APPLICATION/APP-00433126" \
  -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""
echo ""

# Test 2: Upload registration document
echo "2. Testing POST /documents/upload-registration"
curl -s -X POST "http://localhost:3001/api/v1/documents/upload-registration" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "EXPORTER_APPLICATION",
    "entityId": "APP-00433126",
    "documentType": "BUSINESS_LICENSE",
    "fileName": "license.pdf",
    "fileHash": "abc123",
    "mimeType": "application/pdf",
    "fileSize": 12345
  }' | head -c 200
echo ""
echo ""

echo "✓ Tests completed"
