#!/bin/bash

# Register Test Exporter EXP001 with Authentication

echo "=========================================="
echo "Registering Test Exporter EXP001"
echo "=========================================="

# Step 1: Get admin token
echo "[1/2] Getting admin authentication token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Admin token obtained"

# Step 2: Register exporter
echo ""
echo "[2/2] Registering exporter EXP001..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/exporters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "exporterID": "EXP001",
    "companyName": "Test Coffee Exporter Ltd",
    "ectaLicenseNumber": "ECTA-2024-001",
    "exporterType": "company",
    "capitalRequirement": 5000000,
    "professionalTaster": "yes",
    "tasterCertificate": "TASTER-CERT-001",
    "laboratoryCertificateNumber": "LAB-CERT-001",
    "licenseExpiryDate": "2027-12-31"
  }')

echo "$REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Exporter EXP001 registered successfully"
else
    echo ""
    echo "⚠️ Registration response (may already exist):"
    echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
fi

echo ""
echo "=========================================="
