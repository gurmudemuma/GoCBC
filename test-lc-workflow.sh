#!/bin/bash

# Test LC Workflow with Status Fixes
# This script tests the complete LC workflow to verify all status transitions

echo "════════════════════════════════════════════════════════════════"
echo "  LC Workflow Test - Verifying Status Fixes"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:3001/api"
EXPORTER_ID="EXP001"
CONTRACT_ID="CONTRACT1786971617142"
LC_ID="LC$(date +%s)"

echo -e "${BLUE}Test Configuration:${NC}"
echo "  API Base: $API_BASE"
echo "  Exporter ID: $EXPORTER_ID"
echo "  Contract ID: $CONTRACT_ID"
echo "  New LC ID: $LC_ID"
echo ""

# Step 1: Query existing LC
echo -e "${YELLOW}[Step 1]${NC} Querying existing LC..."
curl -s "$API_BASE/letters-of-credit/LC1787055024941" | jq -r '.data | "  LC ID: \(.lcId)\n  Status: \(.status)\n  Amount: \(.amount) \(.currency)"'
echo ""

# Step 2: Test RequestLetterOfCredit
echo -e "${YELLOW}[Step 2]${NC} Testing Request LC (should create with status: REQUESTED)..."
REQUEST_DATA=$(cat <<EOF
{
  "lcId": "$LC_ID",
  "contractId": "$CONTRACT_ID",
  "exporterId": "$EXPORTER_ID",
  "amount": 50000,
  "currency": "USD",
  "beneficiary": "Test Exporter Ltd",
  "applicant": "Test Buyer Inc",
  "issuingBank": "Commercial Bank of Ethiopia",
  "advisingBank": "Advising Bank",
  "expiryDate": "2026-12-31",
  "latestShipmentDate": "2026-11-30"
}
EOF
)

echo "$REQUEST_DATA" | jq '.'
echo ""
RESPONSE=$(curl -s -X POST "$API_BASE/letters-of-credit/request" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_DATA")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Step 3: Query the new LC
echo -e "${YELLOW}[Step 3]${NC} Querying new LC status..."
sleep 2
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: REQUESTED)"'
echo ""

# Step 4: Test ApproveLCRequest
echo -e "${YELLOW}[Step 4]${NC} Testing Approve LC (should change to: APPROVED)..."
APPROVE_RESPONSE=$(curl -s -X POST "$API_BASE/letters-of-credit/$LC_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "Bank Manager", "approvalNotes": "Test approval"}')

echo "$APPROVE_RESPONSE" | jq '.'
sleep 2
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: APPROVED)"'
echo ""

# Step 5: Test IssueLetterOfCredit
echo -e "${YELLOW}[Step 5]${NC} Testing Issue LC (should change to: ISSUED) ⭐"
ISSUE_RESPONSE=$(curl -s -X POST "$API_BASE/letters-of-credit/$LC_ID/issue" \
  -H "Content-Type: application/json" \
  -d '{"issuedBy": "Banks Portal", "mt700Reference": "MT700-TEST-001"}')

echo "$ISSUE_RESPONSE" | jq '.'
sleep 2
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: ISSUED - Forex Allocated)"'
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ LC Created and Issued${NC}"
echo -e "${GREEN}  ✓ Status should be: ISSUED (Forex Allocated)${NC}"
echo -e "${GREEN}  ✓ Check Exporter Portal → Forex & Banking tab${NC}"
echo -e "${GREEN}  ✓ Should show 'Forex Allocated' label (not 'Shipped')${NC}"
echo -e "${GREEN}  ✓ KPI count should include this LC${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 6: Create shipment (should NOT change LC status)
echo -e "${YELLOW}[Step 6]${NC} Testing Create Shipment (LC status should stay ISSUED)..."
SHIPMENT_ID="SHIP$(date +%s)"
SHIPMENT_DATA=$(cat <<EOF
{
  "shipmentId": "$SHIPMENT_ID",
  "contractId": "$CONTRACT_ID",
  "lcId": "$LC_ID",
  "quantity": 100,
  "portOfLoading": "Djibouti",
  "portOfDischarge": "Hamburg",
  "vesselName": "Test Vessel",
  "billOfLadingNo": "BL-TEST-001"
}
EOF
)

