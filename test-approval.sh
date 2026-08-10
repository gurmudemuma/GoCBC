#!/bin/bash

echo "Testing exporter application approval..."

# Login and get token
token=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ectaAdmin","password":"password123"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

echo "Token: ${token:0:20}..."

# Approve application
echo ""
echo "Approving application..."
curl -s -X POST "http://localhost:3001/api/v1/exporters/exporter-applications/APP-89282566/approve" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId":"EXP123",
    "ectaLicenseNumber":"LIC123",
    "licenseExpiryDate":"2027-12-31",
    "bankName":"CBE",
    "bankAccountNumber":"1000123",
    "bankBranch":"AA",
    "bankBranchCode":"001"
  }'
echo ""
