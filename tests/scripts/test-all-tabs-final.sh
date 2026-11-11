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
# NOTE: the bare path /retention/policy needs a :commodityType; the policy
# endpoint is GET /retention/policy/:commodityType (retention.ts:85), which
# returns data.retentionPercentage (default 40).
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/retention/policy/COFFEE" | jq '{success, retention: .data.retentionPercentage}' > /tmp/banks-retention.json 2>&1
# NOTE: removed-unverifiable: there is no GET /banking/retention-payments and
# no retention-payments endpoint under /stats either (verified by grep
# 2026-11-11). Retention is exposed via GET /retention/policy/:commodityType
# above and GET /retention/:forexId/retention (retention.ts:275).
echo "banks-retention-payments: skipped — no such endpoint" 

# NBE Portal
echo "=== NBE PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/nbe" | jq '{success}' > /tmp/nbe-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex/allocations" | jq '{success, count: (.data | length)}' > /tmp/nbe-forex.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/exchange-rates" | jq '{success, count: (.data | length)}' > /tmp/nbe-rates.json 2>&1

# Exporters Portal
echo "=== EXPORTERS PORTAL ===" 
# NOTE: /portals/:portal only takes a single segment (portals.ts:63);
# /portals/exporters/test-admin would 404.
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/exporters" | jq '{success}' > /tmp/exporters-dashboard.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/contracts" | jq '{success, count: (.data | length)}' > /tmp/exporters-contracts.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/shipments" | jq '{success, count: (.data | length)}' > /tmp/exporters-shipments.json 2>&1

# ECTA Portal
echo "=== ECTA PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/ecta" | jq '{success}' > /tmp/ecta-dashboard.json 2>&1
# NOTE: the applications list is GET /exporters/exporter-applications
# (exporters.ts:27); the bare /applications mount returns the exporters list
# instead, which is the wrong resource.
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/exporters/exporter-applications" | jq '{success, count: (.data | length)}' > /tmp/ecta-applications.json 2>&1
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/quality/inspections" | jq '{success, count: (.data | length)}' > /tmp/ecta-quality.json 2>&1

# ECX Portal
echo "=== ECX PORTAL ===" 
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/portals/ecx" | jq '{success}' > /tmp/ecx-dashboard.json 2>&1
# NOTE: the bare /warehouse mount resolves to the ECX overview object
# (ecxRoutes GET /); the inventory list is GET /warehouse/inventory
# (warehouse.ts:16).
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/warehouse/inventory" | jq '{success, count: (.data | length)}' > /tmp/ecx-warehouse.json 2>&1
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
# NOTE: the bare /certificates mount resolves to the quality-inspections
# list (qualityRoutes GET / is mounted first); the phytosanitary list is
# GET /certificates/phyto (certificates.ts:16) and the origin list is
# GET /certificates/origin (certificates.ts:87).
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/certificates/phyto" | jq '{success, count: (.data | length)}' > /tmp/certificates.json 2>&1
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
