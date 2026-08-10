#!/bin/bash
set -e

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=2
ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

echo "🔧 Fixing Chaincode Deployment (Sequence 2)"
echo "==========================================="
echo ""

# Get package ID
echo "📦 Getting package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID" | head -1 | awk '{print $3}' | tr -d ',')
echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Define organizations
declare -A orgs
orgs=(
    ["ecta"]="peer0.ecta.cecbs.et:7051:ECTAMSP"
    ["ecx"]="peer0.ecx.cecbs.et:8051:ECXMSP"
    ["banks"]="peer0.banks.cecbs.et:9051:BanksMSP"
    ["nbe"]="peer0.nbe.cecbs.et:10051:NBEMSP"
    ["customs"]="peer0.customs.cecbs.et:11051:CustomsMSP"
    ["shipping"]="peer0.shipping.cecbs.et:12051:ShippingMSP"
)

# Approve for each org
echo "✅ Approving for all organizations (sequence $CC_SEQUENCE)..."
SUCCESS=0
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  $msp... "
    
    RESULT=$(docker exec "$peer" sh -c "
        CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        CORE_PEER_TLS_ENABLED=true \
        CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        CORE_PEER_LOCALMSPID=$msp \
        CORE_PEER_ADDRESS=${peer}:${port} \
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile $ORDERER_CA \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id $PACKAGE_ID \
            --sequence $CC_SEQUENCE 2>&1
    ")
    
    if echo "$RESULT" | grep -qi "error"; then
        echo "❌"
    else
        echo "✓"
        SUCCESS=$((SUCCESS + 1))
    fi
done

echo ""
if [ $SUCCESS -lt 4 ]; then
    echo "❌ Only $SUCCESS orgs approved (need 4)"
    exit 1
fi
echo "✓ $SUCCESS organizations approved"
echo ""

# Check commit readiness
echo "🔍 Checking commit readiness..."
docker exec peer0.ecta.cecbs.et sh -c "
    CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer lifecycle chaincode checkcommitreadiness \
        --channelID $CHANNEL \
        --name $CC_NAME \
        --version $CC_VERSION \
        --sequence $CC_SEQUENCE \
        --output json
" | grep -E "ECTAMSP|ECXMSP|BanksMSP|NBEMSP|CustomsMSP|ShippingMSP"
echo ""

# Commit
echo "📝 Committing chaincode (sequence $CC_SEQUENCE)..."
PEER_ARGS=""
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    PEER_ARGS="$PEER_ARGS --peerAddresses ${peer}:${port} --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
done

COMMIT=$(docker exec peer0.ecta.cecbs.et sh -c "
    CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    CORE_PEER_TLS_ENABLED=true \
    CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    CORE_PEER_LOCALMSPID=ECTAMSP \
    CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile $ORDERER_CA \
        --channelID $CHANNEL \
        --name $CC_NAME \
        --version $CC_VERSION \
        --sequence $CC_SEQUENCE \
        $PEER_ARGS 2>&1
")

if echo "$COMMIT" | grep -qi "error"; then
    echo "❌ Commit failed"
    echo "$COMMIT"
    exit 1
fi

echo "✓ Chaincode committed!"
echo ""

# Test
echo "🧪 Testing chaincode..."
sleep 3
TEST=$(docker exec peer0.ecta.cecbs.et sh -c "
    CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer chaincode query -C $CHANNEL -n $CC_NAME -c '{\"Args\":[\"QueryAllExporters\"]}' 2>&1
")

if echo "$TEST" | grep -qi "error"; then
    echo "⚠️ Test query had issues"
else
    echo "✓ Chaincode is working!"
fi

echo ""
echo "✅ Chaincode deployment fixed!"
