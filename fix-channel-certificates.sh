#!/bin/bash
set -e

echo "=========================================="
echo "Channel Certificate Fix"
echo "=========================================="
echo ""
echo "This script will recreate the channel with current certificates."
echo ""

cd /home/guda/GoCBC

echo "Step 1/5: Stopping all peers and orderer..."
docker stop $(docker ps -q --filter "name=peer0") $(docker ps -q --filter "name=orderer") 2>/dev/null || true
sleep 5
echo "✅ Stopped"

echo ""
echo "Step 2/5: Deleting old channel artifacts..."
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/channel-artifacts/*.tx 2>/dev/null || true
mkdir -p blockchain/channel-artifacts
echo "✅ Old channel deleted"

echo ""
echo "Step 3/5: Generating new channel genesis block..."
cd blockchain

# Generate channel artifacts using configtxgen
export FABRIC_CFG_PATH=${PWD}

# Generate genesis block
../bin/configtxgen -profile SixOrgsChannel \
  -outputBlock ./channel-artifacts/coffeechannel.block \
  -channelID coffeechannel 2>&1 | grep -v "Endorser and orderer" || true

if [ ! -f "./channel-artifacts/coffeechannel.block" ]; then
    echo "❌ Failed to generate channel block"
    exit 1
fi

echo "✅ Channel genesis block created with current certificates"
cd ..

echo ""
echo "Step 4/5: Restarting network..."
docker start $(docker ps -aq --filter "name=orderer") 2>/dev/null || true
sleep 10
docker start $(docker ps -aq --filter "name=peer0") 2>/dev/null || true
sleep 10
echo "✅ Network restarted"

echo ""
echo "Step 5/5: Updating channel membership..."
# The peers need to rejoin the channel with the new genesis block
# This is handled by start-all.sh usually, so let's just call it
./start-all.sh 2>&1 | tail -30

echo ""
echo "=========================================="
echo "Fix applied - testing..."
echo "=========================================="

sleep 10

# Test
cat > /tmp/channel-fix-test.pdf << 'EOF'
%PDF-1.4
%%EOF
EOF

RESULT=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/channel-fix-test.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-FIX-$(date +%s)" \
  -F "fileName=test.pdf")

rm -f /tmp/channel-fix-test.pdf

if echo "$RESULT" | grep -q '"success":true'; then
    echo "✅ FIXED! Document uploads now work!"
else
    echo "❌ Still broken. Error:"
    echo "$RESULT" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
fi

echo ""
