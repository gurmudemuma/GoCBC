#!/bin/bash

echo "=== Testing Customs Dashboard Status Counts ==="
echo ""

# Login to get auth token
echo "Logging in as customs_admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ ERROR: Could not login"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test the dashboard endpoint
echo "Fetching dashboard data..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/portals/customs/dashboard)

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Could not connect to API on port 5000"
    echo "   Make sure API is running: cd /home/guda/GoCBC/api && npm run dev"
    exit 1
fi

# Check if response is valid JSON
echo "$RESPONSE" | python3 -m json.tool > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ ERROR: API returned invalid JSON"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ API is responding"
echo ""

# Extract statistics using python
echo "=== Dashboard Statistics ==="
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
stats = data.get('data', {}).get('statistics', {})

print(f'Total Declarations: {stats.get(\"totalDeclarations\", 0)}')
print(f'  SUBMITTED:       {stats.get(\"submittedCount\", \"MISSING\")}')
print(f'  INSPECTING:      {stats.get(\"inspectingCount\", \"MISSING\")}')
print(f'  UNDER_REVIEW:    {stats.get(\"underReviewCount\", \"MISSING\")}')
print(f'  CLEARED:         {stats.get(\"clearedCount\", \"MISSING\")}')
print(f'  REJECTED:        {stats.get(\"rejectedCount\", \"MISSING\")}')
print(f'Revenue Collected: \${stats.get(\"revenueCollected\", 0)}')
"

echo ""
echo "=== Comparing with Database ==="

# Query database for actual counts
psql postgresql://postgres:postgres@localhost:5432/cecbs -t -A -F'|' << 'EOF'
SELECT 
  'SUBMITTED' as status,
  COUNT(*) as count
FROM customs_declarations 
WHERE status = 'SUBMITTED'
UNION ALL
SELECT 
  'INSPECTING' as status,
  COUNT(*) as count
FROM customs_declarations 
WHERE status = 'INSPECTING'
UNION ALL
SELECT 
  'UNDER_REVIEW' as status,
  COUNT(*) as count
FROM customs_declarations 
WHERE status = 'UNDER_REVIEW'
UNION ALL
SELECT 
  'CLEARED' as status,
  COUNT(*) as count
FROM customs_declarations 
WHERE status = 'CLEARED'
UNION ALL
SELECT 
  'REJECTED' as status,
  COUNT(*) as count
FROM customs_declarations 
WHERE status = 'REJECTED'
ORDER BY 
  CASE status
    WHEN 'SUBMITTED' THEN 1
    WHEN 'INSPECTING' THEN 2
    WHEN 'UNDER_REVIEW' THEN 3
    WHEN 'CLEARED' THEN 4
    WHEN 'REJECTED' THEN 5
  END;
EOF

echo ""
echo "=== Test Complete ==="
