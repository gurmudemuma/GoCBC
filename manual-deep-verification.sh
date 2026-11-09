#!/bin/bash

# Manual Deep Verification - Check every single portal tab endpoint against actual database
# This script will show EXACT API responses vs EXACT database counts

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🔍 MANUAL DEEP VERIFICATION - CHECKING EVERY DETAIL"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Get fresh database counts
echo "📊 DATABASE REALITY CHECK:"
echo "─────────────────────────────────────────────────────────────"

DB_APPS_PENDING=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending';")
DB_APPS_APPROVED=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'approved';")
DB_APPS_REJECTED=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'rejected';")
DB_APPS_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM exporter_applications;")
DB_EXPORTERS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(DISTINCT exporter_id) FROM exporter_applications WHERE status = 'approved';")

DB_CONTRACTS_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM contracts;")

DB_CUSTOMS_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations;")
DB_CUSTOMS_SUBMITTED=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'SUBMITTED';")
DB_CUSTOMS_REVIEW=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'UNDER_REVIEW';")
DB_CUSTOMS_CLEARED=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'CLEARED';")
DB_CUSTOMS_INSPECT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE inspection_required = true AND status IN ('SUBMITTED', 'UNDER_REVIEW');")

DB_SHIPMENTS_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM shipments;")
DB_SHIPMENTS_PENDING=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM shipments WHERE status = 'pending';")

DB_LC_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM letters_of_credit;")

DB_QUALITY_TOTAL=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM quality_inspections;")
DB_QUALITY_PENDING=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM quality_inspections WHERE status = 'pending';")
DB_QUALITY_APPROVED=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM quality_inspections WHERE status = 'approved';")

echo "Applications: Pending=$DB_APPS_PENDING, Approved=$DB_APPS_APPROVED, Rejected=$DB_APPS_REJECTED, Total=$DB_APPS_TOTAL"
echo "Exporters: Total=$DB_EXPORTERS"
echo "Contracts: Total=$DB_CONTRACTS_TOTAL"
echo "Customs: Total=$DB_CUSTOMS_TOTAL, Submitted=$DB_CUSTOMS_SUBMITTED, Review=$DB_CUSTOMS_REVIEW, Cleared=$DB_CUSTOMS_CLEARED, NeedInspect=$DB_CUSTOMS_INSPECT"
echo "Shipments: Total=$DB_SHIPMENTS_TOTAL, Pending=$DB_SHIPMENTS_PENDING"
echo "LCs: Total=$DB_LC_TOTAL"
echo "Quality: Total=$DB_QUALITY_TOTAL, Pending=$DB_QUALITY_PENDING, Approved=$DB_QUALITY_APPROVED"
echo ""

# Test each portal
FAIL_COUNT=0
PASS_COUNT=0

test_endpoint() {
    local NAME=$1
    local TOKEN=$2
    local ENDPOINT=$3
    local JSON_PATH=$4
    local EXPECTED=$5
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000${ENDPOINT}")
    ACTUAL=$(echo "$RESPONSE" | jq -r "$JSON_PATH")
    
    if [ "$ACTUAL" = "$EXPECTED" ]; then
        echo "✅ $NAME: API=$ACTUAL, Expected=$EXPECTED"
        ((PASS_COUNT++))
    else
        echo "❌ $NAME: API=$ACTUAL, Expected=$EXPECTED"
        echo "   Full Response: $RESPONSE"
        ((FAIL_COUNT++))
    fi
}

echo "════════════════════════════════════════════════════════════════"
echo "🔍 1. ECTA PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

# Login as ECTA
TOKEN_ECTA=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing ECTA endpoints..."
test_endpoint "ECTA Dashboard - Pending" "$TOKEN_ECTA" "/api/v1/portals/ecta/dashboard" '.data.statistics.applications.pending_applications' "$DB_APPS_PENDING"
test_endpoint "ECTA Dashboard - Approved" "$TOKEN_ECTA" "/api/v1/portals/ecta/dashboard" '.data.statistics.applications.approved_applications' "$DB_APPS_APPROVED"
test_endpoint "ECTA Dashboard - Total" "$TOKEN_ECTA" "/api/v1/portals/ecta/dashboard" '.data.statistics.applications.total_applications' "$DB_APPS_TOTAL"
test_endpoint "ECTA Pending Apps List" "$TOKEN_ECTA" "/api/v1/applications?status=pending" '.data.applications | length' "$DB_APPS_PENDING"
test_endpoint "ECTA Approved Apps List" "$TOKEN_ECTA" "/api/v1/applications?status=approved" '.data.applications | length' "$DB_APPS_APPROVED"
test_endpoint "ECTA Rejected Apps List" "$TOKEN_ECTA" "/api/v1/applications?status=rejected" '.data.applications | length' "$DB_APPS_REJECTED"
test_endpoint "ECTA All Exporters" "$TOKEN_ECTA" "/api/v1/users/exporters" '.data.exporters | length' "$DB_EXPORTERS"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 2. ECX PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