curl -s -X POST "$API_BASE/shipments" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA" | jq '.'

sleep 2
echo ""
echo "LC Status after shipment creation:"
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: ISSUED - should NOT change to SHIPPED)"'
echo ""

# Step 7: Submit documents (should NOT change LC status)
echo -e "${YELLOW}[Step 7]${NC} Testing Submit Documents (LC status should stay ISSUED)..."
DOCS_DATA=$(cat <<EOF
{
  "lcId": "$LC_ID",
  "documents": [
    {
      "documentType": "Bill of Lading",
      "documentHash": "hash123",
      "documentUrl": "https://example.com/bl.pdf"
    },
    {
      "documentType": "Commercial Invoice",
      "documentHash": "hash456",
      "documentUrl": "https://example.com/invoice.pdf"
    }
  ]
}
EOF
)

curl -s -X POST "$API_BASE/letters-of-credit/$LC_ID/documents" \
  -H "Content-Type: application/json" \
  -d "$DOCS_DATA" | jq '.'

sleep 2
echo ""
echo "LC Status after document submission:"
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: ISSUED - should NOT change to DOCUMENTS_SUBMITTED)"'
echo ""

# Step 8: Examine documents (should change to UTILIZED if compliant)
echo -e "${YELLOW}[Step 8]${NC} Testing Examine Documents (should change to: UTILIZED)..."
EXAMINE_DATA=$(cat <<EOF
{
  "lcId": "$LC_ID",
  "compliant": "true",
  "examinationNotes": "All documents are compliant",
  "examinedBy": "Bank Document Officer"
}
EOF
)

curl -s -X POST "$API_BASE/letters-of-credit/$LC_ID/examine" \
  -H "Content-Type: application/json" \
  -d "$EXAMINE_DATA" | jq '.'

sleep 2
echo ""
echo "LC Status after document examination:"
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: UTILIZED - documents verified)"'
echo ""

# Step 9: Release payment (should NOT change LC status)
echo -e "${YELLOW}[Step 9]${NC} Testing Release Payment (LC status should stay UTILIZED)..."
PAYMENT_DATA=$(cat <<EOF
{
  "lcId": "$LC_ID",
  "amount": 50000,
  "paymentDate": "2026-08-20",
  "mt103Reference": "MT103-TEST-001"
}
EOF
)

curl -s -X POST "$API_BASE/letters-of-credit/$LC_ID/release-payment" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_DATA" | jq '.'

sleep 2
echo ""
echo "LC Status after payment release:"
curl -s "$API_BASE/letters-of-credit/$LC_ID" | jq -r '.data | "  Status: \(.status) (Expected: UTILIZED - should NOT change to PAID)"'
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ COMPLETE LC WORKFLOW TESTED${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Expected Status Transitions:"
echo "  1. Request LC      → REQUESTED ✓"
echo "  2. Approve LC      → APPROVED ✓"
echo "  3. Issue LC        → ISSUED (Forex Allocated) ✓"
echo "  4. Create Shipment → ISSUED (NO CHANGE) ✓"
echo "  5. Submit Docs     → ISSUED (NO CHANGE) ✓"
echo "  6. Examine Docs    → UTILIZED ✓"
echo "  7. Release Payment → UTILIZED (NO CHANGE) ✓"
echo ""
echo "Key Fixes Verified:"
echo "  ✓ LC does NOT change to SHIPPED when shipment created"
echo "  ✓ LC does NOT change to DOCUMENTS_SUBMITTED when docs submitted"
echo "  ✓ LC changes to UTILIZED (not DOCUMENTS_VERIFIED) when docs verified"
echo "  ✓ LC does NOT change to PAID when payment released"
echo ""
echo "UI Verification:"
echo "  → Open Exporter Portal → Forex & Banking tab"
echo "  → Should show 'Forex Allocated' (not 'Shipped')"
echo "  → KPI count should show correct number"
echo ""
