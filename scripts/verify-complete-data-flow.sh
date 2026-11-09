#!/bin/bash

# Complete Portal Data Flow Verification
# Tests: Database → API → UI Data Accuracy

API_BASE="http://localhost:5000/api/v1"
DB_CONN="postgresql://cecbs:cecbs123@localhost:5432/cecbs"

echo "════════════════════════════════════════════════════════════════"
echo "🔍 COMPLETE PORTAL DATA FLOW VERIFICATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Login function
login_as() {
    local username=$1
    local password=$2
    local response=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"password\":\"${password}\"}")
    echo "$response" | jq -r '.data.token // empty'
}

# Get database counts
get_db_counts() {
    echo "📊 STEP 1: Database Reality Check"
    echo "─────────────────────────────────────────────────────────────"
    
    export PGPASSWORD=cecbs123
    
    echo "Exporter Applications:"
    PENDING_APPS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending';" | xargs)
    APPROVED_APPS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'approved';" | xargs)
    REJECTED_APPS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'rejected';" | xargs)
    echo "  ✓ Pending: ${PENDING_APPS}"
    echo "  ✓ Approved: ${APPROVED_APPS}"
    echo "  ✓ Rejected: ${REJECTED_APPS}"
    
    echo ""
    echo "Customs Declarations:"
    SUBMITTED_DECL=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'SUBMITTED';" | xargs)
    INSPECTING_DECL=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'INSPECTING';" | xargs)
    UNDER_REVIEW_DECL=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'UNDER_REVIEW';" | xargs)
    CLEARED_DECL=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'CLEARED';" | xargs)
    REJECTED_DECL=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'REJECTED';" | xargs)
    echo "  ✓ Submitted: ${SUBMITTED_DECL}"
    echo "  ✓ Inspecting: ${INSPECTING_DECL}"
    echo "  ✓ Under Review: ${UNDER_REVIEW_DECL}"
    echo "  ✓ Cleared: ${CLEARED_DECL}"
    echo "  ✓ Rejected: ${REJECTED_DECL}"
    
    echo ""
    echo "Contracts:"
    TOTAL_CONTRACTS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts;" | xargs)
    echo "  ✓ Total: ${TOTAL_CONTRACTS}"
    
    echo ""
    echo "Quality Inspections:"
    TOTAL_INSPECTIONS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM quality_inspections;" | xargs)
    PENDING_INSPECTIONS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM quality_inspections WHERE status = 'pending';" | xargs)
    APPROVED_INSPECTIONS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM quality_inspections WHERE status = 'approved';" | xargs)
    echo "  ✓ Total: ${TOTAL_INSPECTIONS}"
    echo "  ✓ Pending: ${PENDING_INSPECTIONS}"
    echo "  ✓ Approved: ${APPROVED_INSPECTIONS}"
    
    echo ""
    echo "Shipments:"
    TOTAL_SHIPMENTS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM shipments;" | xargs)
    echo "  ✓ Total: ${TOTAL_SHIPMENTS}"
    
    echo ""
    echo "Letters of Credit:"
    TOTAL_LCS=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM letters_of_credit;" | xargs)
    echo "  ✓ Total: ${TOTAL_LCS}"
    
    echo ""
    echo "Forex Allocations:"
    TOTAL_FOREX=$(psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM forex_allocations;" | xargs)
    echo "  ✓ Total: ${TOTAL_FOREX}"
    
    echo ""
}

# Test ECTA Portal
test_ecta_portal() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🏛️  ECTA PORTAL DATA VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "ecta_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as ecta_admin"
    echo ""
    
    # Test dashboard statistics
    echo "📊 Testing Dashboard Endpoint with Statistics:"
    DASH_RESPONSE=$(curl -s -X GET "${API_BASE}/portals/ecta/dashboard" \
        -H "Authorization: Bearer ${TOKEN}")
    
    STAT_PENDING=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.applications.pending_applications // "0"')
    STAT_APPROVED=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.applications.approved_applications // "0"')
    STAT_TOTAL=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.applications.total_applications // "0"')
    
    echo "  API Statistics:"
    echo "    - Pending: ${STAT_PENDING}"
    echo "    - Approved: ${STAT_APPROVED}"
    echo "    - Total: ${STAT_TOTAL}"
    echo "  DB Reality:"
    echo "    - Pending: ${PENDING_APPS}"
    echo "    - Approved: ${APPROVED_APPS}"
    echo "    - Total: $((PENDING_APPS + APPROVED_APPS + REJECTED_APPS))"
    
    if [ "$STAT_PENDING" = "$PENDING_APPS" ] && [ "$STAT_APPROVED" = "$APPROVED_APPS" ]; then
        echo "  ✅ MATCH - Statistics are accurate!"
    else
        echo "  ❌ MISMATCH - Statistics are incorrect!"
    fi
    echo ""
}

