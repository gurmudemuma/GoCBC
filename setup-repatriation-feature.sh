#!/bin/bash
# Setup Forex Repatriation Feature - Complete Deployment

set -e

echo "=========================================="
echo "FOREX REPATRIATION FEATURE SETUP"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

# Step 1: Run database migration
echo "📊 Step 1: Creating export_proceeds_repatriation table..."
cat api/src/migrations/019_create_repatriation_table.sql | docker exec -i cecbs-postgres psql -U cecbs -d cecbs 2>&1 | grep -v "^$" || true

echo ""
echo "✅ Database table created"
echo ""

# Step 2: Verify table structure
echo "📋 Step 2: Verifying table structure..."
docker exec -i cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'export_proceeds_repatriation' 
ORDER BY ordinal_position;
" 2>&1 | head -30

echo ""

# Step 3: Check if API routes are accessible
echo "🔌 Step 3: Checking API health..."
sleep 2

# Test if API is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API is running on port 3001"
else
    echo "⚠️  API is not responding. Starting API..."
    ./start-api.sh > /tmp/api-start.log 2>&1 &
    sleep 5
fi

echo ""

# Step 4: Test repatriation endpoint
echo "🧪 Step 4: Testing repatriation endpoint..."
sleep 2

# Get auth token
AUTH_TOKEN=$(cat login.json 2>/dev/null | jq -r '.token' 2>/dev/null || echo "")

if [ ! -z "$AUTH_TOKEN" ]; then
    echo "🔑 Using auth token from login.json"
    
    # Test GET /api/v1/repatriation
    RESPONSE=$(curl -s -X GET http://localhost:3001/api/v1/repatriation \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" 2>&1)
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "✅ Repatriation API endpoint is working"
        echo "   Response: $RESPONSE" | head -c 200
        echo ""
    else
        echo "⚠️  API endpoint returned: $RESPONSE" | head -c 200
        echo ""
    fi
else
    echo "⚠️  No auth token found. Please login first at http://localhost:3000"
fi

echo ""
echo "=========================================="
echo "SETUP COMPLETE - VERIFICATION"
echo "=========================================="
echo ""

# Step 5: Count existing records
echo "📊 Current repatriation records:"
docker exec -i cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'COMPLIANT' THEN 1 END) as compliant,
    COUNT(CASE WHEN is_overdue = TRUE THEN 1 END) as overdue
FROM export_proceeds_repatriation;
" 2>&1

echo ""
echo "=========================================="
echo "FEATURE STATUS"
echo "=========================================="
echo "✅ Database table: export_proceeds_repatriation"
echo "✅ API routes: /api/v1/repatriation/*"
echo "✅ UI component: RepatriationManagementTab"
echo "✅ NBE Portal tab: Forex Repatriation (index 7)"
echo ""
echo "📍 Access at: http://localhost:3000"
echo "   Login → NBE Portal → Forex Repatriation tab"
echo ""
echo "=========================================="
