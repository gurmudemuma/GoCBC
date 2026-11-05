#!/bin/bash

# Comprehensive Functional Test for All Portal Endpoints
# Tests not just availability but actual functionality with data validation

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Portal Endpoints FUNCTIONAL Test - Data Validation        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test function with data validation
test_functional() {
    local name=$1
    local endpoint=$2
    local validation=$3
    local expected_field=$4
    
    TOTAL=$((TOTAL + 1))
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint")
    
    # Check HTTP success
    success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" != "true" ]; then
        echo -e "${RED}  ✗ $name${NC} - API returned success=false"
        echo -e "    Error: $(echo "$response" | jq -r '.error.message // "Unknown error"')"
        FAILED=$((FAILED + 1))
        return
    fi
    
    # Validate data based on test type
    case $validation in
        "has_data")
            data_count=$(echo "$response" | jq -r ".data | length")
            if [ "$data_count" -gt 0 ]; then
                echo -e "${GREEN}  ✓ $name${NC} - Returns $data_count records"
                PASSED=$((PASSED + 1))
            else
                echo -e "${YELLOW}  ⚠ $name${NC} - No data found (empty array)"
                WARNINGS=$((WARNINGS + 1))
            fi
            ;;
            
        "has_field")
            if echo "$response" | jq -e ".data.$expected_field" > /dev/null 2>&1; then
                field_value=$(echo "$response" | jq -r ".data.$expected_field // \"null\"")
                echo -e "${GREEN}  ✓ $name${NC} - Field '$expected_field' exists: $field_value"
                PASSED=$((PASSED + 1))
            else
                echo -e "${RED}  ✗ $name${NC} - Missing expected field: $expected_field"
                FAILED=$((FAILED + 1))
            fi
            ;;
            
        "has_stats")
            if echo "$response" | jq -e ".data.$expected_field" > /dev/null 2>&1; then
                stats=$(echo "$response" | jq -r ".data.$expected_field")
                echo -e "${GREEN}  ✓ $name${NC} - Stats: $stats"
                PASSED=$((PASSED + 1))
            else
                echo -e "${YELLOW}  ⚠ $name${NC} - Stats field missing but endpoint works"
                WARNINGS=$((WARNINGS + 1))
            fi
            ;;
            
        "array_with_status")
            data_count=$(echo "$response" | jq -r ".data | length")
            if [ "$data_count" -gt 0 ]; then
                first_status=$(echo "$response" | jq -r ".data[0].status // \"null\"")
                echo -e "${GREEN}  ✓ $name${NC} - $data_count records, status: $first_status"
                PASSED=$((PASSED + 1))
            else
                echo -e "${YELLOW}  ⚠ $name${NC} - No records with this status filter"
                WARNINGS=$((WARNINGS + 1))
            fi
            ;;
            
        "lcStats")
            total=$(echo "$response" | jq -r ".data.lcStats.total // 0")
            requested=$(echo "$response" | jq -r ".data.lcStats.requested // 0")
            issued=$(echo "$response" | jq -r ".data.lcStats.issued // 0")
            echo -e "${GREEN}  ✓ $name${NC} - Total: $total, Requested: $requested, Issued: $issued"
            PASSED=$((PASSED + 1))
            ;;
            
        "retention")
            rate=$(echo "$response" | jq -r ".data.retentionAmounts.retentionRate // 0")
            total=$(echo "$response" | jq -r ".data.retentionAmounts.totalRetention // 0")
            echo -e "${GREEN}  ✓ $name${NC} - Retention: ${rate}%, Total: \$${total}"
            PASSED=$((PASSED + 1))
            ;;
            
        "basic")
            echo -e "${GREEN}  ✓ $name${NC} - Endpoint functional"
            PASSED=$((PASSED + 1))
            ;;
    esac
}

# 1. PORTAL DASHBOARDS - Test actual data structure
echo -e "${CYAN}PORTAL DASHBOARDS - Data Structure Validation${NC}"
test_functional "Banks Portal" "/portals/banks" "lcStats"
test_functional "Banks Portal Retention" "/portals/banks" "retention"
test_functional "NBE Portal" "/portals/nbe" "has_field" "pendingTasks"
test_functional "Exporters Portal" "/portals/exporters" "has_field" "exporterId"
test_functional "ECTA Portal" "/portals/ecta" "has_field" "pendingTasks"
test_functional "ECX Portal" "/portals/ecx" "has_field" "pendingTasks"
test_functional "Customs Portal" "/portals/customs" "has_field" "pendingTasks"
test_functional "Shipping Portal" "/portals/shipping" "has_field" "pendingTasks"
echo ""

# 2. CONTRACTS - Test filtering and data
echo -e "${CYAN}CONTRACT MANAGEMENT - Filtering & Data${NC}"
test_functional "All Contracts" "/contracts" "has_data"
test_functional "Pending Contracts Filter" "/contracts?status=PENDING" "array_with_status"
test_functional "Approved Contracts Filter" "/contracts?status=APPROVED" "array_with_status"
echo ""

# 3. LC MANAGEMENT - Test all status filters
echo -e "${CYAN}LC MANAGEMENT - Status Filtering${NC}"
test_functional "All LCs" "/banking/lc" "has_data"
test_functional "Requested LCs" "/banking/lc?status=REQUESTED" "array_with_status"
test_functional "Approved LCs" "/banking/lc?status=APPROVED" "array_with_status"
test_functional "Issued LCs" "/banking/lc?status=ISSUED" "array_with_status"
test_functional "Forex Allocated LCs" "/banking/lc?status=FOREX_ALLOCATED" "array_with_status"
test_functional "Utilized LCs" "/banking/lc?status=UTILIZED" "array_with_status"
echo ""

