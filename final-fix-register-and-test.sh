#!/bin/bash

# Final Fix: Register Exporter and Test
# Uses API endpoints which have proper Fabric connections

set +e

echo "=============================================="
echo "Final Fix: Register Exporter & Complete Test"
echo "=============================================="
echo ""

# Step 1: Get admin token
echo "[1/4] Authenticating as admin..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get admin token"
    echo "Trying to restart API..."
    pkill -f "node.*api"
    sleep 5
    cd /home/guda/GoCBC && bash start-api.sh > /tmp/api-final-restart.log 2>&1 &
    sleep 15
    
    TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"admin123"}' | \
      grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Still cannot get token. Check API logs."
        exit 1
    fi
fi

echo "✅ Admin authenticated"
echo ""

# Step 2: Try to register exporter via API
echo "[2/4] Attempting to register exporter EXP001 via API..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/exporters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "exporterID": "EXP001",
    "companyName": "Test Coffee Exporter Ltd",
    "ectaLicenseNumber": "ECTA-2024-001",
    "exporterType": "company",
    "capitalRequirement": 5000000,
    "professionalTaster": "yes",
    "tasterCertificate": "TASTER-CERT-001",
    "laboratoryCertificateNumber": "LAB-CERT-001",
    "licenseExpiryDate": "2027-12-31"
  }')

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Exporter registered via API"
elif echo "$REGISTER_RESPONSE" | grep -q "already exists\|duplicate"; then
    echo "✅ Exporter already exists"
else
    echo "⚠️ Registration response received (may have blockchain issues)"
fi

echo ""

# Step 3: Give system time to propagate
echo "[3/4] Waiting for blockchain propagation..."
sleep 10
echo "✅ Ready to test"
echo ""

# Step 4: Run workflow test
echo "[4/4] Running complete workflow test..."
echo "=============================================="
echo ""

cd /home/guda/GoCBC
./complete-workflow-test-fixed.sh

echo ""
echo "=============================================="
echo "Test Complete!"
echo "=============================================="
echo ""
echo "Summary:"
echo "- If LC Request (step 4) still fails with 'exporter not registered',"
echo "  the blockchain has fundamental MSP/TLS issues that require"
echo "  regenerating crypto materials."
echo ""
echo "- 13+ steps should be passing (database operations)"
echo "- 7 blockchain-dependent steps may still fail due to MSP config"
echo ""
