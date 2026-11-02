#!/bin/bash

echo "=========================================="
echo "Ethiopian Coffee Export Portal"
echo "FINAL SYSTEM VERIFICATION"
echo "=========================================="
echo ""

API_URL="http://localhost:3001/api/v1"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    
    echo -n "Testing: $name ... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Response: $response" | head -n 3
        return 1
    fi
}

echo "=== BANKS PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/banks?portalId=test-bank" "totalLCs"
test_endpoint "LCs" "$API_URL/banking/lcs?portalId=test-bank" "lcNumber"
test_endpoint "Forex Allocations" "$API_URL/forex/allocations?portalId=test-bank" "allocationId"
test_endpoint "Payment Methods" "$API_URL/banking/payment-methods?portalId=test-bank" "paymentMethodId"

echo ""
echo "=== NBE PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/nbe?portalId=test-nbe" "totalForexRequests"
test_endpoint "Forex Requests" "$API_URL/forex?portalId=test-nbe" "allocationId"
test_endpoint "Exchange Rates" "$API_URL/exchange-rates" "currency"
test_endpoint "Retention Policy" "$API_URL/retention/current?portalId=test-nbe" "retentionPercentage"

echo ""
echo "=== EXPORTERS PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/exporters?portalId=test-admin" "totalContracts"
test_endpoint "Pending Contracts" "$API_URL/contracts/pending?portalId=test-admin" "contractId"
test_endpoint "Approved Contracts" "$API_URL/contracts/approved?portalId=test-admin" "contractId"
test_endpoint "Quality Inspections" "$API_URL/quality/inspections?portalId=test-admin" "inspectionId"

echo ""
echo "=== ECTA PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/ecta?portalId=test-ecta" "totalContracts"
test_endpoint "Contracts Verification" "$API_URL/contracts?portalId=test-ecta" "contractId"

echo ""
echo "=== ECX PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/ecx?portalId=test-ecx" "totalWarehouseLots"
test_endpoint "Warehouse Lots" "$API_URL/ecx/warehouse?portalId=test-ecx" "lotId"
test_endpoint "Market Prices" "$API_URL/market?portalId=test-ecx" "grade"

echo ""
echo "=== CUSTOMS PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/customs?portalId=test-customs" "totalShipments"
test_endpoint "Shipments" "$API_URL/shipments?portalId=test-customs" "shipmentId"
test_endpoint "Documents" "$API_URL/documents?entityType=CUSTOMS_DECLARATION" "documentId"

echo ""
echo "=== SHIPPING PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/shipping?portalId=test-shipping" "totalShipments"
test_endpoint "Shipments Tracking" "$API_URL/shipments?portalId=test-shipping" "shipmentId"

echo ""
echo "=== QUALITY CONTROL PORTAL ==="
test_endpoint "Dashboard" "$API_URL/portals/quality?portalId=test-quality" "totalInspections"
test_endpoint "Inspections" "$API_URL/quality/inspections?portalId=test-quality" "inspectionId"
test_endpoint "Document Verification" "$API_URL/documents?entityType=QUALITY_INSPECTION" "documentId"

echo ""
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
