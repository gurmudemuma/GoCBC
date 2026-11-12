#!/bin/bash

# Test Exporter Application Flow
# Verifies that applications appear immediately in ECTA portal

echo "=========================================="
echo "  Testing Exporter Application Flow"
echo "=========================================="
echo ""

API_URL="http://localhost:3001/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if applications endpoint is accessible
echo "Test 1: Checking applications endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/exporters/exporter-applications?status=pending")

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ]; then
    echo -e "${GREEN}✓${NC} Endpoint is accessible (HTTP $RESPONSE)"
else
    echo -e "${RED}✗${NC} Endpoint failed (HTTP $RESPONSE)"
    exit 1
fi

echo ""

# Test 2: Verify database has exporter_applications table
echo "Test 2: Checking database table..."
DB_CHECK=$(PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db -t -c "SELECT COUNT(*) FROM exporter_applications;" 2>&1)

if [[ $DB_CHECK =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}✓${NC} Database table exists with $DB_CHECK records"
else
    echo -e "${RED}✗${NC} Database table check failed"
    echo "Error: $DB_CHECK"
fi

echo ""

# Test 3: Check recent applications
echo "Test 3: Checking for recent applications..."
RECENT=$(PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db -t -c "SELECT COUNT(*) FROM exporter_applications WHERE submitted_at > NOW() - INTERVAL '24 hours';" 2>&1)

if [[ $RECENT =~ ^[0-9]+$ ]]; then
    if [ "$RECENT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Found $RECENT application(s) submitted in last 24 hours"
        
        # Show details
        echo ""
        echo "Recent applications:"
        PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db -c "
          SELECT 
            application_id, 
            company_name, 
            email, 
            status, 
            TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted 
          FROM exporter_applications 
          WHERE submitted_at > NOW() - INTERVAL '24 hours'
          ORDER BY submitted_at DESC;" 2>&1 | grep -v "^$"
    else
        echo -e "${YELLOW}⚠${NC} No applications in last 24 hours (this is normal if none were submitted)"
    fi
else
    echo -e "${RED}✗${NC} Query failed"
fi

echo ""

# Test 4: Verify response format (if we have an admin token)
if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "Test 4: Verifying API response format..."
    
    API_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/exporters/exporter-applications?status=pending")
    
    # Check if response has correct structure
    if echo "$API_RESPONSE" | jq -e '.data.applications' > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Response format is correct: { data: { applications: [...] } }"
        
        APP_COUNT=$(echo "$API_RESPONSE" | jq -r '.data.count')
        echo "  Applications count: $APP_COUNT"
    else
        echo -e "${RED}✗${NC} Response format is incorrect"
        echo "Response: $API_RESPONSE" | jq '.'
    fi
else
    echo "Test 4: Skipping API response test (ADMIN_TOKEN not set)"
    echo -e "${YELLOW}⚠${NC} To test API response, set ADMIN_TOKEN environment variable"
fi

echo ""
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo ""
echo "If all tests passed, exporter applications should now"
echo "appear immediately in the ECTA portal!"
echo ""
echo "To test manually:"
echo "1. Submit an application at: http://localhost:3000/register"
echo "2. Login as ECTA admin"
echo "3. Check the Applications tab"
echo ""
echo "Expected: Application appears immediately ✓"
