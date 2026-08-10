#!/bin/bash

echo "Testing approval flow..."

# Get token
token=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ectaAdmin","password":"password123"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

echo "Token: ${token:0:20}..."
echo ""

# Approve first application
app_id="APP-89403477"
echo "Approving $app_id..."
echo ""

response=$(curl -s -X POST "http://localhost:3001/api/v1/exporters/exporter-applications/$app_id/approve" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP-TEST-001",
    "ectaLicenseNumber": "ECTA-LIC-001",
    "licenseExpiryDate": "2027-12-31",
    "bankName": "Commercial Bank of Ethiopia",
    "bankAccountNumber": "1000123456",
    "bankBranch": "Main Branch",
    "bankBranchCode": "001"
  }')

echo "Response:"
echo "$response"
echo ""

# Check if success
if echo "$response" | grep -q '"success":true'; then
  echo "✅ Approval successful!"
else
  echo "❌ Approval failed"
  echo ""
  echo "Checking API logs..."
  docker logs cecbs-api 2>&1 | tail -20 || true
fi
