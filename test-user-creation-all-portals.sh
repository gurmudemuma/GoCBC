#!/bin/bash
# Test user creation for all portal roles

echo "========================================"
echo "Testing User Creation for All Portals"
echo "========================================"

# Get admin token
echo -e "\n1. Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Got admin token"

# Test creating users for each role
declare -a ROLES=(
  "ECTA|ecta_user|ECTA User|Ethiopian Coffee & Tea Authority"
  "ECX|ecx_user|ECX User|Ethiopian Commodity Exchange" 
  "NBE|nbe_user|NBE User|National Bank of Ethiopia"
  "BANKS|bank_user|Bank User|Commercial Bank of Ethiopia"
  "CUSTOMS|customs_user|Customs User|Ethiopian Customs Authority"
  "SHIPPING|shipping_user|Shipping User|Ethiopian Shipping Lines"
  "EXPORTER|test_exporter|Test Exporter|Test Export Company"
)

echo -e "\n2. Testing user creation for each role..."

for role_data in "${ROLES[@]}"; do
  IFS='|' read -r ROLE USERNAME FULLNAME ORG <<< "$role_data"
  
  echo -e "\n  Testing ${ROLE}..."
  
  # Prepare request body
  if [ "$ROLE" == "EXPORTER" ]; then
    BODY="{\"username\":\"${USERNAME}\",\"email\":\"${USERNAME}@test.et\",\"password\":\"password123\",\"fullName\":\"${FULLNAME}\",\"role\":\"${ROLE}\",\"organization\":\"${ORG}\",\"phone\":\"+251911111111\",\"exporterId\":\"EXP001\",\"ectaLicense\":\"ECTA001\"}"
  else
    BODY="{\"username\":\"${USERNAME}\",\"email\":\"${USERNAME}@test.et\",\"password\":\"password123\",\"fullName\":\"${FULLNAME}\",\"role\":\"${ROLE}\",\"organization\":\"${ORG}\",\"phone\":\"+251911111111\"}"
  fi
  
  RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/users \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "  ✅ ${ROLE} user created successfully"
  else
    echo "  ❌ ${ROLE} user creation failed"
    echo "     Response: $RESPONSE"
  fi
done

# List all users
echo -e "\n3. Listing all users..."
USERS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer ${TOKEN}")

echo "$USERS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$USERS_RESPONSE"

echo -e "\n========================================"
echo "Test Complete!"
echo "========================================"