# Test Customs Portal
test_customs_portal() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🛃 CUSTOMS PORTAL DATA VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "customs_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as customs_admin"
    echo ""
    
    # Test dashboard
    echo "📊 Testing Dashboard Endpoint:"
    DASH_RESPONSE=$(curl -s -X GET "${API_BASE}/portals/customs/dashboard" \
        -H "Authorization: Bearer ${TOKEN}")
    
    echo "Full API Response:" 
    echo "$DASH_RESPONSE" | jq '.'
    echo ""
    
    DASH_SUBMITTED=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.submittedCount // 0')
    DASH_INSPECTING=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.inspectingCount // 0')
    DASH_UNDER_REVIEW=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.underReviewCount // 0')
    DASH_CLEARED=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.clearedCount // 0')
    DASH_REJECTED=$(echo "$DASH_RESPONSE" | jq -r '.data.statistics.rejectedCount // 0')
    
    echo "  API Returns:"
    echo "    - Submitted: ${DASH_SUBMITTED}"
    echo "    - Inspecting: ${DASH_INSPECTING}"
    echo "    - Under Review: ${DASH_UNDER_REVIEW}"
    echo "    - Cleared: ${DASH_CLEARED}"
    echo "    - Rejected: ${DASH_REJECTED}"
    echo ""
    echo "  DB Reality:"
    echo "    - Submitted: ${SUBMITTED_DECL}"
    echo "    - Inspecting: ${INSPECTING_DECL}"
    echo "    - Under Review: ${UNDER_REVIEW_DECL}"
    echo "    - Cleared: ${CLEARED_DECL}"
    echo "    - Rejected: ${REJECTED_DECL}"
    
    if [ "$DASH_SUBMITTED" = "$SUBMITTED_DECL" ] && [ "$DASH_CLEARED" = "$CLEARED_DECL" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
    
    # Test declarations list
    echo "📋 Testing Declarations List:"
    DECL_RESPONSE=$(curl -s -X GET "${API_BASE}/customs/declarations" \
        -H "Authorization: Bearer ${TOKEN}")
    DECL_COUNT=$(echo "$DECL_RESPONSE" | jq '.data | length')
    echo "  API Returns: ${DECL_COUNT} declarations"
    echo "  DB Reality:  $((SUBMITTED_DECL + INSPECTING_DECL + UNDER_REVIEW_DECL + CLEARED_DECL + REJECTED_DECL)) total declarations"
    echo ""
}

