#!/bin/bash
set -e

echo "=========================================="
echo "Complete Network Rebuild"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Stop all Docker containers"
echo "  2. Delete channel artifacts"
echo "  3. Regenerate certificates"
echo "  4. Recreate the channel"
echo "  5. Redeploy chaincode"
echo ""
echo "⚠️  WARNING: All blockchain data will be lost"
echo "✅  PostgreSQL data will be preserved"
echo ""
read -p "Type 'yes' to continue: " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd /home/guda/GoCBC

echo ""
echo "Step 1/6: Stopping all Docker containers..."
docker stop $(docker ps -aq 2>/dev/null) 2>/dev/null || true
docker rm $(docker ps -aq 2>/dev/null) 2>/dev/null || true
echo "✅ Containers stopped"

echo ""
echo "Step 2/6: Cleaning up volumes..."
docker volume prune -f 2>/dev/null || true
echo "✅ Volumes cleaned"

echo ""
echo "Step 3/6: Deleting old channel artifacts and certificates..."
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/channel-artifacts/*.tx 2>/dev/null || true
rm -rf blockchain/organizations/ordererOrganizations 2>/dev/null || true
rm -rf blockchain/organizations/peerOrganizations/*/users 2>/dev/null || true
rm -rf blockchain/organizations/peerOrganizations/*/peers/*/msp 2>/dev/null || true
rm -rf blockchain/organizations/peerOrganizations/*/msp 2>/dev/null || true
echo "✅ Old artifacts deleted"

echo ""
echo "Step 4/6: Regenerating crypto material..."
cd blockchain
cryptogen generate --config=crypto-config.yaml --output=organizations 2>&1 | grep -E "^(ecta|ecx|banks|nbe|customs|shipping|orderer)" || true
cd ..
echo "✅ Certificates regenerated"

echo ""
echo "Step 5/6: Starting network..."
./start-all.sh 2>&1 | tail -50
echo ""

echo "Step 6/6: Waiting for network to stabilize..."
sleep 30
echo "✅ Network should be ready"

echo ""
echo "=========================================="
echo "Rebuild Complete - Testing..."
echo "=========================================="
echo ""

# Test
cat > /tmp/rebuild-test.pdf << 'EOF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f
trailer<</Size 4/Root 1 0 R>>
startxref
180
%%EOF
EOF

echo "Testing document upload..."
RESULT=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/rebuild-test.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-REBUILD-TEST-$(date +%s)" \
  -F "fileName=rebuild-test.pdf")

rm -f /tmp/rebuild-test.pdf

if echo "$RESULT" | grep -q '"success":true'; then
    echo "✅ SUCCESS! Certificate issue is FIXED!"
    DOC_ID=$(echo "$RESULT" | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
    echo "   Document ID: $DOC_ID"
else
    echo "❌ Still failing..."
    ERROR=$(echo "$RESULT" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo "   Error: $ERROR"
    echo ""
    echo "Checking peer logs..."
    docker logs peer0.ecta.cecbs.et 2>&1 | grep "certificate" | tail -5
fi

echo ""
echo "=========================================="
