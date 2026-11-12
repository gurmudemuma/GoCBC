#!/bin/bash

################################################################################
# Orphaned API Calls Checker
# Finds frontend API calls that don't have corresponding backend endpoints
################################################################################

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI_DIR="$PROJECT_ROOT/ui/src"
API_DIR="$PROJECT_ROOT/api/src"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ ORPHANED API CALLS CHECKER                                     ║"
echo "║ Finding frontend calls to non-existent backend endpoints       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Extract all API endpoint calls from frontend
echo "Step 1: Extracting all API calls from frontend..."
echo "─────────────────────────────────────────────────────────"

# Create temporary file for frontend calls
FRONTEND_CALLS=$(mktemp)

# Search for apiFetch, axios.get/post/put/delete, fetch() calls
grep -rh "apiFetch\|axios\.\(get\|post\|put\|delete\|patch\)\|fetch(" "$UI_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | \
  grep -oE "(['\`\"])/[a-zA-Z0-9/_-]+(\?[a-zA-Z0-9=&_-]+)?['\`\"]" | \
  sed 's/[`'\''"{}$]//g' | \
  sort -u > "$FRONTEND_CALLS"

echo "Found $(wc -l < "$FRONTEND_CALLS") unique API endpoint patterns"
echo ""

# Extract all backend routes
echo "Step 2: Extracting all backend route definitions..."
echo "─────────────────────────────────────────────────────────"

BACKEND_ROUTES=$(mktemp)

# Search for router.get/post/put/delete/patch definitions
for route_file in "$API_DIR/routes"/*.ts; do
  if [ -f "$route_file" ]; then
    grep -oE "router\.(get|post|put|delete|patch)\(['\`\"]([^'\`\"]+)" "$route_file" 2>/dev/null | \
      sed 's/router\.\(get\|post\|put\|delete\|patch\)(//' | \
      sed 's/[`'\''"()]//g' | \
      sed 's/^/\//' >> "$BACKEND_ROUTES"
  fi
done

# Also check server.ts for route registrations
if [ -f "$API_DIR/server.ts" ]; then
  grep -oE "apiV1\.use\(['\`\"]([^'\`\"]+)" "$API_DIR/server.ts" 2>/dev/null | \
    sed 's/apiV1\.use(//' | \
    sed 's/[`'\''"()]//g' | \
    sed 's/^/\//' >> "$BACKEND_ROUTES"
fi

sort -u "$BACKEND_ROUTES" > "${BACKEND_ROUTES}.sorted"
mv "${BACKEND_ROUTES}.sorted" "$BACKEND_ROUTES"

echo "Found $(wc -l < "$BACKEND_ROUTES") backend route definitions"
echo ""

# Compare and find orphans
echo "Step 3: Checking for orphaned calls..."
echo "─────────────────────────────────────────────────────────"
echo ""

ORPHANS_FOUND=0
VERIFIED=0

while IFS= read -r frontend_call; do
  # Clean the call for comparison
  endpoint=$(echo "$frontend_call" | cut -d'?' -f1)
  
  # Check if endpoint exists in backend (exact match or starts with match for dynamic routes)
  if grep -q "^$endpoint$" "$BACKEND_ROUTES" 2>/dev/null; then
    VERIFIED=$((VERIFIED + 1))
  else
    # Check for dynamic routes (e.g., /users/:id matches /users/123)
    found=false
    while IFS= read -r backend_route; do
      # Convert backend route pattern to regex (e.g., /users/:id -> /users/[^/]+)
      pattern=$(echo "$backend_route" | sed 's/:[a-zA-Z0-9_-]\+/[^\/]+/g')
      if echo "$endpoint" | grep -qE "^${pattern}$"; then
        found=true
        break
      fi
    done < "$BACKEND_ROUTES"
    
    if [ "$found" = false ]; then
      echo "⚠️  ORPHANED: $frontend_call"
      echo "   No matching backend route found"
      ORPHANS_FOUND=$((ORPHANS_FOUND + 1))
    else
      VERIFIED=$((VERIFIED + 1))
    fi
  fi
done < "$FRONTEND_CALLS"

# Cleanup
rm -f "$FRONTEND_CALLS" "$BACKEND_ROUTES"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo "Frontend API calls verified: $VERIFIED"
echo "Orphaned calls found: $ORPHANS_FOUND"
echo ""

if [ $ORPHANS_FOUND -eq 0 ]; then
  echo "✅ All frontend API calls have corresponding backend endpoints!"
else
  echo "⚠️  Found $ORPHANS_FOUND potential orphaned calls"
  echo ""
  echo "Note: Some 'orphaned' calls may be:"
  echo "  - External API calls (not to your backend)"
  echo "  - Proxy routes handled differently"
  echo "  - False positives from dynamic route matching"
  echo ""
  echo "Review each orphaned call to determine if it needs:"
  echo "  1. Backend endpoint implementation"
  echo "  2. Frontend code update to use correct endpoint"
  echo "  3. No action (external API, proxy, etc.)"
fi

exit $ORPHANS_FOUND
