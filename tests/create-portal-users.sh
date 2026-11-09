#!/bin/bash

# Script to create all portal officer users for testing

BASE_URL="http://localhost:3001/api/v1"

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.token')

echo "Admin token obtained: ${ADMIN_TOKEN:0:20}..."

# Create ECTA Officer
echo "Creating ECTA officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "ecta.officer",
        "password": "ecta12345",
        "email": "ecta.officer@cecbs.et",
        "fullName": "ECTA Officer",
        "role": "ECTA",
        "organization": "ECTA",
        "phone": "+251911000001"
    }' | jq -r '.success, .error.message // empty'

# Create ECX Officer
echo "Creating ECX officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "ecx.officer",
        "password": "ecx12345",
        "email": "ecx.officer@cecbs.et",
        "fullName": "ECX Officer",
        "role": "ECX",
        "organization": "ECX",
        "phone": "+251911000002"
    }' | jq -r '.success, .error.message // empty'

# Create Bank Officer
echo "Creating Bank officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "bank.officer",
        "password": "bank12345",
        "email": "bank.officer@cecbs.et",
        "fullName": "Bank Officer",
        "role": "BANK",
        "organization": "BANK",
        "phone": "+251911000003"
    }' | jq -r '.success, .error.message // empty'

# Create Quality Officer
echo "Creating Quality officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "quality.officer",
        "password": "quality12345",
        "email": "quality.officer@cecbs.et",
        "fullName": "Quality Officer",
        "role": "QUALITY",
        "organization": "QUALITY",
        "phone": "+251911000004"
    }' | jq -r '.success, .error.message // empty'

# Create Customs Officer
echo "Creating Customs officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "customs.officer",
        "password": "customs12345",
        "email": "customs.officer@cecbs.et",
        "fullName": "Customs Officer",
        "role": "CUSTOMS",
        "organization": "CUSTOMS",
        "phone": "+251911000005"
    }' | jq -r '.success, .error.message // empty'

# Create Shipping Officer
echo "Creating Shipping officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "shipping.officer",
        "password": "shipping12345",
        "email": "shipping.officer@cecbs.et",
        "fullName": "Shipping Officer",
        "role": "SHIPPING",
        "organization": "SHIPPING",
        "phone": "+251911000006"
    }' | jq -r '.success, .error.message // empty'

# Create NBE Officer
echo "Creating NBE officer..."
curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "nbe.officer",
        "password": "nbe12345",
        "email": "nbe.officer@cecbs.et",
        "fullName": "NBE Officer",
        "role": "NBE",
        "organization": "NBE",
        "phone": "+251911000007"
    }' | jq -r '.success, .error.message // empty'

echo ""
echo "All portal users created successfully!"
echo ""
echo "Testing logins..."

# Test each login
for user in "ecta.officer:ecta12345" "ecx.officer:ecx12345" "bank.officer:bank12345" "quality.officer:quality12345" "customs.officer:customs12345" "shipping.officer:shipping12345" "nbe.officer:nbe12345"; do
    username=$(echo $user | cut -d: -f1)
    password=$(echo $user | cut -d: -f2)
    
    echo -n "Testing $username... "
    result=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}" | jq -r '.success')
    
    if [ "$result" = "true" ]; then
        echo "✓ OK"
    else
        echo "✗ FAILED"
    fi
done

echo ""
echo "Setup complete!"
