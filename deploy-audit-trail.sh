#!/bin/bash

# CECBS Audit Trail Chaincode Deployment Script
# Version: 2.0
# Date: 2026-06-25

set -e

echo "=================================="
echo "CECBS Audit Trail Deployment v2.0"
echo "=================================="
echo ""

# Configuration
CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"
CHAINCODE_VERSION="2.0"
SEQUENCE="2"
CHAINCODE_PACKAGE="coffee-v2.0-ccaas.tar.gz"

# Paths (adjust based on your setup)
CHAINCODE_DIR="./chaincodes/coffee"
ORDERER_CA="/home/fabric/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

# Organizations
declare -a ORGS=("ECTA" "NBE" "Banks" "Customs" "ECX" "Shipping")
declare -a MSP_IDS=("ECTAMSP" "NBEMSP" "BanksMSP" "CustomsMSP" "ECXMSP" "ShippingMSP")
declare -a PEER_PORTS=("7051" "8051" "9051" "10051" "11051" "12051")

echo "Step 1: Verify chaincode package exists"
if [ ! -f "$CHAINCODE_DIR/$CHAINCODE_PACKAGE" ]; then
    echo "ERROR: Chaincode package not found at $CHAINCODE_DIR/$CHAINCODE_PACKAGE"
    echo "Run: cd $CHAINCODE_DIR && tar czf $CHAINCODE_PACKAGE *.go go.mod go.sum connection.json"
    exit 1
fi
echo "✅ Package found: $CHAINCODE_PACKAGE"
echo ""

echo "Step 2: Install chaincode on all peers"
PACKAGE_ID=""
for i in "${!ORGS[@]}"; do
    ORG="${ORGS[$i]}"
    MSP_ID="${MSP_IDS[$i]}"
    PEER_PORT="${PEER_PORTS[$i]}"
    
    echo "Installing on ${ORG}..."
    
    export CORE_PEER_ADDRESS="peer0.${ORG,,}.cecbs.et:${PEER_PORT}"
    export CORE_PEER_LOCALMSPID="${MSP_ID}"
    export CORE_PEER_TLS_ROOTCERT_FILE="./blockchain/organizations/peerOrganizations/${ORG,,}.cecbs.et/peers/peer0.${ORG,,}.cecbs.et/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="./blockchain/organizations/peerOrganizations/${ORG,,}.cecbs.et/users/Admin@${ORG,,}.cecbs.et/msp"
    
    OUTPUT=$(peer lifecycle chaincode install "$CHAINCODE_DIR/$CHAINCODE_PACKAGE" 2>&1)
    
    if [ -z "$PACKAGE_ID" ]; then
        PACKAGE_ID=$(echo "$OUTPUT" | grep -o 'Package ID: [^,]*' | sed 's/Package ID: //' | head -1)
    fi
    
    echo "✅ Installed on ${ORG} (${MSP_ID})"
done

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not extract package ID"
    exit 1
fi

echo ""
echo "Package ID: $PACKAGE_ID"
echo ""

echo "Step 3: Approve chaincode for all organizations"
for i in "${!ORGS[@]}"; do
    ORG="${ORGS[$i]}"
    MSP_ID="${MSP_IDS[$i]}"
    PEER_PORT="${PEER_PORTS[$i]}"
    
    echo "Approving for ${ORG}..."
    
    export CORE_PEER_ADDRESS="peer0.${ORG,,}.cecbs.et:${PEER_PORT}"
    export CORE_PEER_LOCALMSPID="${MSP_ID}"
    export CORE_PEER_TLS_ROOTCERT_FILE="./blockchain/organizations/peerOrganizations/${ORG,,}.cecbs.et/peers/peer0.${ORG,,}.cecbs.et/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="./blockchain/organizations/peerOrganizations/${ORG,,}.cecbs.et/users/Admin@${ORG,,}.cecbs.et/msp"
    
    peer lifecycle chaincode approveformyorg \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$SEQUENCE" \
        --tls \
        --cafile "$ORDERER_CA" \
        2>&1 | grep -i "successfully\|error" || true
    
    echo "✅ Approved by ${ORG}"
done
echo ""

echo "Step 4: Check commit readiness"
peer lifecycle chaincode checkcommitreadiness \
    --channelID "$CHANNEL_NAME" \
    --name "$CHAINCODE_NAME" \
    --version "$CHAINCODE_VERSION" \
    --sequence "$SEQUENCE" \
    --tls \
    --cafile "$ORDERER_CA" \
    --output json
echo ""

echo "Step 5: Commit chaincode to channel"

# Build peer addresses and TLS certs for all orgs
PEER_CONN_PARMS=""
for i in "${!ORGS[@]}"; do
    ORG="${ORGS[$i]}"
    PEER_PORT="${PEER_PORTS[$i]}"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses peer0.${ORG,,}.cecbs.et:${PEER_PORT}"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --tlsRootCertFiles ./blockchain/organizations/peerOrganizations/${ORG,,}.cecbs.et/peers/peer0.${ORG,,}.cecbs.et/tls/ca.crt"
done

# Set to first org for commit command
export CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051"
export CORE_PEER_LOCALMSPID="ECTAMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="./blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="./blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp"

peer lifecycle chaincode commit \
    --channelID "$CHANNEL_NAME" \
    --name "$CHAINCODE_NAME" \
    --version "$CHAINCODE_VERSION" \
    --sequence "$SEQUENCE" \
    $PEER_CONN_PARMS \
    --tls \
    --cafile "$ORDERER_CA"

echo "✅ Chaincode committed to channel"
echo ""

echo "Step 6: Verify deployment"
peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME"
echo ""

echo "=================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION"
echo "Channel: $CHANNEL_NAME"
echo "Sequence: $SEQUENCE"
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Next steps:"
echo "1. Restart API server: cd api && npm start"
echo "2. Test audit endpoints: curl http://localhost:3001/api/audit/entity/EXPORTER/EXP123"
echo "3. Register test exporter to verify audit logging"
echo "4. Check audit logs: curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_ID"
echo ""
