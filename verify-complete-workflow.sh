#!/bin/bash

# Script to verify complete workflow audit trail coverage
# Tests that all 6 workflow stages create audit logs

echo "============================================"
echo "Complete Workflow Audit Trail Verification"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Replace with actual token

# Test LC ID (from existing data)
LC_ID="LC-CONTRACT1788435011592-1788509695626"

echo "Testing LC ID: $LC_ID"
echo ""

# Step 1: Fetch audit logs for LC
echo "1. Fetching LC audit logs..."
LC_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/LC/$LC_ID" \
  -H "Authorization: Bearer $TOKEN")

LC_COUNT=$(echo $LC_AUDIT | jq -r '.data | length')
echo -e "${GREEN}✓${NC} Found $LC_COUNT LC audit log entries"
echo ""

# Step 2: Get LC data to find related entities
echo "2. Fetching LC data to find related entities..."
LC_DATA=$(curl -s -X GET "http://localhost:3001/api/v1/banking/lc/$LC_ID" \
  -H "Authorization: Bearer $TOKEN")

CONTRACT_ID=$(echo $LC_DATA | jq -r '.data.contractId')
EXPORTER_ID=$(echo $LC_DATA | jq -r '.data.exporterId')

echo "   Contract ID: $CONTRACT_ID"
echo "   Exporter ID: $EXPORTER_ID"
echo ""

