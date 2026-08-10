#!/bin/bash
# CECBS Implemented Features Test
# Tests only the features that are currently implemented

API="http://localhost:3001/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASSED=0
FAILED=0

test_result() {
    if [ "$1" = "true" ]; then
        echo -e "${GREEN}✓ $2${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ $2${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo ""
echo -e "${BOLD}${CYAN}CECBS - Implemented Features Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Authentication
echo -e "${BOLD}1. Authentication${NC}"
ECTA=$(curl -s -X POST "$API/auth/login" -d '{"username":"ectaAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token"')
test_result "$([[ -n "$ECTA" ]] && echo true || echo false)" "ECTA Admin login"

ECTA_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"ectaAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
EXPORTER_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"testexporter","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
BANK_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"bankAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
NBE_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"nbeAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo ""

# Application workflow
echo -e "${BOLD}2. Exporter Application Workflow${NC}"
TS=$(date +%s)
APP=$(curl -s -X POST "$API/exporters/exporter-applications" -H "Content-Type: application/json" -d '{
  "companyName":"Test Co","tinNumber":"TIN'$TS'","businessLicenseNumber":"BL'$TS'",
  "capitalRequirement":"5000000","professionalTaster":"yes","tasterCertificate":"CERT",
  "contactPerson":"Test","email":"test'$TS'@test.com","phone":"+251911111111",
  "address":"AA","city":"Addis Ababa","exporterType":"company","laboratoryFacility":"yes"
}')
APP_ID=$(echo "$APP" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
test_result "$([[ -n "$APP_ID" ]] && echo true || echo false)" "Submit application"

APPROVE=$(curl -s -X POST "$API/exporters/exporter-applications/$APP_ID/approve" -H "Authorization: Bearer $ECTA_TOKEN" -H "Content-Type: application/json" -d '{
  "exporterId":"EXP'$TS'","ectaLicenseNumber":"LIC'$TS'","licenseExpiryDate":"2027-12-31",
  "bankName":"CBE","bankAccountNumber":"1000'$TS'","bankBranch":"AA","bankBranchCode":"001"
}')
APPROVE_OK=$(echo "$APPROVE" | grep -o '"success":true')
test_result "$([[ -n "$APPROVE_OK" ]] && echo true || echo false)" "Approve application (Blockchain)"
echo ""

# Contract workflow  
echo -e "${BOLD}3. Sales Contract Workflow${NC}"
CONTRACT=$(curl -s -X POST "$API/contracts" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{
  "contractID":"SC'$TS'","exporterID":"EXP0000001","buyerID":"BUY001","buyerCountry":"USA",
  "buyerBank":"Chase","exporterBank":"CBE","coffeeType":"Sidamo","quantity":10000,
  "pricePerKg":6.5,"currency":"USD","eudrRequired":true
}')
CONTRACT_OK=$(echo "$CONTRACT" | grep -o '"success":true')
test_result "$([[ -n "$CONTRACT_OK" ]] && echo true || echo false)" "Create contract (Blockchain)"
echo ""

# Shipment workflow
echo -e "${BOLD}4. Shipment Workflow${NC}"
SHIP=$(curl -s -X POST "$API/shipments" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{
  "shipmentID":"SHIP'$TS'","contractID":"SC'$TS'","exporterID":"EXP0000001","buyerID":"BUY001",
  "origin":"Sidamo","destination":"NY","quantity":10000,"grade":"G1","icoNumber":"ICO001",
  "channel":"SEA","forexRate":57.5,"valueUSD":65000,"eudrCompliant":true
}')
SHIP_OK=$(echo "$SHIP" | grep -o '"success":true')
test_result "$([[ -n "$SHIP_OK" ]] && echo true || echo false)" "Create shipment (Blockchain)"
echo ""

# Blockchain queries
echo -e "${BOLD}5. Blockchain Data Integrity${NC}"
BC_EXP=$(curl -s "$API/blockchain/exporters/EXP0000001" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$BC_EXP" | grep -o "EXP0000001" | wc -l) -gt 0 ]] && echo true || echo false)" "Query exporter on blockchain"

BC_CONTRACT=$(curl -s "$API/blockchain/contracts/SC$TS" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$BC_CONTRACT" | grep -o "SC$TS" | wc -l) -gt 0 ]] && echo true || echo false)" "Query contract on blockchain"
echo ""

# Analytics
echo -e "${BOLD}6. Analytics & Reporting${NC}"
ANALYTICS=$(curl -s "$API/analytics/dashboard" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ -n "$ANALYTICS" ]] && echo true || echo false)" "System analytics"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}Results: $PASSED passed, $FAILED failed${NC}"
[ $FAILED -eq 0 ] && echo -e "${GREEN}✅ All implemented features working!${NC}" || echo -e "${RED}⚠ Some tests failed${NC}"
echo ""
