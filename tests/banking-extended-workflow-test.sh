#!/bin/bash

################################################################################
# BANKING EXTENDED WORKFLOW TEST
# Tests advanced banking operations including LC amendments, discrepancies,
# transfers, standby LC, deferred payments, and acceptance financing
#
# Test Count: 14 tests (Test #45-58)
################################################################################

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test-helpers.sh"

# Test configuration
TEST_SUITE="Banking Extended Workflow"
LOG_FILE="$OUTPUT_DIR/banking_extended_$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$OUTPUT_DIR"

echo "==================================" | tee "$LOG_FILE"
echo "BANKING EXTENDED WORKFLOW TEST" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "==================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Test artifacts (will be created during tests)
EXPORTER_ID=""
CONTRACT_ID=""
LC_ID=""
SHIPMENT_ID=""
AMENDMENT_ID=""
DISCREPANCY_ID=""

################################################################################
log_section "PHASE 1: SETUP - Create Prerequisites"
################################################################################

log_test "Login as ECTA admin"
ECTA_TOKEN=$(login_user "ecta_admin" "password123" "ECTA")
if [ -n "$ECTA_TOKEN" ]; then
    log_pass "ECTA admin logged in"
else
    log_fail "Failed to login as ECTA admin"
    exit 1
fi

log_test "Register and approve exporter"
EXPORTER_RESPONSE=$(api_post "/exporters/register" "" '{
    "businessName": "Extended Banking Test Exporter",
    "tinNumber": "TIN-'$(date +%s)'",
    "licenseNumber": "LIC-'$(date +%s)'",
    "contactPerson": "John Doe",
    "email": "john@testexporter.com",
    "phone": "+251911000000",
    "address": "Addis Ababa, Ethiopia"
}')

EXPORTER_ID=$(extract_id "$EXPORTER_RESPONSE" "data.exporterId")
if [ -n "$EXPORTER_ID" ]; then
    # Approve exporter
    api_post "/exporters/$EXPORTER_ID/approve" "$ECTA_TOKEN" '{"feedback":"Approved for testing"}' > /dev/null
    log_pass "Exporter registered and approved: $EXPORTER_ID"
else
    log_fail "Failed to register exporter"
    exit 1
fi

log_test "Register sales contract"
CONTRACT_RESPONSE=$(api_post "/contracts/register" "$ECTA_TOKEN" '{
    "exporterId": "'$EXPORTER_ID'",
    "buyerName": "Test Buyer LLC",
    "buyerCountry": "United States",
    "productDescription": "Washed Sidamo Coffee Beans",
    "quantity": 1000,
    "unitPrice": 5.50,
    "totalValue": 5500,
    "currency": "USD",
    "incoterms": "FOB",
    "paymentTerms": "Letter of Credit",
    "deliveryDate": "2027-12-31"
}')

CONTRACT_ID=$(extract_id "$CONTRACT_RESPONSE" "data.contractId")
if [ -n "$CONTRACT_ID" ]; then
    log_pass "Contract registered: $CONTRACT_ID"
else
    log_fail "Failed to register contract"
    exit 1
fi

log_test "Login as Bank admin"
BANK_TOKEN=$(login_user "bank_admin" "password123" "BANKS")
if [ -n "$BANK_TOKEN" ]; then
    log_pass "Bank admin logged in"
else
    log_fail "Failed to login as Bank admin"
    exit 1
fi

log_test "Open and issue base LC"
LC_RESPONSE=$(api_post "/banking/lc/open" "$BANK_TOKEN" '{
    "contractId": "'$CONTRACT_ID'",
    "lcNumber": "LC-EXT-'$(date +%s)'",
    "amount": 50000,
    "currency": "USD",
    "expiryDate": "2027-12-31",
    "terms": "Payment at sight",
    "beneficiary": "Extended Banking Test Exporter",
    "applicant": "Test Buyer LLC"
}')

LC_ID=$(extract_id "$LC_RESPONSE" "data.lcId")
if [ -n "$LC_ID" ]; then
    # Issue the LC
    api_post "/banking/lc/$LC_ID/issue" "$BANK_TOKEN" '{}' > /dev/null
    log_pass "LC opened and issued: $LC_ID"