# Test Quality Portal endpoints
test_quality_endpoints() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🔬 QUALITY INSPECTION ENDPOINTS VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "ecta_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as ecta_admin"
    echo ""
    
    # Test inspections list
    echo "📋 Testing Inspections List:"
    INSP_RESPONSE=$(curl -s -X GET "${API_BASE}/quality/inspections" \
        -H "Authorization: Bearer ${TOKEN}")
    INSP_COUNT=$(echo "$INSP_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${INSP_COUNT} inspections"
    echo "  DB Reality:  ${TOTAL_INSPECTIONS} total inspections"
    
    if [ "$INSP_COUNT" = "$TOTAL_INSPECTIONS" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
}

# Test Banks Portal
test_banks_portal() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🏦 BANKS PORTAL DATA VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "bank_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as bank_admin"
    echo ""
    
    # Test LCs
    echo "📋 Testing Letters of Credit:"
    LC_RESPONSE=$(curl -s -X GET "${API_BASE}/banking/lc" \
        -H "Authorization: Bearer ${TOKEN}")
    LC_COUNT=$(echo "$LC_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${LC_COUNT} LCs"
    echo "  DB Reality:  ${TOTAL_LCS} total LCs"
    
    if [ "$LC_COUNT" = "$TOTAL_LCS" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
    
    # Test Contracts
    echo "📋 Testing Contracts:"
    CONTRACTS_RESPONSE=$(curl -s -X GET "${API_BASE}/contracts" \
        -H "Authorization: Bearer ${TOKEN}")
    CONTRACTS_COUNT=$(echo "$CONTRACTS_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${CONTRACTS_COUNT} contracts"
    echo "  DB Reality:  ${TOTAL_CONTRACTS} total contracts"
    
    if [ "$CONTRACTS_COUNT" = "$TOTAL_CONTRACTS" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
}

# Test NBE Portal
test_nbe_portal() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🏛️  NBE PORTAL DATA VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "nbe_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as nbe_admin"
    echo ""
    
    # Test Forex
    echo "📋 Testing Forex Allocations:"
    FOREX_RESPONSE=$(curl -s -X GET "${API_BASE}/forex" \
        -H "Authorization: Bearer ${TOKEN}")
    FOREX_COUNT=$(echo "$FOREX_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${FOREX_COUNT} forex allocations"
    echo "  DB Reality:  ${TOTAL_FOREX} total forex allocations"
    
    if [ "$FOREX_COUNT" = "$TOTAL_FOREX" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
}

# Test Shipping Portal
test_shipping_portal() {
    echo "════════════════════════════════════════════════════════════════"
    echo "🚢 SHIPPING PORTAL DATA VERIFICATION"
    echo "════════════════════════════════════════════════════════════════"
    
    TOKEN=$(login_as "shipping_admin" "password123")
    if [ -z "$TOKEN" ]; then
        echo "❌ Login failed"
        return
    fi
    echo "✓ Logged in as shipping_admin"
    echo ""
    
    # Test Shipments
    echo "📋 Testing Shipments List:"
    SHIP_RESPONSE=$(curl -s -X GET "${API_BASE}/shipments" \
        -H "Authorization: Bearer ${TOKEN}")
    SHIP_COUNT=$(echo "$SHIP_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${SHIP_COUNT} shipments"
    echo "  DB Reality:  ${TOTAL_SHIPMENTS} total shipments"
    
    if [ "$SHIP_COUNT" = "$TOTAL_SHIPMENTS" ]; then
        echo "  ✅ MATCH - Data is accurate!"
    else
        echo "  ❌ MISMATCH - Data is incorrect!"
    fi
    echo ""
    
    # Test customs clearances (critical for shipping workflow)
    echo "📋 Testing Customs Clearances:"
    CLEAR_RESPONSE=$(curl -s -X GET "${API_BASE}/customs/clearances" \
        -H "Authorization: Bearer ${TOKEN}")
    CLEAR_COUNT=$(echo "$CLEAR_RESPONSE" | jq '.data | length // 0')
    echo "  API Returns: ${CLEAR_COUNT} clearances"
    echo "  DB Reality:  ${CLEARED_DECL} cleared declarations"
    echo ""
}

# Run all tests
main() {
    get_db_counts
    echo ""
    test_ecta_portal
    test_customs_portal
    test_quality_endpoints
    test_banks_portal
    test_nbe_portal
    test_shipping_portal
    
    echo "════════════════════════════════════════════════════════════════"
    echo "✅ VERIFICATION COMPLETE"
    echo "════════════════════════════════════════════════════════════════"
}

main
