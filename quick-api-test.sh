#!/bin/bash

API_BASE="http://localhost:3001/api/v1"
LOG="quick-test.log"

echo "Quick API Test - $(date)" > "$LOG"

# Test 1: Health check
echo "=== Test 1: Health Check ===" | tee -a "$LOG"
curl -s http://localhost:3001/health | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Test 2: Login
echo "=== Test 2: Login ===" | tee -a "$LOG"
LOGIN_RESP=$(curl -s -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')
echo "$LOGIN_RESP" | tee -a "$LOG"
echo "" | tee -a "$LOG"

TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "Failed to get token" | tee -a "$LOG"
    exit 1
fi

echo "Token: ${TOKEN:0:30}..." | tee -a "$LOG"

# Test 3: Submit exporter application (CORRECTED ENDPOINT)
echo "=== Test 3: Exporter Application (CORRECTED) ===" | tee -a "$LOG"
TS=$(date +%s)
curl -s -X POST "$API_BASE/exporter-applications" \
  -H 'Content-Type: application/json' \
  -d '{
    "companyName": "Test Exporter '$TS'",
    "licenseNumber": "LIC-'$TS'",
    "address": "Addis Ababa",
    "phone": "+251911234567",
    "email": "test'$TS'@example.com",
    "tinNumber": "TIN-'$TS'",
    "businessType": "Coffee Exporter",
    "exportCapacity": 5000
  }' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Test 4: Create contract (CORRECTED FIELD NAMES)
echo "=== Test 4: Create Contract (CORRECTED) ===" | tee -a "$LOG"
curl -s -X POST "$API_BASE/contracts" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "contractID": "CNT-'$TS'",
    "exporterID": "EXP-'$TS'",
    "buyerID": "BUY-'$TS'",
    "buyerCountry": "Germany",
    "buyerBank": "Deutsche Bank",
    "exporterBank": "Commercial Bank of Ethiopia",
    "coffeeType": "Arabica",
    "quantity": 10000,
    "pricePerKg": 5.50,
    "currency": "USD",
    "eudrRequired": true
  }' | tee -a "$LOG"
echo "" | tee -a "$LOG"

echo "=== Done ===" | tee -a "$LOG"
echo "Full log saved to: $LOG"