else
    log_fail "Failed to open LC"
    exit 1
fi

################################################################################
log_section "PHASE 2: LC AMENDMENTS (Tests 45-49)"
################################################################################

log_test "Request LC amendment - Amount increase"
AMENDMENT_RESPONSE=$(api_post "/banking/lc/$LC_ID/amendments/request" "$BANK_TOKEN" '{
    "amendmentType": "AMOUNT_INCREASE",
    "requestedBy": "bank_admin",
    "reason": "Additional quantity ordered by buyer",
    "changes": {
        "currentAmount": 50000,
        "newAmount": 65000,
        "increaseAmount": 15000
    },
    "justification": "Buyer increased order from 1000kg to 1300kg"
}')

if assert_success "$AMENDMENT_RESPONSE" "Amount increase amendment"; then
    AMENDMENT_ID=$(extract_id "$AMENDMENT_RESPONSE" "data.amendmentId")
    log_pass "LC amendment requested (amount increase): $AMENDMENT_ID"
else
    log_fail "Failed to request LC amendment (amount increase)"
fi

log_test "Request LC amendment - Expiry extension"
EXPIRY_AMENDMENT=$(api_post "/banking/lc/$LC_ID/amendments/request" "$BANK_TOKEN" '{
    "amendmentType": "EXPIRY_EXTENSION",
    "requestedBy": "bank_admin",
    "reason": "Shipment delay due to weather conditions",
    "changes": {
        "currentExpiry": "2027-12-31",
        "newExpiry": "2028-03-31",
        "extensionDays": 90
    },
    "justification": "Port closure due to monsoon season"
}')

if assert_success "$EXPIRY_AMENDMENT" "Expiry extension amendment"; then
    EXPIRY_AMENDMENT_ID=$(extract_id "$EXPIRY_AMENDMENT" "data.amendmentId")
    log_pass "LC amendment requested (expiry extension): $EXPIRY_AMENDMENT_ID"
else
    log_fail "Failed to request LC amendment (expiry extension)"
fi

log_test "Request LC amendment - Document changes"
DOC_AMENDMENT=$(api_post "/banking/lc/$LC_ID/amendments/request" "$BANK_TOKEN" '{
    "amendmentType": "DOCUMENT_CHANGE",
    "requestedBy": "bank_admin",
    "reason": "Updated regulatory requirements for destination country",
    "changes": {
        "addedDocuments": ["Fumigation Certificate", "Organic Certification"],
        "removedDocuments": [],
        "modifiedTerms": "Additional certificates required as per FDA regulations"
    },
    "justification": "New FDA requirements for organic coffee imports"
}')

if assert_success "$DOC_AMENDMENT" "Document change amendment"; then
    DOC_AMENDMENT_ID=$(extract_id "$DOC_AMENDMENT" "data.amendmentId")
    log_pass "LC amendment requested (document changes): $DOC_AMENDMENT_ID"
else
    log_fail "Failed to request LC amendment (document changes)"
fi

