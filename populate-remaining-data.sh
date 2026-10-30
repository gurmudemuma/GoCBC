#!/bin/bash

# Populate Remaining Test Data - Focus on Missing Endpoints

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}Populating Remaining Test Data...${NC}"
echo ""

# 1. Create a PENDING contract (don't approve it)
echo -e "${CYAN}Creating PENDING contract...${NC}"
PENDING_ID="CONTRACT-PENDING-$(date +%s)"

# Use existing exporter from database
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/contracts" \
  -d '{
    "contractID": "'"$PENDING_ID"'",
    "exporterID": "EXP-001",
    "buyerName": "German Coffee Importers",
    "buyerCountry": "Germany",
    "coffeeType": "Arabica",
    "quantity": 500,
    "pricePerKg": 8.75,
    "paymentMethod": "LC",
    "incoterm": "FOB",
    "shipmentDeadline": "2027-03-31"
  }' > /tmp/pending-contract.json 2>&1

if grep -q "success.*true" /tmp/pending-contract.json; then
    echo -e "${GREEN}✓ Pending contract created: $PENDING_ID${NC}"
else
    echo -e "${YELLOW}⚠ Pending contract creation had issues${NC}"
    cat /tmp/pending-contract.json | jq '.' 2>/dev/null || cat /tmp/pending-contract.json
fi

# 2. Create shipment using existing contract
echo -e "${CYAN}Creating shipment...${NC}"
SHIP_ID="SHIP-$(date +%s)"

# Get an existing approved contract
EXISTING_CONTRACT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/contracts?status=APPROVED" | jq -r '.data[0].contract_id // .data[0].contractId // "CONTRACT-001"')

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/shipments" \
  -d '{
    "shipmentID": "'"$SHIP_ID"'",
    "contractID": "'"$EXISTING_CONTRACT"'",
    "exporterID": "EXP-001",
    "quantity": 500,
    "loadingPort": "Djibouti",
    "destination": "Hamburg",
    "vesselName": "Coffee Express",
    "estimatedDeparture": "2027-02-15"
  }' > /tmp/shipment.json 2>&1

if grep -q "success.*true" /tmp/shipment.json; then
    echo -e "${GREEN}✓ Shipment created: $SHIP_ID${NC}"
else
    echo -e "${YELLOW}⚠ Shipment creation had issues${NC}"
    cat /tmp/shipment.json | jq '.' 2>/dev/null || cat /tmp/shipment.json
fi

# 3. Create document pending verification
echo -e "${CYAN}Creating document for verification...${NC}"
DOC_ID="DOC-VERIFY-$(date +%s)"

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/documents" \
  -d '{
    "documentID": "'"$DOC_ID"'",
    "documentType": "COMMERCIAL_INVOICE",
    "entityType": "CONTRACT",
    "entityID": "'"$EXISTING_CONTRACT"'",
    "fileName": "commercial-invoice.pdf",
    "mimeType": "application/pdf",
    "fileSize": 125000,
    "uploadedBy": "EXP-001",
    "status": "pending_verification"
  }' > /tmp/document.json 2>&1

if grep -q "success.*true" /tmp/document.json; then
    echo -e "${GREEN}✓ Document created: $DOC_ID${NC}"
else
    echo -e "${YELLOW}⚠ Document creation had issues${NC}"
    cat /tmp/document.json | jq '.' 2>/dev/null || cat /tmp/document.json
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Data population completed!${NC}"
echo -e "${CYAN}Run test again: bash test-endpoints-functionality.sh${NC}"
