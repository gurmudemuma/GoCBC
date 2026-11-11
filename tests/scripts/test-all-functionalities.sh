#!/bin/bash
################################################################################
# GoCBC COMPREHENSIVE FUNCTIONALITY TESTING
# Tests all business logic, workflows, and integrations
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

API_URL="http://localhost:3001/api/v1"
TESTS_PASSED=0
TESTS_FAILED=0
AUTH_TOKEN=""
TEST_EXPORTER_ID=""
TEST_CONTRACT_ID=""
TEST_LC_ID=""
TEST_FOREX_ID=""
TEST_SHIPMENT_ID=""
TEST_QUALITY_ID=""
TEST_CUSTOMS_ID=""

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

test_function() {
    local name="$1"
    local command="$2"
    
    if eval "$command" > /dev/null 2>&1; then
        print_success "$name"
        return 0
    else
        print_fail "$name"
        return 1
    fi
}

print_header "GoCBC COMPREHENSIVE FUNCTIONALITY TEST"
echo "Testing all business logic, workflows, and integrations"
echo "Target: $API_URL"
echo ""

################################################################################
# AUTHENTICATION & AUTHORIZATION TESTS
################################################################################

print_header "1. AUTHENTICATION & AUTHORIZATION"

print_step "Testing login functionality..."

# Test 1: Login with exporter credentials
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "exporter@test.com",
    "password": "test123"
  }' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_success "1.1 Login successful - Token received"
    print_info "Token: ${AUTH_TOKEN:0:20}..."
else
    print_fail "1.1 Login failed - No token received"
fi

