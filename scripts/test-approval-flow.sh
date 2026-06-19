#!/bin/bash

# Test Exporter Approval Flow - End to End
# Tests: Database → Blockchain → Query

echo "🧪 Testing Exporter Approval Flow"
echo "=================================="
echo ""

API_URL="http://localhost:3001/api/v1"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login as ECTA admin
echo "1️⃣ Logging in as ECTA admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ecta_admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo ""

# Step 2: Check pending applications
echo "2️⃣ Checking pending applications..."
PENDING_APPS=$(curl -s -X GET "$API_URL/exporters/exporter-applications?status=pending" \
  -H "Authorization: Bearer $TOKEN")

PENDING_COUNT=$(echo $PENDING_APPS | jq '.data | length')
echo -e "${GREEN}✅ Found $PENDING_COUNT pending applications${NC}"

if [ "$PENDING_COUNT" == "0" ]; then
  echo -e "${YELLOW}⚠️  No pending applications to approve${NC}"
  echo "You can submit a test application at: http://localhost:3000/register-exporter"
  exit 0
fi

# Get first application
APP_ID=$(echo $PENDING_APPS | jq -r '.data[0].application_id')
COMPANY_NAME=$(echo $PENDING_APPS | jq -r '.data[0].company_name')

echo "📋 Application to approve:"
echo "  ID: $APP_ID"
echo "  Company: $COMPANY_NAME"
echo ""

# Step 3: Approve application (this registers to blockchain)
echo "3️⃣ Approving application (registering to blockchain)..."

EXPORTER_ID="EXP$(date +%s | tail -c 8)"
LICENSE_NUM="ECTA-LIC-2026-$(shuf -i 100-999 -n 1)"
EXPIRY_DATE=$(date -d "+1 year" +%Y-%m-%d)

APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/exporters/exporter-applications/$APP_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"exporterId\": \"$EXPORTER_ID\",
    \"ectaLicenseNumber\": \"$LICENSE_NUM\",
    \"licenseExpiryDate\": \"$EXPIRY_DATE\"
  }")

SUCCESS=$(echo $APPROVE_RESPONSE | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Approval failed${NC}"
  echo "Response: $APPROVE_RESPONSE"
  echo ""
  echo "Possible reasons:"
  echo "  1. Blockchain network not running (check: docker ps)"
  echo "  2. Chaincode not deployed"
  echo "  3. Fabric connection issue"
  exit 1
fi

TX_ID=$(echo $APPROVE_RESPONSE | jq -r '.data.txId')
echo -e "${GREEN}✅ Approval successful${NC}"
echo "  Exporter ID: $EXPORTER_ID"
echo "  License: $LICENSE_NUM"
echo "  Transaction ID: $TX_ID"
echo ""

# Step 4: Query blockchain to verify
echo "4️⃣ Querying blockchain to verify registration..."
sleep 2  # Wait for blockchain to process

BLOCKCHAIN_EXPORTERS=$(curl -s -X GET "$API_URL/exporters" \
  -H "Authorization: Bearer $TOKEN")

BLOCKCHAIN_COUNT=$(echo $BLOCKCHAIN_EXPORTERS | jq '.data | length')
echo -e "${GREEN}✅ Query successful: $BLOCKCHAIN_COUNT exporters on blockchain${NC}"

# Check if our new exporter is there
NEW_EXPORTER=$(echo $BLOCKCHAIN_EXPORTERS | jq ".data[] | select(.exporterId == \"$EXPORTER_ID\")")

if [ -z "$NEW_EXPORTER" ]; then
  echo -e "${RED}❌ New exporter not found on blockchain${NC}"
  echo "This indicates a sync issue between database and blockchain"
else
  echo -e "${GREEN}✅ New exporter found on blockchain${NC}"
  echo ""
  echo "📋 Exporter Details:"
  echo $NEW_EXPORTER | jq '.'
fi

echo ""

# Step 5: Compare database vs blockchain
echo "5️⃣ Comparing database vs blockchain..."
DB_APPROVED=$(curl -s -X GET "$API_URL/exporters/exporter-applications?status=approved" \
  -H "Authorization: Bearer $TOKEN")

DB_COUNT=$(echo $DB_APPROVED | jq '.data | length')

echo "  Database (approved): $DB_COUNT"
echo "  Blockchain: $BLOCKCHAIN_COUNT"

if [ "$DB_COUNT" == "$BLOCKCHAIN_COUNT" ]; then
  echo -e "${GREEN}✅ Data is in sync${NC}"
else
  echo -e "${YELLOW}⚠️  Data sync issue detected${NC}"
  echo "  This means some approved applications didn't register to blockchain"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Test Complete!${NC}"
echo "=================================="