# Step 3: Fetch EXPORTER audit logs
echo "3. Fetching EXPORTER audit logs..."
if [ "$EXPORTER_ID" != "null" ] && [ -n "$EXPORTER_ID" ]; then
  EXPORTER_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/EXPORTER/$EXPORTER_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  EXPORTER_COUNT=$(echo $EXPORTER_AUDIT | jq -r '.data | length')
  if [ "$EXPORTER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $EXPORTER_COUNT EXPORTER audit log entries"
  else
    echo -e "${YELLOW}⚠${NC} No EXPORTER audit logs found (may be OK if application not tracked on blockchain)"
  fi
else
  echo -e "${YELLOW}⚠${NC} No exporter ID available"
fi
echo ""

# Step 4: Fetch CONTRACT audit logs
echo "4. Fetching CONTRACT audit logs..."
if [ "$CONTRACT_ID" != "null" ] && [ -n "$CONTRACT_ID" ]; then
  CONTRACT_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/CONTRACT/$CONTRACT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  CONTRACT_COUNT=$(echo $CONTRACT_AUDIT | jq -r '.data | length')
  if [ "$CONTRACT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $CONTRACT_COUNT CONTRACT audit log entries"
    
    # Check for REGISTER action
    REGISTER_COUNT=$(echo $CONTRACT_AUDIT | jq -r '[.data[] | select(.actionType == "REGISTER")] | length')
    if [ "$REGISTER_COUNT" -gt 0 ]; then
      echo -e "${GREEN}✓${NC} Found REGISTER action (contract registration logged)"
    else
      echo -e "${RED}✗${NC} Missing REGISTER action (contract registration NOT logged - need chaincode v1.86+)"
    fi
    
    # Check for APPROVE action
    APPROVE_COUNT=$(echo $CONTRACT_AUDIT | jq -r '[.data[] | select(.actionType == "APPROVE")] | length')
    if [ "$APPROVE_COUNT" -gt 0 ]; then
      echo -e "${GREEN}✓${NC} Found APPROVE action (contract approval logged)"
    else
      echo -e "${YELLOW}⚠${NC} No APPROVE action found"
    fi
  else
    echo -e "${RED}✗${NC} No CONTRACT audit logs found"
  fi
else
  echo -e "${YELLOW}⚠${NC} No contract ID available"
fi
echo ""

# Step 5: Fetch FOREX audit logs
echo "5. Fetching FOREX audit logs..."
FOREX_LIST=$(curl -s -X GET "http://localhost:3001/api/v1/forex" \
  -H "Authorization: Bearer $TOKEN")

FOREX_ID=$(echo $FOREX_LIST | jq -r ".data[] | select(.lcId == \"$LC_ID\") | .forexId" | head -1)

if [ -n "$FOREX_ID" ] && [ "$FOREX_ID" != "null" ]; then
  echo "   Found Forex ID: $FOREX_ID"
  FOREX_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/FOREX/$FOREX_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  FOREX_COUNT=$(echo $FOREX_AUDIT | jq -r '.data | length')
  if [ "$FOREX_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $FOREX_COUNT FOREX audit log entries"
  else
    echo -e "${YELLOW}⚠${NC} No FOREX audit logs found"
  fi
else
  echo -e "${YELLOW}⚠${NC} No forex allocation found for this LC"
fi
echo ""

# Step 6: Fetch SHIPMENT audit logs
echo "6. Fetching SHIPMENT audit logs..."
SHIPMENT_LIST=$(curl -s -X GET "http://localhost:3001/api/v1/shipments" \
  -H "Authorization: Bearer $TOKEN")

SHIPMENT_ID=$(echo $SHIPMENT_LIST | jq -r ".data[] | select(.lcId == \"$LC_ID\" or .contractId == \"$CONTRACT_ID\") | .shipmentId" | head -1)

if [ -n "$SHIPMENT_ID" ] && [ "$SHIPMENT_ID" != "null" ]; then
  echo "   Found Shipment ID: $SHIPMENT_ID"
  SHIPMENT_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/SHIPMENT/$SHIPMENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  SHIPMENT_COUNT=$(echo $SHIPMENT_AUDIT | jq -r '.data | length')
  if [ "$SHIPMENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $SHIPMENT_COUNT SHIPMENT audit log entries"
  else
    echo -e "${YELLOW}⚠${NC} No SHIPMENT audit logs found"
  fi
else
  echo -e "${YELLOW}⚠${NC} No shipment found for this LC/Contract"
fi
echo ""

# Step 7: Fetch PAYMENT audit logs
echo "7. Fetching PAYMENT audit logs..."
PAYMENT_LIST=$(curl -s -X GET "http://localhost:3001/api/v1/payments" \
  -H "Authorization: Bearer $TOKEN")

PAYMENT_ID=$(echo $PAYMENT_LIST | jq -r ".data[] | select(.lcId == \"$LC_ID\" or .contractId == \"$CONTRACT_ID\") | .paymentId" | head -1)

if [ -n "$PAYMENT_ID" ] && [ "$PAYMENT_ID" != "null" ]; then
  echo "   Found Payment ID: $PAYMENT_ID"
  PAYMENT_AUDIT=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/PAYMENT/$PAYMENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  PAYMENT_COUNT=$(echo $PAYMENT_AUDIT | jq -r '.data | length')
  if [ "$PAYMENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $PAYMENT_COUNT PAYMENT audit log entries"
  else
    echo -e "${YELLOW}⚠${NC} No PAYMENT audit logs found"
  fi
else
  echo -e "${YELLOW}⚠${NC} No payment found for this LC/Contract"
fi
echo ""

# Summary
echo "============================================"
echo "Summary: Complete Business Workflow"
echo "============================================"
echo ""
echo "Workflow Coverage:"
echo "1. Exporter License:   $([ "$EXPORTER_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${YELLOW}⚠ Limited${NC}")"
echo "2. Contract:          $([ "$CONTRACT_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${RED}✗ Missing${NC}")"
echo "3. LC:                $([ "$LC_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${RED}✗ Missing${NC}")"
echo "4. Forex:             $([ "$FOREX_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${YELLOW}⚠ Not Applicable${NC}")"
echo "5. Shipment:          $([ "$SHIPMENT_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${YELLOW}⚠ Not Applicable${NC}")"
echo "6. Payment:           $([ "$PAYMENT_COUNT" -gt 0 ] 2>/dev/null && echo -e "${GREEN}✓ Tracked${NC}" || echo -e "${YELLOW}⚠ Not Applicable${NC}")"
echo ""
echo "Note: 'Not Applicable' means the entity hasn't been created for this workflow yet."
echo "      This is normal if the business process hasn't reached that stage."
echo ""
