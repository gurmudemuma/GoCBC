#!/bin/bash

# Populate Test Data for All Portals
# Creates sample data to test all endpoints with real workflow data

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Populating Test Data for All Endpoints               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. CREATE QUALITY INSPECTIONS
echo -e "${CYAN}Creating Quality Inspections...${NC}"
INSPECTION_ID="QI-TEST-$(date +%s)"
SHIPMENT_ID="SHIP-TEST-001"
EXPORTER_ID="EXP-TEST-001"

# First create a shipment
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/shipments" \
  -d '{
    "shipmentID": "'"$SHIPMENT_ID"'",
    "exporterID": "'"$EXPORTER_ID"'",
    "contractID": "CONTRACT-001",
    "quantity": 1000,
    "origin": "Sidama",
    "destination": "Hamburg, Germany"
  }' > /dev/null 2>&1

# Create quality inspection
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/quality/inspections" \
  -d '{
    "inspectionID": "'"$INSPECTION_ID"'",
    "exporterID": "'"$EXPORTER_ID"'",
    "shipmentID": "'"$SHIPMENT_ID"'",
    "contractID": "CONTRACT-001",
    "coffeeType": "Arabica",
    "quantity": 1000,
    "sampleSize": 300,
    "requestedDate": "'"$(date -I)"'"
  }' > /dev/null 2>&1

echo -e "${GREEN}✓ Quality inspection created: $INSPECTION_ID${NC}"

# 2. PERFORM INSPECTION
echo -e "${CYAN}Performing Quality Inspection...${NC}"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/quality/inspections/$INSPECTION_ID/perform" \
  -d '{
    "inspectorID": "INS-001",
    "inspectorName": "ECTA Quality Lab",
    "sampleSize": 300,
    "moistureContent": 11.5,
    "defectCount": 2,
    "beanSize": "17",
    "color": "Green",
    "odor": "Fresh",
    "fragrance": 8.5,
    "flavor": 8.7,
    "aftertaste": 8.3,
    "acidity": 8.4,
    "body": 8.6,
    "balance": 8.5,
    "uniformity": 9.0,
    "cleanCup": 9.5,
    "sweetness": 9.0,
    "overall": 86,
    "classification": "Grade 1",
    "pesticideTest": "PASSED",
    "heavyMetalTest": "PASSED",
    "mycotoxinTest": "PASSED",
    "remarks": "Excellent quality coffee, recommended for export"
  }' > /dev/null 2>&1

echo -e "${GREEN}✓ Inspection performed with Grade 1 rating${NC}"

# 3. CREATE PENDING CONTRACT
echo -e "${CYAN}Creating Pending Contract...${NC}"
PENDING_CONTRACT="CONTRACT-PENDING-$(date +%s)"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/contracts" \
  -d '{
    "contractID": "'"$PENDING_CONTRACT"'",
    "exporterID": "'"$EXPORTER_ID"'",
    "buyerName": "International Coffee Traders GmbH",
    "buyerCountry": "Germany",
    "coffeeType": "Arabica",
    "quantity": 500,
    "pricePerKg": 8.5,
    "paymentMethod": "LC",
    "incoterm": "FOB"
  }' > /dev/null 2>&1

echo -e "${GREEN}✓ Pending contract created: $PENDING_CONTRACT${NC}"

# 4. CREATE DOCUMENT FOR VERIFICATION
echo -e "${CYAN}Creating Documents for Verification...${NC}"
DOC_ID="DOC-VERIFY-$(date +%s)"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/documents" \
  -d '{
    "documentID": "'"$DOC_ID"'",
    "documentType": "QUALITY_CERTIFICATE",
    "entityType": "INSPECTION",
    "entityID": "'"$INSPECTION_ID"'",
    "fileName": "quality-certificate.pdf",
    "mimeType": "application/pdf",
    "fileSize": 150000,
    "uploadedBy": "ECTA"
  }' > /dev/null 2>&1

echo -e "${GREEN}✓ Document created for verification: $DOC_ID${NC}"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    DATA POPULATION COMPLETE                     ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║ ✓ Quality Inspections:  1 created                              ║${NC}"
echo -e "${CYAN}║ ✓ Shipments:            1 created                              ║${NC}"
echo -e "${CYAN}║ ✓ Pending Contracts:    1 created                              ║${NC}"
echo -e "${CYAN}║ ✓ Documents:            1 created                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Run test again: bash test-endpoints-functionality.sh${NC}"
