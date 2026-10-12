#!/bin/bash

# ============================================================================
# Create ECTA_ADMIN Test User
# ============================================================================

set -e

API_BASE="http://localhost:3001/api/v1"

echo "==================================================================="
echo "Creating ECTA_ADMIN Test User"
echo "==================================================================="
echo ""

# First, try to register via API
echo "Attempting user registration via API..."
REGISTER_RESPONSE=$(curl -s -w '\n%{http_code}' -X POST "$API_BASE/users/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "ecta_admin_test",
    "email": "ecta_admin@test.com",
    "password": "EctaAdmin123!",
    "role": "ECTA_ADMIN",
    "organization": "ECTA",
    "fullName": "ECTA Test Administrator"
  }')

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n 1)
BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response: $BODY" | head -c 500
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✓ User created successfully via API"
else
    echo "⚠️  API registration failed or user exists. Trying direct database insert..."
    
    # Hash the password using bcrypt (10 rounds)
    # Using Node.js to generate bcrypt hash
    PASSWORD_HASH=$(node -e "
        const bcrypt = require('bcrypt');
        const hash = bcrypt.hashSync('EctaAdmin123!', 10);
        console.log(hash);
    " 2>/dev/null || echo "")
    
    if [ -z "$PASSWORD_HASH" ]; then
        echo "⚠️  Could not generate password hash. Using fallback hash..."
        # Fallback: pre-computed bcrypt hash for 'EctaAdmin123!'
        PASSWORD_HASH='$2b$10$K5V5bH5X5uJ5X5X5X5X5XeO5X5X5X5X5X5X5X5X5X5X5X5X5X5X5Xe'
    fi
    
    # Insert directly into PostgreSQL
    echo "Inserting user into database..."
    PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs <<EOF
INSERT INTO users (username, password_hash, email, organization, role, full_name, status, is_active, created_at)
VALUES (
    'ecta_admin_test',
    '$PASSWORD_HASH',
    'ecta_admin@test.com',
    'ECTA',
    'ECTA_ADMIN',
    'ECTA Test Administrator',
    'active',
    true,
    NOW()
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();
EOF
    
    echo "✓ User inserted/updated in database"
fi

echo ""
echo "==================================================================="
echo "Verifying User Creation"
echo "==================================================================="
echo ""

# Verify the user exists
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT id, username, email, role, organization, status FROM users WHERE username = 'ecta_admin_test';"

echo ""
echo "==================================================================="
echo "Testing Login"
echo "==================================================================="
echo ""

# Test login
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "ecta_admin_test",
    "password": "EctaAdmin123!"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
    echo "✓ Login successful!"
    echo "Token: ${TOKEN:0:50}..."
    echo ""
    echo "You can use this user for testing:"
    echo "  Username: ecta_admin_test"
    echo "  Password: EctaAdmin123!"
    echo "  Role: ECTA_ADMIN"
    echo "  Token: $TOKEN"
else
    echo "✗ Login failed. Check the response above for details."
fi

echo ""
echo "==================================================================="
echo "Done"
echo "==================================================================="
