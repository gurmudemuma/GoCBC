#!/bin/bash

################################################################################
# Endpoint Mapping Validator
# Maps all 73 validated backend endpoints to their frontend usage
################################################################################

API_BASE="http://localhost:3001/api/v1"

# All 73 validated endpoints from portal tab validation test
declare -A ENDPOINTS=(
  # Exporter Portal
  ["Dashboard stats"]="/analytics/dashboard"
  ["Contracts list"]="/contracts"
  ["Forex allocations"]="/forex"
  ["LC requests"]="/banking/lc"
  ["Shipments list"]="/shipments"
  ["Customs declarations"]="/customs/declarations"
  ["Payments list"]="/payments"
  ["Export reports"]="/analytics/exports"
  ["Audit trail"]="/audit/portal/recent"
  
  # ECTA Portal
  ["Pending applications"]="/exporters/applications?status=pending"
  ["Approved exporters"]="/exporters/applications?status=approved"
  ["Sales contracts"]="/contracts"
  ["All inspections"]="/quality/inspections"
  ["Inspections PENDING"]="/quality/inspections?status=PENDING"
  ["Inspections SCHEDULED"]="/quality/inspections?status=SCHEDULED"
  ["Inspections UNDER_REVIEW"]="/quality/inspections?status=UNDER_REVIEW"
  ["Inspections APPROVED"]="/quality/inspections?status=APPROVED"
  ["Inspections REJECTED"]="/quality/inspections?status=REJECTED"
  ["License renewals"]="/exporters/renewals"
  ["ECTA analytics"]="/analytics/ecta"
  ["Pre-shipment inspections"]="/quality/pre-shipment"
  ["ECTA users"]="/users?organization=ECTA"
  ["ECTA audit trail"]="/audit/portal/recent"
  ["Post-delivery audits"]="/quality/post-delivery"
  
  # Banks Portal
  ["LC (Letter of Credit)"]="/banking/lc?paymentMethod=LC"
  ["CAD (Documentary Collection)"]="/banking/lc?paymentMethod=CAD"
  ["ADVANCE (Advance Payment)"]="/banking/lc?paymentMethod=ADVANCE"
  ["CONSIGNMENT"]="/banking/lc?paymentMethod=CONSIGNMENT"
  ["LC document examination"]="/banking/lc/pending-examination"
  ["Pending payment releases"]="/payments/pending-release"
  ["LC discrepancies"]="/banking/lc/discrepancies"
  ["Forex allocations (Banks)"]="/forex"
  ["LC settlements"]="/banking/lc?status=SETTLED"
  ["SWIFT messages"]="/swift/messages"
  ["Banking analytics"]="/analytics/banking"
  ["Bank users"]="/users?organization=BANK"
  ["Bank audit trail"]="/audit/portal/recent"
  
  # NBE Portal
  ["All Forex"]="/forex"
  ["Forex Allocated"]="/forex?status=ALLOCATED"
  ["Forex Requested"]="/forex?status=REQUESTED"
  ["Exchange rates"]="/exchange-rates"
  ["SWIFT All Messages"]="/swift/messages"
  ["SWIFT Analytics & Charts"]="/swift/analytics"
  ["SWIFT Compliance Alerts"]="/swift/messages?priority=HIGH"
  ["Forex repatriation"]="/repatriation"
  ["Policy & compliance"]="/compliance"
  ["Analytics Overview"]="/analytics/nbe"
  ["Analytics Trends"]="/analytics/trends"
  ["Analytics Breakdown"]="/analytics/breakdown"
  ["NBE users"]="/users?organization=NBE"
  ["NBE audit trail"]="/audit/portal/recent"
  
  # Customs Portal
  ["Submitted declarations"]="/customs/declarations?status=SUBMITTED"
  ["Inspecting declarations"]="/customs/declarations?status=INSPECTING"
  ["Under review declarations"]="/customs/declarations?status=UNDER_REVIEW"
  ["Cleared declarations"]="/customs/declarations?status=CLEARED"
  ["Rejected declarations"]="/customs/declarations?status=REJECTED"
  ["Border crossing"]="/bordercrossing"
  ["Customs users"]="/users?organization=CUSTOMS"
  ["Customs audit trail"]="/audit/portal/recent"
  
  # Shipping Portal
  ["Customs cleared"]="/shipments?status=CUSTOMS_CLEARED"
  ["Land transport"]="/shipments?status=LAND_TRANSPORT"
  ["Port arrived"]="/shipments?status=PORT_ARRIVED"
  ["Container stuffed"]="/shipments?status=CONTAINER_STUFFED"
  ["Vessel loaded"]="/shipments?status=VESSEL_LOADED"
  ["Departed"]="/shipments?status=DEPARTED"
  ["In transit"]="/shipments?status=IN_TRANSIT"
  ["Destination arrived"]="/shipments?status=DESTINATION_ARRIVED"
  ["Delivered"]="/shipments?status=DELIVERED"
  ["Shipping users"]="/users?organization=SHIPPING"
  
  # ECX Portal
  ["Coffee lots"]="/ecx/lots"
  ["Market prices"]="/market/prices"
  ["Grading standards"]="/ecx/grading-standards"
  ["ECX users"]="/users?organization=ECX"
)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ ENDPOINT-TO-FRONTEND MAPPING VALIDATION                        ║"
echo "║ Verifying all 73 backend endpoints are used by frontend        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TOTAL=0
FOUND=0
NOT_FOUND=0

UI_DIR="/home/guda/GoCBC/ui/src"

for desc in "${!ENDPOINTS[@]}"; do
  endpoint="${ENDPOINTS[$desc]}"
  TOTAL=$((TOTAL + 1))
  
  # Remove query parameters for search
  endpoint_path=$(echo "$endpoint" | cut -d'?' -f1)
  
  # Search for the endpoint in frontend files
  # Look for various patterns: apiFetch('/endpoint'), axios.get('/endpoint'), etc.
  if grep -r -q "$endpoint_path" "$UI_DIR" 2>/dev/null; then
    echo "✓ $desc"
    echo "  Endpoint: $endpoint"
    echo "  Found in frontend"
    FOUND=$((FOUND + 1))
  else
    echo "✗ $desc"
    echo "  Endpoint: $endpoint"
    echo "  NOT FOUND in frontend code"
    NOT_FOUND=$((NOT_FOUND + 1))
  fi
  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo "Total endpoints: $TOTAL"
echo "✓ Found in frontend: $FOUND"
echo "✗ Not found: $NOT_FOUND"
echo "Coverage: $(( FOUND * 100 / TOTAL ))%"
echo ""

if [ $NOT_FOUND -eq 0 ]; then
  echo "🎉 ALL ENDPOINTS ARE INTEGRATED WITH FRONTEND!"
else
  echo "⚠️  Some endpoints may not be used by frontend components"
  echo "   This could indicate:"
  echo "   - Endpoints are called with different patterns"
  echo "   - Endpoints are accessed via proxy/wrapper functions"
  echo "   - New endpoints that need frontend integration"
fi
