#!/bin/bash
# Test Complete Lifecycle Audit Trail

echo "=== Testing Complete Lifecycle Audit Trail ==="
echo ""

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test audit trail for EXP4886039 (Alii Birraa - approved exporter)
EXPORTER_ID="EXP4886039"
echo "Step 2: Fetching complete audit trail for $EXPORTER_ID..."
echo ""

AUDIT_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/audit/entity/EXPORTER/$EXPORTER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Check if response is valid
if echo "$AUDIT_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Audit trail fetched successfully"
  echo ""
  
  # Extract key information
  TOTAL_LOGS=$(echo "$AUDIT_RESPONSE" | grep -o '"data":\[' | wc -l)
  DB_LOGS=$(echo "$AUDIT_RESPONSE" | grep -o '"database":[0-9]*' | cut -d':' -f2)
  BC_LOGS=$(echo "$AUDIT_RESPONSE" | grep -o '"blockchain":[0-9]*' | cut -d':' -f2)
  
  echo "📊 AUDIT TRAIL SUMMARY:"
  echo "   Database logs: $DB_LOGS"
  echo "   Blockchain logs: $BC_LOGS"
  echo ""
  
  # Show action types
  echo "📋 ACTION TYPES TRACKED:"
  echo "$AUDIT_RESPONSE" | grep -o '"actionType":"[^"]*"' | cut -d'"' -f4 | sort | uniq -c
  echo ""
  
  # Save full response
  echo "$AUDIT_RESPONSE" | python -m json.tool > audit-trail-response.json 2>/dev/null || echo "$AUDIT_RESPONSE" > audit-trail-response.json
  echo "💾 Full response saved to: audit-trail-response.json"
  
else
  echo "❌ Failed to fetch audit trail"
  echo "Response: $AUDIT_RESPONSE"
  exit 1
fi

echo ""
echo "Step 3: Verifying audit trail integrity..."
VERIFY_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/audit/verify/EXPORTER/$EXPORTER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Audit trail verification completed"
  
  VERIFIED=$(echo "$VERIFY_RESPONSE" | grep -o '"verified":[^,]*' | cut -d':' -f2)
  TOTAL=$(echo "$VERIFY_RESPONSE" | grep -o '"totalLogs":[0-9]*' | cut -d':' -f2)
  
  echo "   Total logs verified: $TOTAL"
  echo "   Integrity check: $VERIFIED"
else
  echo "⚠️ Verification failed"
  echo "Response: $VERIFY_RESPONSE"
fi

echo ""
echo "Step 4: Generating compliance report..."
COMPLIANCE_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/audit/compliance-report/EXPORTER/$EXPORTER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$COMPLIANCE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Compliance report generated successfully"
  echo ""
  
  echo "📈 BUSINESS METRICS:"
  echo "$COMPLIANCE_RESPONSE" | grep -o '"total[^"]*":[0-9]*' | head -20
  echo ""
  
  # Save compliance report
  echo "$COMPLIANCE_RESPONSE" | python -m json.tool > compliance-report.json 2>/dev/null || echo "$COMPLIANCE_RESPONSE" > compliance-report.json
  echo "💾 Full compliance report saved to: compliance-report.json"
else
  echo "❌ Failed to generate compliance report"
  echo "Response: $COMPLIANCE_RESPONSE"
fi

echo ""
echo "=== TEST COMPLETE ==="
echo ""
echo "📁 Generated files:"
echo "   - audit-trail-response.json (Complete audit trail with DB + Blockchain)"
echo "   - compliance-report.json (Full compliance report with 15 business categories)"
