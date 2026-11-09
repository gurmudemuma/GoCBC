#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     COMPREHENSIVE CUSTOMS PORTAL TAB ENDPOINT TEST             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Login to get token
echo "🔐 Logging in as customs_admin..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local tab=$3
    local description=$4
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X $method \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "http://localhost:5000/api/v1${path}")
    
    if [ "$STATUS" = "200" ]; then
        echo "  ✅ $method $path -> $STATUS"
    elif [ "$STATUS" = "404" ]; then
        echo "  ⚠️  $method $path -> $STATUS (Not Found)"
    elif [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
        echo "  ⚠️  $method $path -> $STATUS (Bad Request - expected for empty POST)"
    else
        echo "  ❌ $method $path -> $STATUS"
    fi
}

# Get sample IDs from database
echo "📊 Fetching sample data IDs..."
DECL_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/v1/customs/declarations" | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['declarationId'] if data.get('data') and len(data['data']) > 0 else 'DECL-SAMPLE')" 2>/dev/null)

SHIP_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/v1/customs/declarations" | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['shipmentId'] if data.get('data') and len(data['data']) > 0 and data['data'][0].get('shipmentId') else 'SHIP-SAMPLE')" 2>/dev/null)

EXP_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/v1/customs/declarations" | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['exporterId'] if data.get('data') and len(data['data']) > 0 else 'EXP-SAMPLE')" 2>/dev/null)

echo "  Declaration ID: $DECL_ID"
echo "  Shipment ID: $SHIP_ID"
echo "  Exporter ID: $EXP_ID"
echo ""

# ==================== TAB 1: DASHBOARD ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TAB 1: DASHBOARD (Overview & KPI Cards)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/portals/customs/dashboard" "Dashboard" "Main dashboard data"
test_endpoint "GET" "/customs/declarations" "Dashboard" "All declarations list"
test_endpoint "GET" "/customs/declarations?status=SUBMITTED" "Dashboard" "Filter by status"
test_endpoint "GET" "/audit/portal/recent?limit=10" "Dashboard" "Recent audit logs"
echo ""

# ==================== TAB 2: DECLARATIONS LIST ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 TAB 2: DECLARATIONS LIST (All Customs Declarations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/customs/declarations" "Declarations" "List all declarations"
test_endpoint "GET" "/customs/declarations?status=SUBMITTED" "Declarations" "Filter SUBMITTED"
test_endpoint "GET" "/customs/declarations?status=INSPECTING" "Declarations" "Filter INSPECTING"
test_endpoint "GET" "/customs/declarations?status=UNDER_REVIEW" "Declarations" "Filter UNDER_REVIEW"
test_endpoint "GET" "/customs/declarations?status=CLEARED" "Declarations" "Filter CLEARED"
test_endpoint "GET" "/customs/declarations?status=REJECTED" "Declarations" "Filter REJECTED"
test_endpoint "GET" "/shipments/${SHIP_ID}" "Declarations" "Get shipment details"
test_endpoint "GET" "/users/by-exporter/${EXP_ID}" "Declarations" "Get exporter details"
echo ""

# ==================== TAB 3: CREATE DECLARATION ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "➕ TAB 3: CREATE DECLARATION (Submit New Declaration)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/customs/permit-ready" "Create" "Get permit-ready shipments"
test_endpoint "GET" "/quality/inspections?limit=100" "Create" "Get quality inspections"
test_endpoint "GET" "/quality/inspections/by-shipment/${SHIP_ID}" "Create" "Get shipment inspection"
test_endpoint "GET" "/documents/entity/SHIPMENT/${SHIP_ID}" "Create" "Get shipment documents"
test_endpoint "GET" "/contracts/CON-SAMPLE" "Create" "Get contract details"
test_endpoint "POST" "/customs/declaration/submit" "Create" "Submit declaration endpoint"
echo ""

# ==================== TAB 4: REVIEW & INSPECTION ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TAB 4: REVIEW & INSPECTION (Schedule/Complete Inspections)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/users" "Review" "Get customs officers list"
test_endpoint "GET" "/users/by-exporter/${EXP_ID}" "Review" "Auto-map exporter data"
test_endpoint "GET" "/shipments/${SHIP_ID}" "Review" "Auto-map shipment data"
test_endpoint "POST" "/customs/declaration/${DECL_ID}/review" "Review" "Schedule inspection"
test_endpoint "POST" "/customs/declaration/${DECL_ID}/complete-inspection" "Review" "Complete inspection"
echo ""

# ==================== TAB 5: DOCUMENTS ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 TAB 5: DOCUMENTS (View/Upload Declaration Documents)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/documents/entity/CUSTOMS_DECLARATION/${DECL_ID}" "Documents" "Get declaration documents"
test_endpoint "GET" "/documents/entity/SHIPMENT/${SHIP_ID}" "Documents" "Get shipment documents"
echo ""

# ==================== TAB 6: CLEARANCE ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TAB 6: CLEARANCE (Clear/Reject Declarations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "POST" "/customs/declaration/${DECL_ID}/clear" "Clearance" "Clear declaration"
test_endpoint "POST" "/customs/declaration/${DECL_ID}/reject" "Clearance" "Reject declaration"
echo ""

# ==================== TAB 7: AUDIT TRAIL ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📜 TAB 7: AUDIT TRAIL (Activity History)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/audit/portal/recent?limit=50" "Audit" "Recent portal activity"
test_endpoint "GET" "/audit/portal/recent?limit=1000" "Audit" "All audit records"
echo ""

# ==================== SUMMARY ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Legend:"
echo "  ✅ = Endpoint working (HTTP 200)"
echo "  ⚠️  = Warning (404 Not Found, or 400/422 for empty POST)"
echo "  ❌ = Error (5xx or unexpected status)"
echo ""
echo "Note: 404 errors for specific IDs are expected if data doesn't exist."
echo "      400/422 errors for POST endpoints mean the endpoint exists but"
echo "      requires proper request body data."
echo ""
