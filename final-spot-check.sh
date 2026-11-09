#!/bin/bash

# Final Spot Check - Test critical endpoints only
echo "════════════════════════════════════════════════════════════════"
echo "🔍 FINAL SPOT CHECK - CRITICAL ENDPOINTS ONLY"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Database counts
echo "📊 DATABASE COUNTS:"
echo "─────────────────────────────────────────────────────────────"
DB_APPS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM exporter_applications WHERE status = 'pending';")
DB_CUSTOMS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE status = 'SUBMITTED';")
DB_INSPECT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM customs_declarations WHERE inspection_required = true AND status IN ('SUBMITTED', 'UNDER_REVIEW');")
DB_LC=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A -c "SELECT COUNT(*) FROM letters_of_credit;")

echo "Pending Applications: $DB_APPS"
echo "Submitted Customs: $DB_CUSTOMS"
echo "Inspection Queue: $DB_INSPECT"
echo "Total LCs: $DB_LC"
echo ""

# Test ECTA
echo "🔍 TESTING ECTA (Pending Applications)..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')
API_APPS=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/v1/portals/ecta/dashboard" | jq -r '.data.statistics.applications.pending_applications')
if [ "$API_APPS" = "$DB_APPS" ]; then
    echo "✅ ECTA Dashboard Pending: API=$API_APPS, DB=$DB_APPS"
else
    echo "❌ ECTA Dashboard Pending: API=$API_APPS, DB=$DB_APPS"
fi
echo ""

# Test Customs
echo "🔍 TESTING CUSTOMS (Submitted + Inspection Queue)..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
API_CUSTOMS=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/v1/portals/customs/dashboard" | jq -r '.data.statusCounts.SUBMITTED')
API_INSPECT=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/v1/portals/customs/dashboard" | jq -r '.data.scheduledInspections | length')

if [ "$API_CUSTOMS" = "$DB_CUSTOMS" ]; then
    echo "✅ Customs Submitted: API=$API_CUSTOMS, DB=$DB_CUSTOMS"
else
    echo "❌ Customs Submitted: API=$API_CUSTOMS, DB=$DB_CUSTOMS"
fi

if [ "$API_INSPECT" = "$DB_INSPECT" ]; then
    echo "✅ Customs Inspection Queue: API=$API_INSPECT, DB=$DB_INSPECT"
else
    echo "❌ Customs Inspection Queue: API=$API_INSPECT, DB=$DB_INSPECT"
fi
echo ""

# Test Banks LC
echo "🔍 TESTING BANKS (Letters of Credit)..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
API_LC=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/v1/banking/lc" | jq -r '.data.lcs | length')
if [ "$API_LC" = "$DB_LC" ]; then
    echo "✅ Banks LCs: API=$API_LC, DB=$DB_LC"
else
    echo "❌ Banks LCs: API=$API_LC, DB=$DB_LC"
fi
echo ""

# Test NBE LC Monitoring
echo "🔍 TESTING NBE (LC Monitoring)..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')
API_NBE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/v1/nbe/lc-monitoring" | jq -r '.count')
if [ "$API_NBE" = "$DB_LC" ]; then
    echo "✅ NBE LC Monitoring: API=$API_NBE, DB=$DB_LC"
else
    echo "❌ NBE LC Monitoring: API=$API_NBE, DB=$DB_LC"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ SPOT CHECK COMPLETE"
echo "════════════════════════════════════════════════════════════════"
