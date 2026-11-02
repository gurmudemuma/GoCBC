#!/bin/bash

# Final comprehensive test of all portal tabs
# Continues even on errors and generates full report

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "Testing ALL Portal Tabs..."
echo ""

# Banks Portal
echo "=== BANKS PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/banks" | jq '{success, dataCount: (.data | length), totalLCs: .data.totalLCs}' > /tmp/banks-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lcs" | jq '{success, count: (.data | length)}' > /tmp/banks-lcs.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/retention/policy" | jq '{success, retention: .data.retentionPercentage}' > /tmp/banks-retention.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/retention-payments" | jq '{success, count: (.data | length)}' > /tmp/banks-retention-payments.json 2>&1

# NBE Portal
echo "=== NBE PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/nbe" | jq '{success}' > /tmp/nbe-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex/allocations" | jq '{success, count: (.data | length)}' > /tmp/nbe-forex.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/exchange-rates" | jq '{success, count: (.data | length)}' > /tmp/nbe-rates.json 2>&1

# Exporters Portal
echo "=== EXPORTERS PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/exporters/test-admin" | jq '{success}' > /tmp/exporters-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/contracts" | jq '{success, count: (.data | length)}' > /tmp/exporters-contracts.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/shipments" | jq '{success, count: (.data | length)}' > /tmp/exporters-shipments.json 2>&1

# ECTA Portal
echo "=== ECTA PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/ecta" | jq '{success}' > /tmp/ecta-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/applications" | jq '{success, count: (.data | length)}' > /tmp/ecta-applications.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/quality/inspections" | jq '{success, count: (.data | length)}' > /tmp/ecta-quality.json 2>&1

# ECX Portal
echo "=== ECX PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/ecx" | jq '{success}' > /tmp/ecx-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/warehouse" | jq '{success, count: (.data | length)}' > /tmp/ecx-warehouse.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/market" | jq '{success, priceCount: (.data.prices | length)}' > /tmp/ecx-market.json 2>&1

# Customs Portal
echo "=== CUSTOMS PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/customs" | jq '{success}' > /tmp/customs-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/customs/clearance" | jq '{success, count: (.data | length)}' > /tmp/customs-clearance.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/customs/document-verification" | jq '{success, count: (.data | length)}' > /tmp/customs-docs.json 2>&1

# Shipping Portal
echo "=== SHIPPING PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/shipping" | jq '{success}' > /tmp/shipping-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/shipping/shipments" | jq '{success, count: (.data | length)}' > /tmp/shipping-shipments.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/land-transport" | jq '{success}' > /tmp/shipping-transport.json 2>&1

# Quality & Certificates
echo "=== QUALITY & CERTIFICATES ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/certificates" | jq '{success, count: (.data | length)}' > /tmp/certificates.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/documents" | jq '{success, count: (.data | length)}' > /tmp/documents.json 2>&1

echo ""
echo "Results Summary:"
echo "================"

# Print all results
for file in /tmp/banks-*.json /tmp/nbe-*.json /tmp/exporters-*.json /tmp/ecta-*.json /tmp/ecx-*.json /tmp/customs-*.json /tmp/shipping-*.json /tmp/certificates.json /tmp/documents.json; do
    if [ -f "$file" ]; then
        name=$(basename "$file" .json)
        echo "$name:"
        cat "$file"
        echo ""
    fi
done

echo "Test complete! Check files in /tmp/"
