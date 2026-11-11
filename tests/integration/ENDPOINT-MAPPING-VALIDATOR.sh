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
  # NOTE (2026-11-11): was "/analytics/exports" — no such route; the export
  # report endpoint is GET /analytics/export-report (analytics.ts:157).
  ["Export reports"]="/analytics/export-report"
  ["Audit trail"]="/audit/portal/recent"
  
  # ECTA Portal
  # NOTE (2026-11-11): was "/exporters/applications" — the list lives only at
  # GET /exporters/exporter-applications (exporters.ts:27), which supports
  # ?status=; there is no /exporters/applications route.
  ["Pending applications"]="/exporters/exporter-applications?status=pending"
  ["Approved exporters"]="/exporters/exporter-applications?status=approved"
  ["Sales contracts"]="/contracts"
  ["All inspections"]="/quality/inspections"
  ["Inspections PENDING"]="/quality/inspections?status=PENDING"
  ["Inspections SCHEDULED"]="/quality/inspections?status=SCHEDULED"
  ["Inspections UNDER_REVIEW"]="/quality/inspections?status=UNDER_REVIEW"
  ["Inspections APPROVED"]="/quality/inspections?status=APPROVED"
  ["Inspections REJECTED"]="/quality/inspections?status=REJECTED"
  ["License renewals"]="/exporters/renewals"
  # NOTE (2026-11-11): was "/analytics/ecta" — analytics.ts has no /ecta
  # route; the ECTA portal stats live at GET /stats/ecta-portal (stats.ts:416).
  ["ECTA analytics"]="/stats/ecta-portal"
  ["Pre-shipment inspections"]="/quality/pre-shipment"
  ["ECTA users"]="/users?organization=ECTA"
  ["ECTA audit trail"]="/audit/portal/recent"
  ["Post-delivery audits"]="/quality/post-delivery"
  
  # Banks Portal
  ["LC (Letter of Credit)"]="/banking/lc?paymentMethod=LC"
  ["CAD (Documentary Collection)"]="/banking/lc?paymentMethod=CAD"
  ["ADVANCE (Advance Payment)"]="/banking/lc?paymentMethod=ADVANCE"
  ["CONSIGNMENT"]="/banking/lc?paymentMethod=CONSIGNMENT"
  # NOTE (2026-11-11): was "/banking/lc/pending-examination" — no such route.
  # The closest real pending-work queue is GET
  # /banking/lc/discrepancies/pending (banking.ts:3756).
  ["LC document examination"]="/banking/lc/discrepancies/pending"
  ["Pending payment releases"]="/payments/pending-release"
  # NOTE (2026-11-11): was "/banking/lc/discrepancies" — the bare path would
  # match GET /lc/:lcID with lcID="discrepancies"; the real queue is GET
  # /banking/lc/discrepancies/pending (banking.ts:3756).
  ["LC discrepancies"]="/banking/lc/discrepancies/pending"
  ["Forex allocations (Banks)"]="/forex"
  ["LC settlements"]="/banking/lc?status=SETTLED"
  ["SWIFT messages"]="/swift/messages"
  # NOTE (2026-11-11): was "/analytics/banking" — analytics.ts has no
  # /banking route; the bank portal stats live at GET /stats/bank-portal
  # (stats.ts:49).
  ["Banking analytics"]="/stats/bank-portal"
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
  # NOTE (2026-11-11): was "/analytics/nbe" — analytics.ts has no /nbe route;
  # the NBE portal stats live at GET /stats/nbe-portal (stats.ts:316).
  ["Analytics Overview"]="/stats/nbe-portal"
  # NOTE (2026-11-11): was "/analytics/trends" — analytics.ts has no /trends
  # route; the closest real analytics endpoint is GET /analytics/breakdown
  # (analytics.ts:225).
  ["Analytics Trends"]="/analytics/breakdown"
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