log_test "Approve LC amendment"
if [ -n "$AMENDMENT_ID" ]; then
    APPROVE_RESPONSE=$(api_post "/banking/lc/$LC_ID/amendments/$AMENDMENT_ID/approve" "$BANK_TOKEN" '{
        "approvedBy": "bank_admin",
        "approvalNotes": "Amendment approved - additional collateral received",
        "effectiveDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }')
    
    if assert_success "$APPROVE_RESPONSE" "Approve amendment"; then
        log_pass "LC amendment approved: $AMENDMENT_ID"
    else
        log_fail "Failed to approve LC amendment"
    fi
else
    log_fail "No amendment ID available for approval"
fi

log_test "Reject LC amendment"
if [ -n "$DOC_AMENDMENT_ID" ]; then
    REJECT_RESPONSE=$(api_post "/banking/lc/$LC_ID/amendments/$DOC_AMENDMENT_ID/reject" "$BANK_TOKEN" '{
        "rejectedBy": "bank_admin",
        "rejectionReason": "Applicant did not provide consent for additional document requirements",
        "alternativeSuggestion": "Submit amendment with applicant approval"
    }')
    
    if assert_success "$REJECT_RESPONSE" "Reject amendment"; then
        log_pass "LC amendment rejected with reason"
    else
        log_fail "Failed to reject LC amendment"
    fi
else
    log_fail "No amendment ID available for rejection"
fi

################################################################################
log_section "PHASE 3: LC DISCREPANCIES (Tests 50-52)"
################################################################################

log_test "Report LC document discrepancy"
DISCREPANCY_RESPONSE=$(api_post "/banking/lc/$LC_ID/discrepancies/report" "$BANK_TOKEN" '{
    "discrepancyType": "DOCUMENT_MISSING",
    "description": "Certificate of Origin not provided in document set",
    "documentReference": "COO-REQ-001",
    "severity": "MAJOR",
    "reportedBy": "bank_admin",
    "reportedDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "affectedDocuments": ["Certificate of Origin"],
    "correctiveAction": "Beneficiary must provide valid Certificate of Origin within 5 banking days"
}')

if assert_success "$DISCREPANCY_RESPONSE" "Report discrepancy"; then
    DISCREPANCY_ID=$(extract_id "$DISCREPANCY_RESPONSE" "data.discrepancyId")
    log_pass "Document discrepancy reported: $DISCREPANCY_ID"
else
    log_fail "Failed to report document discrepancy"
fi

log_test "Accept discrepancy with waiver"
if [ -n "$DISCREPANCY_ID" ]; then
    WAIVER_RESPONSE=$(api_post "/banking/lc/$LC_ID/discrepancies/$DISCREPANCY_ID/waive" "$BANK_TOKEN" '{
        "waivedBy": "bank_admin",
        "waiverReason": "Applicant accepts to waive this discrepancy",
        "applicantConsent": true,
        "waiverDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "conditions": "Payment to be made despite missing document",
        "applicantReference": "WAIVER-APP-'$(date +%s)'"
    }')
    
    if assert_success "$WAIVER_RESPONSE" "Waive discrepancy"; then
        log_pass "Discrepancy accepted with applicant waiver"
    else
        log_fail "Failed to waive discrepancy"
    fi
else
    log_fail "No discrepancy ID available for waiver"
fi

log_test "Reject documents due to discrepancy"
# Report another discrepancy for rejection test
DISC2_RESPONSE=$(api_post "/banking/lc/$LC_ID/discrepancies/report" "$BANK_TOKEN" '{
    "discrepancyType": "AMOUNT_MISMATCH",
    "description": "Invoice amount USD 55,000 exceeds LC amount USD 50,000",
    "severity": "CRITICAL",
    "reportedBy": "bank_admin"
}')

DISC2_ID=$(extract_id "$DISC2_RESPONSE" "data.discrepancyId")
if [ -n "$DISC2_ID" ]; then
    REJECT_DOC_RESPONSE=$(api_post "/banking/lc/$LC_ID/discrepancies/$DISC2_ID/reject-documents" "$BANK_TOKEN" '{
        "rejectedBy": "bank_admin",
        "rejectionReason": "Invoice amount exceeds LC limit - no waiver granted",
        "actionRequired": "Beneficiary must submit revised invoice or request LC amendment",
        "refundInstructions": "Documents to be returned to presenting bank"
    }')
    
    if assert_success "$REJECT_DOC_RESPONSE" "Reject documents"; then
        log_pass "Documents rejected due to critical discrepancy"
    else
        log_fail "Failed to reject documents"
    fi
else
    log_fail "Failed to create discrepancy for rejection test"
fi

################################################################################
log_section "PHASE 4: ADVANCED LC OPERATIONS (Tests 53-58)"
################################################################################

log_test "Transfer LC to second beneficiary"
TRANSFER_RESPONSE=$(api_post "/banking/lc/$LC_ID/transfer" "$BANK_TOKEN" '{
    "originalBeneficiary": "Extended Banking Test Exporter",
    "newBeneficiary": "Second Beneficiary Trading Company",
    "newBeneficiaryBank": "Commercial Bank of Ethiopia",
    "transferType": "FULL",
    "transferAmount": 50000,
    "transferReason": "Original beneficiary is intermediary trader",
    "originalBeneficiaryConsent": true,
    "transferDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "termsAndConditions": "All original LC terms apply to second beneficiary"
}')

if assert_success "$TRANSFER_RESPONSE" "Transfer LC"; then
    TRANSFER_ID=$(extract_id "$TRANSFER_RESPONSE" "data.transferId")
    log_pass "LC transferred to second beneficiary: $TRANSFER_ID"
else
    log_fail "Failed to transfer LC"
fi

log_test "Issue standby LC"
STANDBY_RESPONSE=$(api_post "/banking/lc/standby/issue" "$BANK_TOKEN" '{
    "standbyLCNumber": "SBLC-'$(date +%s)'",
    "contractId": "'$CONTRACT_ID'",
    "amount": 100000,
    "currency": "USD",
    "expiryDate": "2028-06-30",
    "type": "PERFORMANCE",
    "purpose": "Performance guarantee for export contract",
    "beneficiary": "Extended Banking Test Exporter",
    "applicant": "Test Buyer LLC",
    "terms": "Payable on first written demand with beneficiary statement of non-performance",
    "issuingBank": "Test Commercial Bank",
    "advisingBank": "Beneficiary Bank"
}')

if assert_success "$STANDBY_RESPONSE" "Issue standby LC"; then
    STANDBY_ID=$(extract_id "$STANDBY_RESPONSE" "data.standbyLCId")
    log_pass "Standby LC issued: $STANDBY_ID"
else
    log_fail "Failed to issue standby LC"
fi

log_test "Process deferred payment"
DEFERRED_LC_RESPONSE=$(api_post "/banking/lc/open" "$BANK_TOKEN" '{
    "contractId": "'$CONTRACT_ID'",
    "lcNumber": "LC-DEF-'$(date +%s)'",
    "amount": 75000,
    "currency": "USD",
    "expiryDate": "2027-12-31",
    "paymentTerms": "DEFERRED",
    "deferredDays": 90,
    "terms": "Payment 90 days after presentation of compliant documents",
    "beneficiary": "Extended Banking Test Exporter",
    "applicant": "Test Buyer LLC"
}')

DEFERRED_LC_ID=$(extract_id "$DEFERRED_LC_RESPONSE" "data.lcId")
if [ -n "$DEFERRED_LC_ID" ]; then
    # Process the deferred payment
    DEFERRED_PAYMENT=$(api_post "/banking/lc/$DEFERRED_LC_ID/deferred-payment/record" "$BANK_TOKEN" '{
        "documentPresentationDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "maturityDate": "'$(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ")'",
        "deferredAmount": 75000,
        "acceptanceBy": "bank_admin",
        "acceptanceDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "interest": 1500,
        "totalPayable": 76500
    }')
    
    if assert_success "$DEFERRED_PAYMENT" "Deferred payment"; then
        log_pass "Deferred payment processed for LC: $DEFERRED_LC_ID"
    else
        log_fail "Failed to process deferred payment"
    fi
else
    log_fail "Failed to create LC with deferred payment terms"
fi

log_test "Handle acceptance financing"
ACCEPTANCE_RESPONSE=$(api_post "/banking/lc/$DEFERRED_LC_ID/acceptance-financing" "$BANK_TOKEN" '{
    "financingAmount": 75000,
    "discountRate": 5.5,
    "discountAmount": 1031.25,
    "netAmount": 73968.75,
    "financingPeriod": 90,
    "beneficiary": "Extended Banking Test Exporter",
    "requestDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "maturityDate": "'$(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ")'",
    "terms": "Beneficiary requests early payment at discount"
}')

if assert_success "$ACCEPTANCE_RESPONSE" "Acceptance financing"; then
    FINANCING_ID=$(extract_id "$ACCEPTANCE_RESPONSE" "data.financingId")
    log_pass "Acceptance financing approved: $FINANCING_ID"
else
    log_fail "Failed to process acceptance financing"
fi

log_test "Process payment at sight"
SIGHT_LC_RESPONSE=$(api_post "/banking/lc/open" "$BANK_TOKEN" '{
    "contractId": "'$CONTRACT_ID'",
    "lcNumber": "LC-SIGHT-'$(date +%s)'",
    "amount": 45000,
    "currency": "USD",
    "expiryDate": "2027-12-31",
    "paymentTerms": "AT_SIGHT",
    "terms": "Payment upon presentation of compliant documents",
    "beneficiary": "Extended Banking Test Exporter",
    "applicant": "Test Buyer LLC"
}')

SIGHT_LC_ID=$(extract_id "$SIGHT_LC_RESPONSE" "data.lcId")
if [ -n "$SIGHT_LC_ID" ]; then
    # Issue the LC
    api_post "/banking/lc/$SIGHT_LC_ID/issue" "$BANK_TOKEN" '{}' > /dev/null
    
    # Process sight payment
    SIGHT_PAYMENT=$(api_post "/banking/lc/$SIGHT_LC_ID/payment/process" "$BANK_TOKEN" '{
        "paymentType": "AT_SIGHT",
        "paymentAmount": 45000,
        "currency": "USD",
        "documentPresentationDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "documentsCompliant": true,
        "paymentDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "processedBy": "bank_admin",
        "reference": "SIGHT-PAY-'$(date +%s)'"
    }')
    
    if assert_success "$SIGHT_PAYMENT" "Sight payment"; then
        log_pass "Payment at sight processed for LC: $SIGHT_LC_ID"
    else
        log_fail "Failed to process payment at sight"
    fi
else
    log_fail "Failed to create LC with payment at sight terms"
fi

log_test "Apply forex rate at payment"
FOREX_PAYMENT=$(api_post "/banking/lc/$SIGHT_LC_ID/payment/apply-forex" "$BANK_TOKEN" '{
    "paymentAmount": 45000,
    "currency": "USD",
    "targetCurrency": "ETB",
    "forexRate": 125.50,
    "convertedAmount": 5647500,
    "rateDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "rateSource": "NBE Official Rate",
    "conversionReference": "FX-CONV-'$(date +%s)'"
}')

if assert_success "$FOREX_PAYMENT" "Forex conversion"; then
    log_pass "Forex rate applied to payment: USD 45,000 = ETB 5,647,500"
else
    log_fail "Failed to apply forex rate"
fi

################################################################################
log_section "TEST SUMMARY"
################################################################################

print_test_summary "$TEST_SUITE"

echo "" | tee -a "$LOG_FILE"
echo "Test artifacts created:" | tee -a "$LOG_FILE"
echo "  - Exporter: $EXPORTER_ID" | tee -a "$LOG_FILE"
echo "  - Contract: $CONTRACT_ID" | tee -a "$LOG_FILE"
echo "  - Base LC: $LC_ID" | tee -a "$LOG_FILE"
echo "  - Amendments: $AMENDMENT_ID, $EXPIRY_AMENDMENT_ID, $DOC_AMENDMENT_ID" | tee -a "$LOG_FILE"
echo "  - Discrepancies: $DISCREPANCY_ID, $DISC2_ID" | tee -a "$LOG_FILE"
echo "  - Transfer: $TRANSFER_ID" | tee -a "$LOG_FILE"
echo "  - Standby LC: $STANDBY_ID" | tee -a "$LOG_FILE"
echo "  - Deferred LC: $DEFERRED_LC_ID" | tee -a "$LOG_FILE"
echo "  - Sight LC: $SIGHT_LC_ID" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✓ BANKING EXTENDED WORKFLOW TEST - ALL TESTS PASSED" | tee -a "$LOG_FILE"
    exit 0
else
    echo "✗ BANKING EXTENDED WORKFLOW TEST - SOME TESTS FAILED" | tee -a "$LOG_FILE"
    exit 1
fi