TOKEN_ECX=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecx_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing ECX endpoints..."
test_endpoint "ECX All Contracts" "$TOKEN_ECX" "/api/v1/contracts" '.data.contracts | length' "$DB_CONTRACTS_TOTAL"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 3. CUSTOMS PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

TOKEN_CUSTOMS=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing Customs endpoints..."
test_endpoint "Customs Dashboard - Submitted" "$TOKEN_CUSTOMS" "/api/v1/portals/customs/dashboard" '.data.statusCounts.SUBMITTED' "$DB_CUSTOMS_SUBMITTED"
test_endpoint "Customs Dashboard - Review" "$TOKEN_CUSTOMS" "/api/v1/portals/customs/dashboard" '.data.statusCounts.UNDER_REVIEW' "$DB_CUSTOMS_REVIEW"
test_endpoint "Customs Dashboard - Cleared" "$TOKEN_CUSTOMS" "/api/v1/portals/customs/dashboard" '.data.statusCounts.CLEARED' "$DB_CUSTOMS_CLEARED"
test_endpoint "Customs All Declarations" "$TOKEN_CUSTOMS" "/api/v1/customs/declarations" '.data.declarations | length' "$DB_CUSTOMS_TOTAL"
test_endpoint "Customs Submitted" "$TOKEN_CUSTOMS" "/api/v1/customs/declarations?status=SUBMITTED" '.data.declarations | length' "$DB_CUSTOMS_SUBMITTED"
test_endpoint "Customs Review" "$TOKEN_CUSTOMS" "/api/v1/customs/declarations?status=UNDER_REVIEW" '.data.declarations | length' "$DB_CUSTOMS_REVIEW"
test_endpoint "Customs Cleared" "$TOKEN_CUSTOMS" "/api/v1/customs/declarations?status=CLEARED" '.data.declarations | length' "$DB_CUSTOMS_CLEARED"
test_endpoint "Customs Inspection Queue" "$TOKEN_CUSTOMS" "/api/v1/portals/customs/dashboard" '.data.scheduledInspections | length' "$DB_CUSTOMS_INSPECT"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 4. SHIPPING PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

TOKEN_SHIPPING=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing Shipping endpoints..."
test_endpoint "Shipping All Shipments" "$TOKEN_SHIPPING" "/api/v1/shipping/shipments" '.data.shipments | length' "$DB_SHIPMENTS_TOTAL"
test_endpoint "Shipping Pending" "$TOKEN_SHIPPING" "/api/v1/shipping/shipments?status=pending" '.data.shipments | length' "$DB_SHIPMENTS_PENDING"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 5. BANKS PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

TOKEN_BANKS=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing Banks endpoints..."
test_endpoint "Banks All LCs" "$TOKEN_BANKS" "/api/v1/banking/lc" '.data.lcs | length' "$DB_LC_TOTAL"
test_endpoint "Banks All Contracts" "$TOKEN_BANKS" "/api/v1/contracts" '.data.contracts | length' "$DB_CONTRACTS_TOTAL"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 6. NBE PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

TOKEN_NBE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')

echo "Testing NBE endpoints..."
test_endpoint "NBE LC Monitoring" "$TOKEN_NBE" "/api/v1/nbe/lc-monitoring" '.count' "$DB_LC_TOTAL"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 7. QUALITY PORTAL VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

echo "Testing Quality endpoints (using ECTA token - quality is cross-org)..."
test_endpoint "Quality All Inspections" "$TOKEN_ECTA" "/api/v1/quality/inspections" '.data.inspections | length' "$DB_QUALITY_TOTAL"
test_endpoint "Quality Pending" "$TOKEN_ECTA" "/api/v1/quality/inspections?status=pending" '.data.inspections | length' "$DB_QUALITY_PENDING"
test_endpoint "Quality Approved" "$TOKEN_ECTA" "/api/v1/quality/inspections?status=approved" '.data.inspections | length' "$DB_QUALITY_APPROVED"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 FINAL VERIFICATION RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo "✅ Passed: $PASS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED - 100% DATA ACCURACY VERIFIED!"
    exit 0
else
    echo "⚠️  SOME TESTS FAILED - REVIEW ABOVE DETAILS"
    exit 1
fi
