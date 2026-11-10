#!/bin/bash

################################################################################
# Setup Portal Admin Users
# Creates all portal admin accounts with standard credentials
# Username format: <portal>_admin (e.g., ecta_admin, bank_admin)
# Password: password123 (for all portal admins)
################################################################################

set -e

BASE_URL="http://localhost:3001/api/v1"

echo "================================================"
echo "PORTAL ADMIN SETUP"
echo "================================================"
echo ""

# Get admin token
echo "Logging in as system admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "✗ Failed to obtain admin token"
    exit 1
fi

echo "✓ Admin token obtained"
echo ""

# Function to create portal admin
create_portal_admin() {
    local username=$1
    local org=$2
    local full_name=$3
    local email=$4
    
    echo -n "Creating $username ($org)... "
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$username\",
            \"password\": \"password123\",
            \"email\": \"$email\",
            \"fullName\": \"$full_name\",
            \"role\": \"$org\",
            \"organization\": \"$org\",
            \"phone\": \"+251911$(printf '%06d' $RANDOM)\"
        }")
    
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
    
    if [ "$SUCCESS" = "true" ]; then
        echo "✓ Created"
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error.message // "Unknown error"')
        if [[ "$ERROR" == *"already exists"* ]] || [[ "$ERROR" == *"duplicate"* ]]; then
            echo "⚠ Already exists"
        else
            echo "✗ Failed: $ERROR"
        fi
    fi
}

# Create all portal admin accounts
echo "Creating portal admin accounts..."
echo ""

create_portal_admin "ecta_admin" "ECTA" "ECTA Portal Administrator" "ecta.admin@cecbs.et"
create_portal_admin "customs_admin" "CUSTOMS" "Customs Portal Administrator" "customs.admin@cecbs.et"
create_portal_admin "bank_admin" "BANK" "Bank Portal Administrator" "bank.admin@cecbs.et"
create_portal_admin "nbe_admin" "NBE" "NBE Portal Administrator" "nbe.admin@cecbs.et"
create_portal_admin "shipping_admin" "SHIPPING" "Shipping Portal Administrator" "shipping.admin@cecbs.et"
create_portal_admin "ecx_admin" "ECX" "ECX Portal Administrator" "ecx.admin@cecbs.et"

echo ""
echo "================================================"
echo "VERIFYING LOGINS"
echo "================================================"
echo ""

# Function to test login
test_login() {
    local username=$1
    local password=$2
    
    echo -n "Testing login: $username... "
    
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}" \
        | jq -r '.data.token // empty')
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "✓ Success"
    else
        echo "✗ Failed"
    fi
}

# Test all portal admin logins
test_login "admin" "admin123"
test_login "ecta_admin" "password123"
test_login "customs_admin" "password123"
test_login "bank_admin" "password123"
test_login "nbe_admin" "password123"
test_login "shipping_admin" "password123"
test_login "ecx_admin" "password123"

echo ""
echo "================================================"
echo "SETUP COMPLETE"
echo "================================================"
echo ""
echo "Portal Admin Credentials:"
echo "  - admin / admin123 (System Admin)"
echo "  - ecta_admin / password123"
echo "  - customs_admin / password123"
echo "  - bank_admin / password123"
echo "  - nbe_admin / password123"
echo "  - shipping_admin / password123"
echo "  - ecx_admin / password123"
echo ""
