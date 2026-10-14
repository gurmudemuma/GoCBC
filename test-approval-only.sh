#!/bin/bash

# Quick test of just the approval endpoint
API_URL="http://localhost:3001/api/v1"

# Login as admin
echo "Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token')
echo "Admin token: ${ADMIN_TOKEN:0:30}..."

# Create ECTA user
echo "Creating ECTA user..."
ECTA_RESPONSE=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "ecta.quicktest",
    "email": "ecta.quicktest@ecta.gov.et",
    "password": "EctaPass123!",
    "fullName": "ECTA Quick Test",
    "organization": "ECTAMSP",
    "role": "ECTA",
    "phoneNumber": "+251911111111"
  }')

# Login as ECTA
ECTA_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "ecta.quicktest", "password": "EctaPass123!"}')

ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token')
echo "ECTA token: ${ECTA_TOKEN:0:30}..."

# Check if there are any pending applications
echo "Checking for pending applications..."
APPS=$(curl -s -X GET "$API_URL/exporters/exporter-applications?status=pending" \
  -H "Authorization: Bearer $ECTA_TOKEN")

echo "Pending applications:"
echo "$APPS" | jq '.data | length'

# Get the first pending application ID  
APP_ID=$(echo "$APPS" | jq -r '.data.applications[0].application_id // empty')

if [ -z "$APP_ID" ] || [ "$APP_ID" = "null" ]; then
    echo "Could not extract application ID"
    exit 1
fi

echo "Testing approval for application: $APP_ID"
echo "Starting approval request (max 120 seconds)..."
START_TIME=$(date +%s)

APPROVAL_RESPONSE=$(curl -s --max-time 120 -X POST "$API_URL/exporters/exporter-applications/$APP_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d '{
    "exporterId": "EXP-QUICKTEST-001",
    "ectaLicenseNumber": "ECTA-LIC-QUICKTEST-001",
    "licenseExpiryDate": "'$(date -d '+2 years' +%Y-%m-%d)'",
    "comments": "Quick test approval",
    "reviewedBy": "Test Officer"
  }')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Request completed in $DURATION seconds"
echo ""
echo "=== Approval Response ==="
echo "$APPROVAL_RESPONSE" | jq '.'
echo "========================="

# Check if it was successful
SUCCESS=$(echo "$APPROVAL_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
    echo "✅ Approval SUCCESSFUL"
else
    echo "❌ Approval FAILED"
    ERROR=$(echo "$APPROVAL_RESPONSE" | jq -r '.error.message // "Unknown error"')
    echo "Error: $ERROR"
fi
