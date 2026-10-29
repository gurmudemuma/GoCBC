#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Get ECTA token
ECTA_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"cecbs2024"}' | jq -r '.data.token')

echo "ECTA Token: ${ECTA_TOKEN:0:50}..."

# Application ID from the test run
APPLICATION_ID="APP-1793253996943-OHC62D"
DB_APP_ID="4"

echo "Approving application: $APPLICATION_ID (DB ID: $DB_APP_ID)"

# Approve the application
APPROVAL_DATA=$(cat <<EOF
{
  "exporterId": "EXP-TEST-1793253996",
  "ectaLicenseNumber": "ECTA-TEST-1793253996",
  "licenseExpiryDate": "$(date -d '+1 year' +%Y-%m-%d)",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1234567890",
  "bankBranch": "Main Branch",
  "bankBranchCode": "001"
}
EOF
)

echo "Sending approval request..."
APPROVAL_RESPONSE=$(curl -s -X POST "${API_URL}/exporters/exporter-applications/${DB_APP_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$APPROVAL_DATA")

echo "Approval Response:"
echo "$APPROVAL_RESPONSE" | jq '.'

EXPORTER_ID=$(echo "$APPROVAL_RESPONSE" | jq -r '.data.exporterId // .data.exporter_id // empty')
echo "Exporter ID: $EXPORTER_ID"

if [ -z "$EXPORTER_ID" ] || [ "$EXPORTER_ID" = "null" ]; then
  echo "❌ Failed to get exporter ID"
  exit 1
fi

echo "✓ Application approved successfully!"
echo "Exporter ID: $EXPORTER_ID"

# Save for next steps
echo "$EXPORTER_ID" > /tmp/exporter_id.txt
echo "Saved exporter ID to /tmp/exporter_id.txt"
