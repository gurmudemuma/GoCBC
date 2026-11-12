#!/bin/bash

################################################################################
# Frontend-Backend Integration Analysis Script
# Analyzes all API calls made by frontend portal components and validates
# them against backend endpoints
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
UI_DIR="$PROJECT_ROOT/ui"
API_DIR="$PROJECT_ROOT/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ FRONTEND-BACKEND INTEGRATION ANALYSIS                          ║"
echo "║ Analyzing all portal components for API endpoint usage         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Create output directory
mkdir -p "$PROJECT_ROOT/test/integration/results"
REPORT_FILE="$PROJECT_ROOT/test/integration/results/integration-analysis-$(date +%Y%m%d-%H%M%S).txt"

echo "Report will be saved to: $REPORT_FILE"
echo ""

{
  echo "FRONTEND-BACKEND INTEGRATION ANALYSIS REPORT"
  echo "Generated: $(date)"
  echo "=============================================="
  echo ""

  # Analyze each portal
  PORTALS=(
    "ExporterPortal"
    "ECTAPortal"
    "BanksPortal"
    "NBEPortal"
    "CustomsPortal"
    "ShippingPortal"
    "ECXPortal"
  )

  for portal in "${PORTALS[@]}"; do
    echo "═══════════════════════════════════════════════════════════════"
    echo "PORTAL: $portal"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    PORTAL_FILE="$UI_DIR/src/components/portals/${portal}.tsx"
    
    if [ ! -f "$PORTAL_FILE" ]; then
      echo "⚠️  Portal file not found: $PORTAL_FILE"
      echo ""
      continue
    fi

    # Extract API calls from the portal file
    echo "API Endpoints Used:"
    echo "-------------------"
    
    # Search for axios.get, axios.post, axios.put, axios.delete calls
    grep -oE "(axios\.(get|post|put|delete|patch)\(['\`\"][^'\`\"]+)" "$PORTAL_FILE" 2>/dev/null | \
      sed 's/axios\.\(get\|post\|put\|delete\|patch\)(//' | \
      sed "s/[\`'\"]//g" | \
      sort -u || echo "No direct axios calls found"
    
    echo ""
    
    # Search for API_BASE_URL concatenations
    echo "API_BASE_URL Concatenations:"
    echo "----------------------------"
    grep -oE '\$\{API_BASE_URL\}[^'\`\"]+' "$PORTAL_FILE" 2>/dev/null | \
      sed 's/\${API_BASE_URL}//' | \
      sed 's/[`'\''"{}]//g' | \
      sort -u || echo "No API_BASE_URL concatenations found"
    
    echo ""
    
    # Search for fetch() calls
    echo "Fetch API Calls:"
    echo "----------------"
    grep -oE "fetch\(['\`\"][^'\`\"]+)" "$PORTAL_FILE" 2>/dev/null | \
      sed 's/fetch(//' | \
      sed "s/[\`'\"]//g" | \
      sort -u || echo "No fetch calls found"
    
    echo ""
    echo ""
  done

  echo "═══════════════════════════════════════════════════════════════"
  echo "UTILITY API METHODS"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  
  echo "Methods defined in ui/src/utils/api.ts:"
  echo "---------------------------------------"
  grep -E "async \w+\(.*\): Promise" "$UI_DIR/src/utils/api.ts" 2>/dev/null | \
    grep -v "^  async (get|post|put|delete|patch)\(" | \
    sed 's/^  async /- /' | \
    sed 's/(.*/()/' || echo "No API methods found"
  
  echo ""
  echo ""

  echo "═══════════════════════════════════════════════════════════════"
  echo "BACKEND ROUTE ANALYSIS"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  
  echo "Available API Routes (from backend):"
  echo "------------------------------------"
  
  # Analyze backend routes
  for route_file in "$API_DIR/src/routes"/*.ts; do
    if [ -f "$route_file" ]; then
      route_name=$(basename "$route_file" .ts)
      echo ""
      echo "Routes in $route_name.ts:"
      grep -oE "router\.(get|post|put|delete|patch)\(['\`\"][^'\`\"]+)" "$route_file" 2>/dev/null | \
        sed 's/router\.\(get\|post\|put\|delete\|patch\)(//' | \
        sed "s/[\`'\"]//g" | \
        sed "s/^/  /" || echo "  No routes found"
    fi
  done
  
  echo ""
  echo ""

  echo "═══════════════════════════════════════════════════════════════"
  echo "SUMMARY"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "Analysis complete. Review the report above for:"
  echo "1. All API endpoints called by frontend portals"
  echo "2. Backend routes defined in API"
  echo "3. Potential mismatches or missing endpoints"
  echo ""
  echo "Next steps:"
  echo "- Compare frontend calls with backend routes"
  echo "- Identify any 404 errors from missing endpoints"
  echo "- Verify data transformations match expectations"
  echo ""

} | tee "$REPORT_FILE"

echo -e "${GREEN}✅ Analysis complete! Report saved to:${NC}"
echo "   $REPORT_FILE"
echo ""
