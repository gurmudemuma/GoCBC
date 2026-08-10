#!/bin/bash
# Comprehensive Feature Test - Tests All Implemented Features

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
echo -e "${BOLD}${CYAN}CECBS - Complete Feature Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get tokens
ECTA_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"ectaAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
EXPORTER_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"testexporter","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
BANK_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"bankAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
CUSTOMS_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"customsAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
NBE_TOKEN=$(curl -s -X POST "$API/auth/login" -d '{"username":"nbeAdmin","password":"password123"}' -H "Content-Type: application/json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

TS=$(date +%s)

echo -e "${BOLD}Authentication${NC}"
test_result "$([[ -n "$ECTA_TOKEN" ]] && echo true || echo false)" "ECTA login"
test_result "$([[ -n "$EXPORTER_TOKEN" ]] && echo true || echo false)" "Exporter login"
test_result "$([[ -n "$BANK_TOKEN" ]] && echo true || echo false)" "Bank login"
echo ""

echo -e "${BOLD}Application Workflow${NC}"
APP=$(curl -s -X POST "$API/exporters/exporter-applications" -H "Content-Type: application/json" -d '{"companyName":"Test","tinNumber":"TIN'$TS'","businessLicenseNumber":"BL'$TS'","capitalRequirement":"5000000","professionalTaster":"yes","tasterCertificate":"C1","contactPerson":"John","email":"test'$TS'@t.com","phone":"+251911111111","address":"AA","city":"AA","exporterType":"company","laboratoryFacility":"yes"}')
APP_ID=$(echo "$APP" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
test_result "$([[ -n "$APP_ID" ]] && echo true || echo false)" "Submit application"

APPS=$(curl -s "$API/exporters/exporter-applications?status=pending" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$APPS" | grep -c "pending") -gt 0 ]] && echo true || echo false)" "List pending applications"

APPROVE=$(curl -s -X POST "$API/exporters/exporter-applications/$APP_ID/approve" -H "Authorization: Bearer $ECTA_TOKEN" -H "Content-Type: application/json" -d '{"exporterId":"EXP'$TS'","ectaLicenseNumber":"LIC'$TS'","licenseExpiryDate":"2027-12-31","bankName":"CBE","bankAccountNumber":"1000'$TS'","bankBranch":"AA","bankBranchCode":"001"}')
test_result "$([[ $(echo "$APPROVE" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Approve application"
echo ""

echo -e "${BOLD}Contract & Shipment${NC}"
CONTRACT=$(curl -s -X POST "$API/contracts" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{"contractID":"SC'$TS'","exporterID":"EXP0000001","buyerID":"B1","buyerCountry":"USA","buyerBank":"CB","exporterBank":"CBE","coffeeType":"Sidamo","quantity":1000,"pricePerKg":6.5,"currency":"USD","eudrRequired":true}')
test_result "$([[ $(echo "$CONTRACT" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Create contract"

SHIP=$(curl -s -X POST "$API/shipments" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{"shipmentID":"SHIP'$TS'","contractID":"SC'$TS'","exporterID":"EXP0000001","buyerID":"B1","origin":"Sidamo","destination":"NY","quantity":1000,"grade":"G1","icoNumber":"ICO'$TS'","channel":"SEA","forexRate":57.5,"valueUSD":6500,"eudrCompliant":true}')
test_result "$([[ $(echo "$SHIP" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Create shipment"

STATUS=$(curl -s -X POST "$API/shipments/SHIP$TS/status" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{"status":"IN_TRANSIT","location":"Red Sea"}')
test_result "$([[ $(echo "$STATUS" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Update shipment status"
echo ""

echo -e "${BOLD}Quality Control${NC}"
QC=$(curl -s -X POST "$API/quality/inspections" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{"inspectionID":"QC'$TS'","exporterID":"EXP0000001","coffeeType":"Sidamo","quantity":1000,"requestedDate":"2026-08-07"}')
test_result "$([[ $(echo "$QC" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Request quality inspection"

QC_COMPLETE=$(curl -s -X POST "$API/quality/inspections/QC$TS/complete" -H "Authorization: Bearer $ECTA_TOKEN" -H "Content-Type: application/json" -d '{"grade":"G1","cupQuality":"Excellent","moistureContent":11.5,"defectCount":2,"screenSize":15,"passed":true,"certificationNumber":"CERT'$TS'","inspectorName":"Inspector"}')
test_result "$([[ $(echo "$QC_COMPLETE" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Complete quality inspection"
echo ""

echo -e "${BOLD}Customs${NC}"
RISK=$(curl -s -X POST "$API/customs/risk-assessment" -H "Authorization: Bearer $CUSTOMS_TOKEN" -H "Content-Type: application/json" -d '{"shipmentID":"SHIP'$TS'","exporterID":"EXP0000001","riskLevel":"LOW","inspectionRequired":false}')
test_result "$([[ $(echo "$RISK" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Risk assessment"

CLEAR=$(curl -s -X POST "$API/customs/clearance" -H "Authorization: Bearer $CUSTOMS_TOKEN" -H "Content-Type: application/json" -d '{"shipmentID":"SHIP'$TS'","clearanceNumber":"CLR'$TS'","status":"cleared"}')
test_result "$([[ $(echo "$CLEAR" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Customs clearance"
echo ""

echo -e "${BOLD}Documents${NC}"
DOC=$(curl -s -X POST "$API/documents" -H "Authorization: Bearer $EXPORTER_TOKEN" -H "Content-Type: application/json" -d '{"documentID":"DOC'$TS'","shipmentID":"SHIP'$TS'","documentType":"INVOICE","fileName":"invoice.pdf","fileHash":"hash'$TS'"}')
test_result "$([[ $(echo "$DOC" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Upload document"

DOC_VERIFY=$(curl -s -X POST "$API/documents/DOC$TS/verify" -H "Authorization: Bearer $BANK_TOKEN" -H "Content-Type: application/json" -d '{"verified":true}')
test_result "$([[ $(echo "$DOC_VERIFY" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Verify document"
echo ""

echo -e "${BOLD}Payments${NC}"
PAY=$(curl -s -X POST "$API/payments" -H "Authorization: Bearer $BANK_TOKEN" -H "Content-Type: application/json" -d '{"paymentID":"PAY'$TS'","contractID":"SC'$TS'","exporterID":"EXP0000001","amount":6500,"currency":"USD","paymentMethod":"LC","paymentDate":"2026-08-07"}')
test_result "$([[ $(echo "$PAY" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Process payment"

PAY_GET=$(curl -s "$API/payments/PAY$TS" -H "Authorization: Bearer $BANK_TOKEN")
test_result "$([[ $(echo "$PAY_GET" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Get payment details"
echo ""

echo -e "${BOLD}Analytics${NC}"
DASH=$(curl -s "$API/analytics/dashboard" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$DASH" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Dashboard analytics"

EXPORTS=$(curl -s "$API/analytics/exports?period=month" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$EXPORTS" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Export statistics"

FOREX=$(curl -s "$API/analytics/forex?period=month" -H "Authorization: Bearer $NBE_TOKEN")
test_result "$([[ $(echo "$FOREX" | grep -c "success.:true") -gt 0 ]] && echo true || echo false)" "Forex statistics"
echo ""

echo -e "${BOLD}Blockchain${NC}"
BC_EXP=$(curl -s "$API/blockchain/exporters/EXP0000001" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$BC_EXP" | grep -c "EXP0000001") -gt 0 ]] && echo true || echo false)" "Query exporter on blockchain"

BC_CONTRACT=$(curl -s "$API/blockchain/contracts/SC$TS" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$BC_CONTRACT" | grep -c "SC$TS") -gt 0 ]] && echo true || echo false)" "Query contract on blockchain"

BC_SHIP=$(curl -s "$API/blockchain/shipments/SHIP$TS" -H "Authorization: Bearer $ECTA_TOKEN")
test_result "$([[ $(echo "$BC_SHIP" | grep -c "SHIP$TS") -gt 0 ]] && echo true || echo false)" "Query shipment on blockchain"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
TOTAL=$((PASSED + FAILED))
PCT=$((PASSED * 100 / TOTAL))
echo -e "${BOLD}Pass Rate: ${PCT}%${NC}"
[ $FAILED -eq 0 ] && echo -e "${GREEN}✅ All features working!${NC}" || echo -e "${RED}⚠ Some features need attention${NC}"
echo ""