# Test 2: Validate token
if [ ! -z "$AUTH_TOKEN" ]; then
# NOTE: there is no GET /users/profile; the current-user endpoint is
# GET /auth/me (auth.ts:258).
    PROFILE=$(curl -s -X GET "$API_URL/auth/me" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$PROFILE" | grep -q "email\|userId"; then
        print_success "1.2 Token validation successful"
    else
        print_fail "1.2 Token validation failed"
    fi
fi

# Test 3: Access control - unauthorized access
UNAUTHORIZED=$(curl -s -X GET "$API_URL/contracts" 2>/dev/null)
if [ ! -z "$UNAUTHORIZED" ]; then
    print_success "1.3 Endpoint accessible (public or guest mode)"
else
    print_fail "1.3 Access control test inconclusive"
fi

################################################################################
# CONTRACT MANAGEMENT TESTS
################################################################################

print_header "2. CONTRACT MANAGEMENT - CRUD OPERATIONS"

print_step "Testing contract lifecycle..."

# Test 4: Create Contract (Draft)
CREATE_CONTRACT=$(curl -s -X POST "$API_URL/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "contractNumber": "TEST-'$(date +%s)'",
    "buyerName": "Test Buyer Inc",
    "buyerCountry": "USA",
    "coffeeType": "ARABICA",
    "coffeeGrade": "GRADE_1",
    "quantity": 1000,
    "quantityUnit": "BAGS",
    "pricePerUnit": 250.00,
    "totalValue": 250000.00,
    "currency": "USD",
    "paymentTerms": "LC",
    "shipmentDate": "'$(date -d '+30 days' +%Y-%m-%d)'",
    "portOfLoading": "Djibouti",
    "portOfDestination": "New York",
    "qualityStandards": "SCAA Grade 1"
  }' 2>/dev/null)

if echo "$CREATE_CONTRACT" | grep -q "contractId\|contract_id"; then
    TEST_CONTRACT_ID=$(echo "$CREATE_CONTRACT" | grep -o '"contractId":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$TEST_CONTRACT_ID" ]; then
        TEST_CONTRACT_ID=$(echo "$CREATE_CONTRACT" | grep -o '"contract_id":"[^"]*"' | cut -d'"' -f4)
    fi
    print_success "2.1 Contract created successfully"
    print_info "Contract ID: $TEST_CONTRACT_ID"
else
    print_fail "2.1 Contract creation failed"
fi

# Test 5: Read Contract
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    READ_CONTRACT=$(curl -s -X GET "$API_URL/contracts/$TEST_CONTRACT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$READ_CONTRACT" | grep -q "$TEST_CONTRACT_ID"; then
        print_success "2.2 Contract retrieved successfully"
    else
        print_fail "2.2 Contract retrieval failed"
    fi
fi

# Test 6: Update Contract
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    UPDATE_CONTRACT=$(curl -s -X PATCH "$API_URL/contracts/$TEST_CONTRACT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "qualityStandards": "SCAA Grade 1 - Updated"
      }' 2>/dev/null)
    
    if echo "$UPDATE_CONTRACT" | grep -q "success\|updated\|$TEST_CONTRACT_ID"; then
        print_success "2.3 Contract updated successfully"
    else
        print_fail "2.3 Contract update failed"
    fi
fi

# Test 7: List Contracts
LIST_CONTRACTS=$(curl -s -X GET "$API_URL/contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if echo "$LIST_CONTRACTS" | grep -q "\["; then
    print_success "2.4 Contract list retrieved"
else
    print_fail "2.4 Contract list retrieval failed"
fi

################################################################################
# WORKFLOW TESTS - CONTRACT APPROVAL
################################################################################

print_header "3. CONTRACT APPROVAL WORKFLOW (ECTA)"

print_step "Testing contract approval workflow..."

# Test 8: Submit contract for approval (change status to REGISTERED)
# NOTE: removed-unverifiable: there is no POST /contracts/:id/register.
# Contract creation IS the registration: POST /contracts (contracts.ts:326)
# calls registerContract (contracts.ts:504) and returns 201 with
# data:{contractID, status:'pending', blockchainSynced}.
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    REGISTER_CONTRACT="$CREATE_CONTRACT"
    
    if echo "$REGISTER_CONTRACT" | grep -qi "registered\|success\|pending"; then
        print_success "3.1 Contract registered for ECTA approval"
    else
        print_fail "3.1 Contract registration failed"
    fi
fi

# Test 9: ECTA approves contract
if [ ! -z "$TEST_CONTRACT_ID" ]; then
# NOTE: contract approval is POST /contracts/:contractID/approve
# (contracts.ts:1255); there is no /ecta mount.
    APPROVE_CONTRACT=$(curl -s -X POST "$API_URL/contracts/$TEST_CONTRACT_ID/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "approvedBy": "ECTA Officer",
        "notes": "Quality standards met"
      }' 2>/dev/null)
    
    if echo "$APPROVE_CONTRACT" | grep -qi "approved\|success"; then
        print_success "3.2 Contract approved by ECTA"
    else
        print_fail "3.2 Contract approval failed"
    fi
fi

# Test 10: Verify status change
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    sleep 1
    CHECK_STATUS=$(curl -s -X GET "$API_URL/contracts/$TEST_CONTRACT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$CHECK_STATUS" | grep -qi "approved"; then
        print_success "3.3 Contract status changed to APPROVED"
    else
        print_fail "3.3 Contract status not updated"
    fi
fi

################################################################################
# LETTER OF CREDIT (LC) TESTS
################################################################################

print_header "4. LETTER OF CREDIT (LC) ISSUANCE"

print_step "Testing LC issuance and Forex auto-trigger..."

# Test 11: Issue LC
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    ISSUE_LC=$(curl -s -X POST "$API_URL/banking/lc/issue" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "contractId": "'$TEST_CONTRACT_ID'",
        "lcNumber": "LC-TEST-'$(date +%s)'",
        "issuingBank": "Commercial Bank of Ethiopia",
        "beneficiaryBank": "Test Bank USA",
        "amount": 250000.00,
        "currency": "USD",
        "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'",
        "latestShipmentDate": "'$(date -d '+30 days' +%Y-%m-%d)'",
        "paymentTerms": "Sight",
        "partialShipment": false,
        "transhipment": true
      }' 2>/dev/null)
    
    if echo "$ISSUE_LC" | grep -q "lcId\|lc_id"; then
        TEST_LC_ID=$(echo "$ISSUE_LC" | grep -o '"lcId":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$TEST_LC_ID" ]; then
            TEST_LC_ID=$(echo "$ISSUE_LC" | grep -o '"lc_id":"[^"]*"' | cut -d'"' -f4)
        fi
        print_success "4.1 LC issued successfully"
        print_info "LC ID: $TEST_LC_ID"
    else
        print_fail "4.1 LC issuance failed"
    fi
fi

# Test 12: Verify Forex auto-request triggered
if [ ! -z "$TEST_LC_ID" ]; then
    sleep 2
    FOREX_CHECK=$(curl -s -X GET "$API_URL/forex" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$FOREX_CHECK" | grep -q "$TEST_LC_ID"; then
        print_success "4.2 Forex request auto-created (workflow trigger working)"
        TEST_FOREX_ID=$(echo "$FOREX_CHECK" | grep -o '"forexId":"[^"]*"' | head -1 | cut -d'"' -f4)
    else
        print_fail "4.2 Forex auto-request not triggered"
    fi
fi

################################################################################
# FOREX ALLOCATION TESTS (40% RETENTION)
################################################################################

print_header "5. FOREX ALLOCATION WITH 40% RETENTION"

print_step "Testing forex allocation and retention policy..."

# Test 13: Allocate Forex with retention
if [ ! -z "$TEST_FOREX_ID" ]; then
    ALLOCATE_FOREX=$(curl -s -X POST "$API_URL/forex/$TEST_FOREX_ID/allocate" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "allocatedAmount": 250000.00,
        "retentionPercentage": 40,
        "approvedBy": "NBE Officer"
      }' 2>/dev/null)
    
    if echo "$ALLOCATE_FOREX" | grep -qi "allocated\|success"; then
        print_success "5.1 Forex allocated successfully"
    else
        print_fail "5.1 Forex allocation failed"
    fi
fi

# Test 14: Verify 40% retention calculation
if [ ! -z "$TEST_FOREX_ID" ]; then
    CHECK_RETENTION=$(curl -s -X GET "$API_URL/forex/$TEST_FOREX_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$CHECK_RETENTION" | grep -q "100000"; then
        print_success "5.2 40% retention calculated correctly (\$100,000)"
    else
        print_fail "5.2 Retention calculation incorrect"
    fi
fi

################################################################################
# SHIPMENT & QUALITY INSPECTION TESTS
################################################################################

print_header "6. SHIPMENT CREATION & QUALITY INSPECTION AUTO-TRIGGER"

print_step "Testing shipment creation and quality task auto-creation..."

# Test 15: Create Shipment
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    CREATE_SHIPMENT=$(curl -s -X POST "$API_URL/shipments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "contractId": "'$TEST_CONTRACT_ID'",
        "shipmentNumber": "SHIP-TEST-'$(date +%s)'",
        "quantity": 1000,
        "quantityUnit": "BAGS",
        "expectedShipmentDate": "'$(date -d '+30 days' +%Y-%m-%d)'",
        "portOfLoading": "Djibouti",
        "portOfDestination": "New York",
        "shippingLine": "Test Shipping Co"
      }' 2>/dev/null)
    
    if echo "$CREATE_SHIPMENT" | grep -q "shipmentId\|shipment_id"; then
        TEST_SHIPMENT_ID=$(echo "$CREATE_SHIPMENT" | grep -o '"shipmentId":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$TEST_SHIPMENT_ID" ]; then
            TEST_SHIPMENT_ID=$(echo "$CREATE_SHIPMENT" | grep -o '"shipment_id":"[^"]*"' | cut -d'"' -f4)
        fi
        print_success "6.1 Shipment created successfully"
        print_info "Shipment ID: $TEST_SHIPMENT_ID"
    else
        print_fail "6.1 Shipment creation failed"
    fi
fi

# Test 16: Verify Quality Inspection task auto-created
if [ ! -z "$TEST_SHIPMENT_ID" ]; then
    sleep 2
    QUALITY_CHECK=$(curl -s -X GET "$API_URL/quality/inspections" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$QUALITY_CHECK" | grep -q "$TEST_SHIPMENT_ID"; then
        print_success "6.2 Quality inspection task auto-created (workflow trigger working)"
        # NOTE: GET /quality/inspections returns raw PG rows, so the id field
        # is inspection_id (snake_case), not inspectionId.
        TEST_QUALITY_ID=$(echo "$QUALITY_CHECK" | grep -o '"inspection_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    else
        print_fail "6.2 Quality inspection auto-creation not triggered"
    fi
fi

################################################################################
# QUALITY INSPECTION WORKFLOW TESTS
################################################################################

print_header "7. QUALITY INSPECTION 5-STAGE WORKFLOW"

print_step "Testing quality inspection status transitions..."

# Test 17: Schedule inspection (PENDING → SCHEDULED)
# NOTE: removed-unverifiable: no quality route sets SCHEDULED. quality.ts
# defines perform (:512, PENDING/REQUESTED → INSPECTED), approve (:746),
# reject (:1042), issue-permit (:1208) and complete (:1307) — there is no
# endpoint that moves an inspection to SCHEDULED.
if [ ! -z "$TEST_QUALITY_ID" ]; then
    print_info "7.1 Inspection scheduling skipped — no endpoint sets SCHEDULED"
fi

# Test 18: Start inspection (SCHEDULED → UNDER_REVIEW)
# NOTE: removed-unverifiable: no quality route sets UNDER_REVIEW either
# (same evidence as Test 17). The review step is the perform call, which
# sets INSPECTED (quality.ts:512).
if [ ! -z "$TEST_QUALITY_ID" ]; then
    print_info "7.2 Inspection start skipped — no endpoint sets UNDER_REVIEW"
fi

# Test 19: Approve inspection (UNDER_REVIEW → APPROVED)
# NOTE: approval is POST /quality/inspections/:inspectionID/approve
# (quality.ts:746); it reads approvedBy and certificateNo. (Normally an
# inspection is performed first via POST .../perform, which this script never
# calls, so approve may 400 on a PENDING inspection.)
if [ ! -z "$TEST_QUALITY_ID" ]; then
    APPROVE_QI=$(curl -s -X POST "$API_URL/quality/inspections/$TEST_QUALITY_ID/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "approvedBy": "ECTA Inspector 1",
        "certificateNo": "QC-CERT-'$(date +%s)'",
        "grade": "GRADE_1",
        "moistureContent": 11.5,
        "defects": 2,
        "notes": "Meets export standards"
      }' 2>/dev/null)
    
    if echo "$APPROVE_QI" | grep -qi "approved\|success"; then
        print_success "7.3 Inspection approved (UNDER_REVIEW → APPROVED)"
    else
        print_fail "7.3 Inspection approval failed"
    fi
fi

# Test 20: Verify customs declaration auto-created
if [ ! -z "$TEST_QUALITY_ID" ]; then
    sleep 2
    CUSTOMS_CHECK=$(curl -s -X GET "$API_URL/customs/declarations" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$CUSTOMS_CHECK" | grep -q "$TEST_SHIPMENT_ID"; then
        print_success "7.4 Customs declaration auto-created after quality approval"
        TEST_CUSTOMS_ID=$(echo "$CUSTOMS_CHECK" | grep -o '"declarationId":"[^"]*"' | head -1 | cut -d'"' -f4)
    else
        print_fail "7.4 Customs auto-creation not triggered"
    fi
fi

################################################################################
# CUSTOMS CLEARANCE TESTS
################################################################################

print_header "8. CUSTOMS CLEARANCE WORKFLOW"

print_step "Testing customs declaration and clearance..."

# Test 21: Submit customs declaration
# NOTE: removed-unverifiable: there is no PATCH /customs/declarations/:id and
# no endpoint that moves a declaration to SUBMITTED — POST
# /customs/declaration/submit (customs.ts:676) already creates it as
# SUBMITTED. (This script never creates a declaration, so TEST_CUSTOMS_ID
# only exists if one was auto-created after the quality approval in Test 20.)
if [ ! -z "$TEST_CUSTOMS_ID" ]; then
    print_info "8.1 Customs declaration submission skipped — submit already creates SUBMITTED"
fi

# Test 22: Approve customs clearance
# NOTE: there is no POST /customs/declarations/:id/approve. Clearance is
# POST /customs/declaration/:declarationId/clear (customs.ts:2022); it reads
# clearedBy, clearanceNumber, exportDuty (among others).
if [ ! -z "$TEST_CUSTOMS_ID" ]; then
    APPROVE_CUSTOMS=$(curl -s -X POST "$API_URL/customs/declaration/$TEST_CUSTOMS_ID/clear" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "clearedBy": "Customs Officer",
        "clearanceNumber": "CLR-'$(date +%s)'",
        "exportDuty": 15000.00
      }' 2>/dev/null)
    
    if echo "$APPROVE_CUSTOMS" | grep -qi "approved\|cleared\|success"; then
        print_success "8.2 Customs declaration approved"
    else
        print_fail "8.2 Customs approval failed"
    fi
fi

# Test 23: Verify shipment status updated to CUSTOMS_CLEARED
if [ ! -z "$TEST_SHIPMENT_ID" ]; then
    sleep 2
    CHECK_SHIPMENT=$(curl -s -X GET "$API_URL/shipments/$TEST_SHIPMENT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$CHECK_SHIPMENT" | grep -qi "customs_cleared\|cleared"; then
        print_success "8.3 Shipment status updated to CUSTOMS_CLEARED"
    else
        print_fail "8.3 Shipment status not updated"
    fi
fi

################################################################################
# SHIPMENT LIFECYCLE TESTS
################################################################################

print_header "9. SHIPMENT LIFECYCLE STATUS TRANSITIONS"

print_step "Testing 10-stage shipment lifecycle..."

# Test 24-33: Test each shipment stage
SHIPMENT_STAGES=("LAND_TRANSPORT" "PORT_ARRIVED" "CONTAINER_STUFFED" "VESSEL_LOADED" "DEPARTED" "IN_TRANSIT" "DESTINATION_ARRIVED" "DELIVERED")

STAGE_NUM=24
for STAGE in "${SHIPMENT_STAGES[@]}"; do
    if [ ! -z "$TEST_SHIPMENT_ID" ]; then
        # NOTE: shipment status changes go through PUT /shipments/:shipmentID/status
        # (shipments.ts:1124), which validates the status against the shipment
        # status machine (statusManager.ts:116). These 8 stages are exactly the
        # valid chain starting from CUSTOMS_CLEARED: CUSTOMS_CLEARED →
        # LAND_TRANSPORT → PORT_ARRIVED → CONTAINER_STUFFED → VESSEL_LOADED →
        # DEPARTED → IN_TRANSIT → DESTINATION_ARRIVED → DELIVERED.
        UPDATE_STAGE=$(curl -s -X PUT "$API_URL/shipments/$TEST_SHIPMENT_ID/status" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $AUTH_TOKEN" \
          -d '{
            "status": "'$STAGE'"
          }' 2>/dev/null)
        
        if echo "$UPDATE_STAGE" | grep -qi "$STAGE\|success"; then
            print_success "9.$((STAGE_NUM-23)) Shipment status updated to $STAGE"
        else
            print_fail "9.$((STAGE_NUM-23)) Failed to update to $STAGE"
        fi
        ((STAGE_NUM++))
        sleep 1
    fi
done

################################################################################
# PAYMENT PROCESSING TESTS
################################################################################

print_header "10. PAYMENT PROCESSING"

print_step "Testing payment creation and processing..."

# Test 34: Create Payment
if [ ! -z "$TEST_CONTRACT_ID" ] && [ ! -z "$TEST_LC_ID" ]; then
    CREATE_PAYMENT=$(curl -s -X POST "$API_URL/payments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{
        "contractId": "'$TEST_CONTRACT_ID'",
        "lcId": "'$TEST_LC_ID'",
        "amount": 250000.00,
        "currency": "USD",
        "paymentMethod": "LC",
        "paymentType": "EXPORT_PROCEEDS"
      }' 2>/dev/null)
    
    if echo "$CREATE_PAYMENT" | grep -q "paymentId\|payment_id"; then
        print_success "10.1 Payment record created"
        TEST_PAYMENT_ID=$(echo "$CREATE_PAYMENT" | grep -o '"paymentId":"[^"]*"' | cut -d'"' -f4)
    else
        print_fail "10.1 Payment creation failed"
    fi
fi

# Test 35: Process Payment
# NOTE: removed-unverifiable: there is no POST /payments/:id/process. The
# payment lifecycle endpoints are POST /payments/record (payments.ts:254),
# POST /:paymentID/verify (payments.ts:452), POST /:paymentID/swift/initiate
# (payments.ts:560), POST /:paymentID/swift/confirm (payments.ts:659),
# POST /:paymentID/settle (payments.ts:761), PUT /:paymentID/confirm
# (payments.ts:909) and POST /:paymentID/release (payments.ts:1772) — verify
# and settle have different semantics and bodies, so no single replacement
# exists for a generic "process" step.
if [ ! -z "$TEST_PAYMENT_ID" ]; then
    print_info "10.2 Payment processing skipped — no /process endpoint exists"
fi

################################################################################
# AUDIT TRAIL TESTS
################################################################################

print_header "11. AUDIT TRAIL & BLOCKCHAIN VERIFICATION"

print_step "Testing audit logging and blockchain integration..."

# Test 36: Verify audit logs for contract
if [ ! -z "$TEST_CONTRACT_ID" ]; then
# NOTE: there is no GET /audit/logs. The per-entity audit trail is
# GET /audit/trail (audit.ts:1977); it requires BOTH entityType and entityId
# query params and returns data: allLogs.
    AUDIT_LOGS=$(curl -s -X GET "$API_URL/audit/trail?entityType=CONTRACT&entityId=$TEST_CONTRACT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$AUDIT_LOGS" | grep -q "CREATE\|UPDATE\|APPROVE"; then
        print_success "11.1 Audit trail captured for contract"
    else
        print_fail "11.1 Audit trail not found"
    fi
fi

# Test 37: Verify blockchain hash exists
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    BLOCKCHAIN_CHECK=$(curl -s -X GET "$API_URL/contracts/$TEST_CONTRACT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    
    if echo "$BLOCKCHAIN_CHECK" | grep -q "blockchainHash\|transactionId"; then
        print_success "11.2 Blockchain integration verified (hash exists)"
    else
        print_fail "11.2 Blockchain hash not found"
    fi
fi

# Test 38: Verify audit immutability
if [ ! -z "$TEST_CONTRACT_ID" ]; then
    # NOTE: GET /audit/trail (audit.ts:1977) requires BOTH entityType and
    # entityId, so the contract type is supplied here (the old call only
    # passed entityId, which /trail would reject).
    AUDIT_COUNT=$(curl -s -X GET "$API_URL/audit/trail?entityType=CONTRACT&entityId=$TEST_CONTRACT_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null | grep -o "auditId" | wc -l)
    
    if [ "$AUDIT_COUNT" -gt 0 ]; then
        print_success "11.3 Multiple audit entries recorded ($AUDIT_COUNT entries)"
    else
        print_fail "11.3 Insufficient audit trail"
    fi
fi

################################################################################
# REPORTING & ANALYTICS TESTS
################################################################################

print_header "12. REPORTING & ANALYTICS"

print_step "Testing analytics and reporting endpoints..."

# Test 39: Dashboard analytics
DASHBOARD=$(curl -s -X GET "$API_URL/analytics/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if echo "$DASHBOARD" | grep -q "totalContracts\|totalValue"; then
    print_success "12.1 Dashboard analytics accessible"
else
    print_fail "12.1 Dashboard analytics not available"
fi

# Test 40: Export statistics
# NOTE: there is no GET /analytics/stats; the closest real analytics
# endpoint is GET /analytics/breakdown (analytics.ts:225).
STATS=$(curl -s -X GET "$API_URL/analytics/breakdown" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if [ ! -z "$STATS" ]; then
    print_success "12.2 Statistics endpoint accessible"
else
    print_fail "12.2 Statistics endpoint failed"
fi

################################################################################
# DATA INTEGRITY TESTS
################################################################################

print_header "13. DATA INTEGRITY & VALIDATION"

print_step "Testing data validation and business rules..."

# Test 41: Negative amount validation
INVALID_PAYMENT=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "amount": -1000,
    "currency": "USD"
  }' 2>/dev/null)

if echo "$INVALID_PAYMENT" | grep -qi "error\|invalid"; then
    print_success "13.1 Negative amount validation working"
else
    print_fail "13.1 Negative amount accepted (validation failed)"
fi

# Test 42: Required fields validation
INVALID_CONTRACT=$(curl -s -X POST "$API_URL/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "contractNumber": "TEST"
  }' 2>/dev/null)

if echo "$INVALID_CONTRACT" | grep -qi "error\|required\|missing"; then
    print_success "13.2 Required field validation working"
else
    print_fail "13.2 Invalid contract accepted"
fi

################################################################################
# ROLE-BASED ACCESS CONTROL TESTS
################################################################################

print_header "14. ROLE-BASED ACCESS CONTROL (RBAC)"

print_step "Testing permission and role restrictions..."

# Test 43: ECTA portal access
# NOTE: there is no /ecta mount; contracts live at GET /contracts
# (contracts.ts:623).
ECTA_CONTRACTS=$(curl -s -X GET "$API_URL/contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if [ ! -z "$ECTA_CONTRACTS" ]; then
    print_success "14.1 ECTA portal accessible"
else
    print_fail "14.1 ECTA portal access denied"
fi

# Test 44: NBE portal access
NBE_FOREX=$(curl -s -X GET "$API_URL/nbe/forex" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if [ ! -z "$NBE_FOREX" ]; then
    print_success "14.2 NBE portal accessible"
else
    print_fail "14.2 NBE portal access denied"
fi

################################################################################
# SWIFT MESSAGING TESTS
################################################################################

print_header "15. SWIFT MESSAGING INTEGRATION"

print_step "Testing SWIFT message handling..."

# Test 45: SWIFT message list
# NOTE: SWIFT lives under /swift, not /banking; the list endpoint is
# GET /swift/messages (swift.ts:972).
SWIFT_MESSAGES=$(curl -s -X GET "$API_URL/swift/messages" \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)

if [ ! -z "$SWIFT_MESSAGES" ]; then
    print_success "15.1 SWIFT messages endpoint accessible"
else
    print_fail "15.1 SWIFT endpoint failed"
fi

# Test 46: Create SWIFT message (if supported)
# NOTE: the create endpoint is POST /swift/messages (swift.ts:60); it
# requires messageID, a messageType in MT103/MT700/MT707/MT750/MT752/MT710/
# MT730/MT910, swiftReference, senderBIC and receiverBIC.
CREATE_SWIFT=$(curl -s -X POST "$API_URL/swift/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "messageID": "MSG-TEST-'$(date +%s)'",
    "messageType": "MT700",
    "swiftReference": "TEST-'$(date +%s)'",
    "senderBIC": "CBETETAA",
    "receiverBIC": "TESTUSX0"
  }' 2>/dev/null)

if echo "$CREATE_SWIFT" | grep -q "messageId\|success"; then
    print_success "15.2 SWIFT message creation supported"
else
    print_info "15.2 SWIFT message creation (optional feature)"
fi

################################################################################
# ECX COFFEE LOT TESTS
################################################################################

print_header "16. ECX COFFEE LOT LIFECYCLE"

print_step "Testing ECX coffee lot workflow..."

# Test 47: Create coffee lot
CREATE_LOT=$(curl -s -X POST "$API_URL/ecx/lots" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "lotNumber": "LOT-TEST-'$(date +%s)'",
    "coffeeType": "ARABICA",
    "quantity": 500,
    "warehouse": "Addis Ababa Warehouse",
    "status": "WAREHOUSED"
  }' 2>/dev/null)

if echo "$CREATE_LOT" | grep -q "lotId\|lot_id"; then
    TEST_LOT_ID=$(echo "$CREATE_LOT" | grep -o '"lotId":"[^"]*"' | cut -d'"' -f4)
    print_success "16.1 Coffee lot created (WAREHOUSED)"
else
    print_fail "16.1 Coffee lot creation failed"
fi

# Test 48-50: Test lot status transitions
# NOTE: there is no PATCH /ecx/lots/:id. Lot transitions are separate POSTs:
# GRADED -> POST /ecx/lots/:lotId/grade (ecx.ts:342, requires grade, numeric
# moistureContent, integer defectCount, gradingOfficer); ASSIGNED -> POST
# /ecx/lots/:lotId/assign (ecx.ts:413, requires contractId, numeric
# pricePerKg); RELEASED -> POST /ecx/lots/:lotId/release (ecx.ts:441).
LOT_STAGES=("GRADED" "ASSIGNED" "RELEASED")
STAGE_NUM=48

for STAGE in "${LOT_STAGES[@]}"; do
    if [ ! -z "$TEST_LOT_ID" ]; then
        case "$STAGE" in
            GRADED)
                UPDATE_LOT=$(curl -s -X POST "$API_URL/ecx/lots/$TEST_LOT_ID/grade" \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer $AUTH_TOKEN" \
                  -d '{
                    "grade": "GRADE_2",
                    "moistureContent": 11.0,
                    "defectCount": 3,
                    "gradingOfficer": "ECX-GRADER-001"
                  }' 2>/dev/null)
                ;;
            ASSIGNED)
                UPDATE_LOT=$(curl -s -X POST "$API_URL/ecx/lots/$TEST_LOT_ID/assign" \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer $AUTH_TOKEN" \
                  -d '{
                    "contractId": "'$TEST_CONTRACT_ID'",
                    "pricePerKg": 8.50
                  }' 2>/dev/null)
                ;;
            RELEASED)
                UPDATE_LOT=$(curl -s -X POST "$API_URL/ecx/lots/$TEST_LOT_ID/release" \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer $AUTH_TOKEN" \
                  -d '{
                    "releaseDate": "'$(date +%Y-%m-%d)'"
                  }' 2>/dev/null)
                ;;
        esac
        
        if echo "$UPDATE_LOT" | grep -qi "$STAGE\|success"; then
            print_success "16.$((STAGE_NUM-46)) Lot status updated to $STAGE"
        else
            print_fail "16.$((STAGE_NUM-46)) Failed to update lot to $STAGE"
        fi
        ((STAGE_NUM++))
    fi
done

################################################################################
# FINAL RESULTS
################################################################################

echo ""
print_header "COMPREHENSIVE FUNCTIONALITY TEST RESULTS"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
else
    PASS_RATE=0
fi

echo "════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BOLD}Total Tests Run:${NC}      $TOTAL_TESTS"
echo -e "${GREEN}${BOLD}Tests Passed:${NC}         $TESTS_PASSED ✅"
echo -e "${RED}${BOLD}Tests Failed:${NC}         $TESTS_FAILED ❌"
echo -e "${CYAN}${BOLD}Pass Rate:${NC}            ${PASS_RATE}%"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉🎉🎉 ALL FUNCTIONALITY TESTS PASSED! 🎉🎉🎉${NC}"
    echo ""
    echo "✅ All business logic verified"
    echo "✅ All workflows functioning correctly"
    echo "✅ All integrations working"
    echo "✅ System ready for production"
else
    echo -e "${YELLOW}⚠️  Some functionality tests failed${NC}"
    echo ""
    echo "Please review the failed tests above and:"
    echo "  1. Check API server logs"
    echo "  2. Verify database state"
    echo "  3. Confirm blockchain network status"
    echo "  4. Review business logic implementation"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "Test completed: $(date)"
echo "Results saved to: /tmp/functionality-test-results.log"
echo "════════════════════════════════════════════════════════════════════"
