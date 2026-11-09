#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           COMPLETE PORTAL TABS ENDPOINT VERIFICATION             ║"
echo "║                    Testing All 7 Portals                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local username=$3
    local password=$4
    local description=$5
    
    # Login
    TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$username\",\"password\":\"$password\"}" | \
      python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)
    
    if [ -z "$TOKEN" ]; then
        echo "  ❌ Login failed for $username"
        return
    fi
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X $method \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "http://localhost:5000/api/v1${path}")
    
    if [ "$STATUS" = "200" ]; then
        echo "  ✅ $description"
    elif [ "$STATUS" = "404" ]; then
        echo "  ⚠️  $description (404 - may be no data)"
    else
        echo "  ❌ $description (HTTP $STATUS)"
    fi
}

# ==================== PORTAL 1: ECTA ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏛️  PORTAL 1: ECTA (Ethiopian Coffee & Tea Authority)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/ecta/dashboard" "ecta_admin" "password123" "Dashboard"
test_endpoint "GET" "/exporters" "ecta_admin" "password123" "Exporters List"
test_endpoint "GET" "/exporters?status=approved" "ecta_admin" "password123" "Approved Exporters"
test_endpoint "GET" "/exporters/applications" "ecta_admin" "password123" "Applications List"
test_endpoint "GET" "/exporters/licenses" "ecta_admin" "password123" "Licenses List"
test_endpoint "GET" "/audit/portal/recent?limit=10" "ecta_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 2: ECX ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PORTAL 2: ECX (Ethiopia Commodity Exchange)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/ecx/dashboard" "ecx_admin" "password123" "Dashboard"
test_endpoint "GET" "/contracts" "ecx_admin" "password123" "Contracts List"
test_endpoint "GET" "/contracts?status=ACTIVE" "ecx_admin" "password123" "Active Contracts"
test_endpoint "GET" "/contracts?status=COMPLETED" "ecx_admin" "password123" "Completed Contracts"
test_endpoint "GET" "/analytics/market-overview" "ecx_admin" "password123" "Market Overview"
test_endpoint "GET" "/audit/portal/recent?limit=10" "ecx_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 3: CUSTOMS ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛃 PORTAL 3: CUSTOMS (Customs Authority)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/customs/dashboard" "customs_admin" "password123" "Dashboard"
test_endpoint "GET" "/customs/declarations" "customs_admin" "password123" "Declarations List"
test_endpoint "GET" "/customs/declarations?status=SUBMITTED" "customs_admin" "password123" "Submitted Declarations"
test_endpoint "GET" "/customs/declarations?status=CLEARED" "customs_admin" "password123" "Cleared Declarations"
test_endpoint "GET" "/customs/permit-ready" "customs_admin" "password123" "Permit Ready"
test_endpoint "GET" "/audit/portal/recent?limit=10" "customs_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 4: SHIPPING ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚢 PORTAL 4: SHIPPING (Shipping & Logistics)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/shipping/dashboard" "shipping_admin" "password123" "Dashboard"
test_endpoint "GET" "/shipments" "shipping_admin" "password123" "Shipments List"
test_endpoint "GET" "/shipments?status=PENDING" "shipping_admin" "password123" "Pending Shipments"
test_endpoint "GET" "/shipments?status=IN_TRANSIT" "shipping_admin" "password123" "In-Transit Shipments"
test_endpoint "GET" "/shipments?status=DELIVERED" "shipping_admin" "password123" "Delivered Shipments"
test_endpoint "GET" "/audit/portal/recent?limit=10" "shipping_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 5: BANKS ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏦 PORTAL 5: BANKS (Banking & Payments)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/banks/dashboard" "bank_admin" "password123" "Dashboard"
test_endpoint "GET" "/payments" "bank_admin" "password123" "Payments List"
test_endpoint "GET" "/payments?status=PENDING" "bank_admin" "password123" "Pending Payments"
test_endpoint "GET" "/payments?status=COMPLETED" "bank_admin" "password123" "Completed Payments"
test_endpoint "GET" "/swift" "bank_admin" "password123" "SWIFT Transactions"
test_endpoint "GET" "/audit/portal/recent?limit=10" "bank_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 6: NBE ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏛️  PORTAL 6: NBE (National Bank of Ethiopia)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/nbe/dashboard" "nbe_admin" "password123" "Dashboard"
test_endpoint "GET" "/forex" "nbe_admin" "password123" "Forex Allocations"
test_endpoint "GET" "/forex?status=PENDING" "nbe_admin" "password123" "Pending Forex"
test_endpoint "GET" "/forex?status=APPROVED" "nbe_admin" "password123" "Approved Forex"
test_endpoint "GET" "/analytics/forex-overview" "nbe_admin" "password123" "Forex Analytics"
test_endpoint "GET" "/audit/portal/recent?limit=10" "nbe_admin" "password123" "Audit Trail"
echo ""

# ==================== PORTAL 7: QUALITY ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 PORTAL 7: QUALITY (Quality Control & Inspections)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/quality/dashboard" "ecta_admin" "password123" "Dashboard"
test_endpoint "GET" "/quality/inspections" "ecta_admin" "password123" "Inspections List"
test_endpoint "GET" "/quality/inspections?status=SCHEDULED" "ecta_admin" "password123" "Scheduled Inspections"
test_endpoint "GET" "/quality/inspections?status=COMPLETED" "ecta_admin" "password123" "Completed Inspections"
test_endpoint "GET" "/quality/certificates" "ecta_admin" "password123" "Certificates"
test_endpoint "GET" "/audit/portal/recent?limit=10" "ecta_admin" "password123" "Audit Trail"
echo ""

# ==================== SUMMARY ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Legend:"
echo "  ✅ = Endpoint working (HTTP 200)"
echo "  ⚠️  = Warning (404 Not Found - may indicate no data)"
echo "  ❌ = Error (5xx or other unexpected status)"
echo ""
echo "All 7 portals tested:"
echo "  1. ECTA - Ethiopian Coffee & Tea Authority"
echo "  2. ECX - Ethiopia Commodity Exchange"
echo "  3. CUSTOMS - Customs Authority"
echo "  4. SHIPPING - Shipping & Logistics"
echo "  5. BANKS - Banking & Payments"
echo "  6. NBE - National Bank of Ethiopia"
echo "  7. QUALITY - Quality Control & Inspections"
echo ""
