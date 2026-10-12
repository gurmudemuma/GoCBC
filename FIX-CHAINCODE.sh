#!/bin/bash
# Fix Chaincode Deployment
# This script properly approves and commits the chaincode with all required endorsements

set -e

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
PACKAGE_ID="coffee_1.11:89e1b8ff78e5cfb23a7ede01375f4792e8b816f7d1a44c0580b0c51d33e41045"

echo "🔧 Fixing Chaincode Deployment"
echo "==============================="
echo ""

# Get the actual package ID
echo "📦 Getting package ID..."
ACTUAL_PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID" | head -1 | awk '{print $3}' | tr -d ',' || echo "")

if [ -z "$ACTUAL_PACKAGE_ID" ]; then
    echo "❌ Could not find installed package"
    echo "ℹ️  Listing installed packages:"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep -A2 "Installed chaincodes"
    exit 1
fi

echo "✓ Found package: $ACTUAL_PACKAGE_ID"
PACKAGE_ID=$ACTUAL_PACKAGE_ID
echo ""

# Define all organizations
declare -A orgs
orgs["ecta"]="ECTAMSP:7051"
orgs["ecx"]="ECXMSP:8051"
orgs["banks"]="BanksMSP:9051"
orgs["nbe"]="NBEMSP:10051"
orgs["customs"]="CustomsMSP:11051"
orgs["shipping"]="ShippingMSP:12051"

echo "✅ Approving for all organizations..."
SUCCESS_COUNT=0

for org in "${!orgs[@]}"; do
    IFS=':' read -r msp port <<< "${orgs[$org]}"
    echo -n "  Approving $msp... "
    
    # Approve using environment variables
    RESULT=$(docker exec \
        -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_ADDRESS=peer0.$org.cecbs.et:$port \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$org.cecbs.et/msp \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        peer0.ecta.cecbs.et \
        peer lifecycle chaincode approveformyorg \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id "$PACKAGE_ID" \
            --sequence $CC_SEQUENCE \
            --tls \
            --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
            --orderer orderer.cecbs.et:7050 2>&1)
    
    if echo "$RESULT" | grep -q "error"; then
        echo "❌ failed"
        echo "     Error: $RESULT" | head -3
    else
        echo "✓"
        ((SUCCESS_COUNT++))
    fi
done

echo ""
echo "📊 Approved by $SUCCESS_COUNT organizations"
echo ""

if [ $SUCCESS_COUNT -lt 4 ]; then
    echo "⚠️  Need at least 4 approvals but only got $SUCCESS_COUNT"
    echo "❌ Cannot commit chaincode"
    exit 1
fi

echo "📝 Committing chaincode..."

# Build peer addresses for commit
PEER_ARGS=""
for org in "${!orgs[@]}"; do
    IFS=':' read -r msp port <<< "${orgs[$org]}"
    PEER_ARGS="$PEER_ARGS --peerAddresses peer0.$org.cecbs.et:$port --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.$org.cecbs.et-cert.pem"
done

# Commit
COMMIT_RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
        --channelID $CHANNEL \
        --name $CC_NAME \
        --version $CC_VERSION \
        --sequence $CC_SEQUENCE \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --orderer orderer.cecbs.et:7050 \
        $PEER_ARGS 2>&1)

if echo "$COMMIT_RESULT" | grep -q "error\|Error"; then
    echo "❌ Commit failed"
    echo "$COMMIT_RESULT"
    exit 1
else
    echo "✅ Chaincode committed successfully!"
fi

echo ""
echo "🧪 Testing chaincode..."
sleep 3

# Test invoke
TEST_RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.ecta.cecbs.et \
    peer chaincode query \
        -C $CHANNEL \
        -n $CC_NAME \
        -c '{"Args":["QueryAllExporters"]}' 2>&1 || echo "Query failed")

if echo "$TEST_RESULT" | grep -q "error\|Error"; then
    echo "⚠️  Chaincode test had issues"
    echo "$TEST_RESULT" | head -5
else
    echo "✅ Chaincode is working!"
fi

echo ""
echo "✅ DONE! Chaincode deployment fixed"