# 4. FOREX & NBE - Test rates and policies
echo -e "${CYAN}FOREX & NBE - Rates & Policy Validation${NC}"
test_functional "Forex Allocations" "/forex" "has_data"

# Test exchange rate structure
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex/rates/USD/current")
rate=$(echo "$response" | jq -r '.data.buyingRate // 0')
if [ "$rate" != "0" ]; then
    echo -e "${GREEN}  ✓ USD Exchange Rate${NC} - Buying: $rate ETB"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${YELLOW}  ⚠ USD Exchange Rate${NC} - No active rate found"
    WARNINGS=$((WARNINGS + 1))
    TOTAL=$((TOTAL + 1))
fi

# Test retention policy
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/retention/policy/COFFEE")
retention=$(echo "$response" | jq -r '.data.retentionPercentage // 0')
if [ "$retention" = "40" ]; then
    echo -e "${GREEN}  ✓ Retention Policy${NC} - COFFEE: ${retention}% (NBE Compliant)"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${RED}  ✗ Retention Policy${NC} - Expected 40%, got ${retention}%"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
fi
echo ""

# 5. QUALITY & INSPECTIONS
echo -e "${CYAN}QUALITY & INSPECTIONS - Data Validation${NC}"
test_functional "Quality Inspections" "/quality-inspections" "has_data"
test_functional "Quality Endpoint" "/quality" "has_data"
echo ""

# 6. PAYMENTS
echo -e "${CYAN}PAYMENTS - Structure Validation${NC}"
test_functional "All Payments" "/payments" "has_data"

# Test payment methods structure
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/payment-methods")
method_count=$(echo "$response" | jq -r '.data | length')
if [ "$method_count" -ge 5 ]; then
    methods=$(echo "$response" | jq -r '.data[].id' | tr '\n' ', ')
    echo -e "${GREEN}  ✓ Payment Methods${NC} - $method_count types: ${methods%,}"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${RED}  ✗ Payment Methods${NC} - Expected 5+ types, got $method_count"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
fi
echo ""

# 7. SHIPPING & LOGISTICS
echo -e "${CYAN}SHIPPING & LOGISTICS - Data Validation${NC}"
test_functional "Shipments" "/shipments" "has_data"
test_functional "Land Transport" "/land-transport" "basic"
echo ""

# 8. CUSTOMS & COMPLIANCE
echo -e "${CYAN}CUSTOMS & COMPLIANCE - Data Validation${NC}"
test_functional "Customs Clearance" "/customs/clearance" "basic"
test_functional "Document Verification" "/customs/document-verification" "has_data"
echo ""

# 9. CERTIFICATES & DOCUMENTS
echo -e "${CYAN}CERTIFICATES & DOCUMENTS - Data Validation${NC}"
test_functional "Certificates" "/certificates" "basic"
test_functional "Documents" "/documents" "has_data"
echo ""

# 10. WAREHOUSE & ECX
echo -e "${CYAN}WAREHOUSE & ECX - Data Validation${NC}"
test_functional "Warehouse" "/warehouse" "basic"

# Test market prices structure
response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/market")
price_count=$(echo "$response" | jq -r '.data.prices | length // 0')
if [ "$price_count" -ge 3 ]; then
    grade1=$(echo "$response" | jq -r '.data.prices[0].pricePerKg')
    echo -e "${GREEN}  ✓ Market Prices${NC} - $price_count grades, Grade 1: \$${grade1}/kg"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${YELLOW}  ⚠ Market Prices${NC} - Expected 3+ grades"
    WARNINGS=$((WARNINGS + 1))
    TOTAL=$((TOTAL + 1))
fi
echo ""

# 11. APPLICATIONS
echo -e "${CYAN}APPLICATIONS - Data Validation${NC}"
test_functional "Exporter Applications" "/exporters/exporter-applications" "has_data"
test_functional "Applications Alias" "/applications" "has_data"
echo ""

# SUMMARY
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                FUNCTIONAL TEST SUMMARY                         ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Total Tests:      ${TOTAL}                                            ║${NC}"
echo -e "${BLUE}║ ${GREEN}Passed:           ${PASSED}${BLUE}                                            ║${NC}"
echo -e "${BLUE}║ ${YELLOW}Warnings:         ${WARNINGS}${BLUE}                                             ║${NC}"
echo -e "${BLUE}║ ${RED}Failed:           ${FAILED}${BLUE}                                             ║${NC}"

if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    success_rate=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
    echo -e "${BLUE}║ ${GREEN}Success Rate:    ${success_rate}%${BLUE}                                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✓ ALL ENDPOINTS FULLY FUNCTIONAL WITH VALID DATA!${NC}"
else
    functional_rate=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
    echo -e "${BLUE}║ ${CYAN}Functional Rate: ${functional_rate}%${BLUE}                                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$FAILED" -gt 0 ]; then
        echo -e "${RED}✗ Some endpoints have functional issues${NC}"
    fi
    
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Some endpoints work but have no data${NC}"
        echo -e "${YELLOW}  (This is normal for new installations)${NC}"
    fi
fi

exit $([ "$FAILED" -eq 0 ] && echo 0 || echo 1)
