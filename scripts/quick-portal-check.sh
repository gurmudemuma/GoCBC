#!/bin/bash

# Quick Portal Data Loading Check
API_BASE="http://localhost:3001/api/v1"

echo "==================================="
echo "PORTAL DATA LOADING QUICK CHECK"
echo "==================================="
echo ""

# Login as admin
echo "1. Authenticating as admin..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "   ✓ Admin authenticated successfully"
  echo "   Token: ${TOKEN:0:30}..."
else
  echo "   ✗ Admin authentication failed"
  exit 1
fi

echo ""
echo "2. Checking portal endpoints..."
echo ""

# Exporter Portal
echo "EXPORTER PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/exporters/dashboard" | jq -r '.success' > /tmp/exp_dash.txt
EXP_DASH=$(cat /tmp/exp_dash.txt)
[ "$EXP_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/contracts?exporter=true" | jq -r '.success' > /tmp/exp_contracts.txt
EXP_CONTRACTS=$(cat /tmp/exp_contracts.txt)
[ "$EXP_CONTRACTS" = "true" ] && echo "  ✓ Contracts Tab" || echo "  ✗ Contracts Tab"

echo ""

# ECTA Portal  
echo "ECTA PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/ecta/dashboard" | jq -r '.success' > /tmp/ecta_dash.txt
ECTA_DASH=$(cat /tmp/ecta_dash.txt)
[ "$ECTA_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/exporters" | jq -r '.success' > /tmp/ecta_exp.txt
ECTA_EXP=$(cat /tmp/ecta_exp.txt)
[ "$ECTA_EXP" = "true" ] && echo "  ✓ Exporters Tab" || echo "  ✗ Exporters Tab"

echo ""

# ECX Portal
echo "ECX PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/ecx/dashboard" | jq -r '.success' > /tmp/ecx_dash.txt
ECX_DASH=$(cat /tmp/ecx_dash.txt)
[ "$ECX_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/contracts" | jq -r '.success' > /tmp/ecx_con.txt
ECX_CON=$(cat /tmp/ecx_con.txt)
[ "$ECX_CON" = "true" ] && echo "  ✓ Contracts Tab" || echo "  ✗ Contracts Tab"

echo ""

# Bank Portal
echo "BANK PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/banks/dashboard" | jq -r '.success' > /tmp/bank_dash.txt
BANK_DASH=$(cat /tmp/bank_dash.txt)
[ "$BANK_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/banking/lc" | jq -r '.success' > /tmp/bank_lc.txt
BANK_LC=$(cat /tmp/bank_lc.txt)
[ "$BANK_LC" = "true" ] && echo "  ✓ LC Tab" || echo "  ✗ LC Tab"

echo ""

# NBE Portal
echo "NBE PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/nbe/dashboard" | jq -r '.success' > /tmp/nbe_dash.txt
NBE_DASH=$(cat /tmp/nbe_dash.txt)
[ "$NBE_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/banking/forex" | jq -r '.success' > /tmp/nbe_forex.txt
NBE_FOREX=$(cat /tmp/nbe_forex.txt)
[ "$NBE_FOREX" = "true" ] && echo "  ✓ Forex Tab" || echo "  ✗ Forex Tab"

echo ""

# Customs Portal
echo "CUSTOMS PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/customs/dashboard" | jq -r '.success' > /tmp/cust_dash.txt
CUST_DASH=$(cat /tmp/cust_dash.txt)
[ "$CUST_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/customs/declarations" | jq -r '.success' > /tmp/cust_decl.txt
CUST_DECL=$(cat /tmp/cust_decl.txt)
[ "$CUST_DECL" = "true" ] && echo "  ✓ Declarations Tab" || echo "  ✗ Declarations Tab"

echo ""

# Shipping Portal
echo "SHIPPING PORTAL:"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/portals/shipping/dashboard" | jq -r '.success' > /tmp/ship_dash.txt
SHIP_DASH=$(cat /tmp/ship_dash.txt)
[ "$SHIP_DASH" = "true" ] && echo "  ✓ Dashboard" || echo "  ✗ Dashboard"

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/shipments" | jq -r '.success' > /tmp/ship_list.txt
SHIP_LIST=$(cat /tmp/ship_list.txt)
[ "$SHIP_LIST" = "true" ] && echo "  ✓ Shipments Tab" || echo "  ✗ Shipments Tab"

echo ""
echo "==================================="
echo "CHECK COMPLETE"
echo "==================================="
