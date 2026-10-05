#!/bin/bash

echo "=========================================="
echo "Initializing Coffee Chaincode"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

# Set environment variables for peer CLI
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="ECTAMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.com/peers/peer0.ecta.cecbs.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.com/users/Admin@ecta.cecbs.com/msp
export CORE_PEER_ADDRESS=localhost:7051

CHANNEL_NAME="coffeechannel"
CC_NAME="coffee"

echo "Step 1: Checking if chaincode is installed..."
docker exec cli peer lifecycle chaincode queryinstalled 2>&1 | tee /tmp/cc-installed.txt

if grep -q "$CC_NAME" /tmp/cc-installed.txt; then
    echo "✅ Chaincode is installed"
    
    # Get package ID
    PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "$CC_NAME" | awk '{print $3}' | sed 's/,$//')
    echo "Package ID: $PACKAGE_ID"
    
    echo ""
    echo "Step 2: Checking chaincode approval status..."
    docker exec cli peer lifecycle chaincode checkcommitreadiness \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME \
        --version 1.0 \
        --sequence 1 \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/cecbs.com/orderers/orderer.cecbs.com/msp/tlscacerts/tlsca.cecbs.com-cert.pem \
        --output json 2>&1 | tee /tmp/cc-ready.txt
    
    echo ""
    echo "Step 3: Checking if chaincode is committed..."
    docker exec cli peer lifecycle chaincode querycommitted \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME 2>&1 | tee /tmp/cc-committed.txt
    
    if grep -q "Version: 1.0" /tmp/cc-committed.txt; then
        echo "✅ Chaincode is committed"
        
        echo ""
        echo "Step 4: Initializing chaincode (invoking Init function)..."
        docker exec cli peer chaincode invoke \
            -o localhost:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.com \
            --tls \
            --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/cecbs.com/orderers/orderer.cecbs.com/msp/tlscacerts/tlsca.cecbs.com-cert.pem \
            -C $CHANNEL_NAME \
            -n $CC_NAME \
            --peerAddresses localhost:7051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.com/peers/peer0.ecta.cecbs.com/tls/ca.crt \
            -c '{"function":"InitLedger","Args":[]}' 2>&1 | tee /tmp/cc-init.txt
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Chaincode initialized successfully!"
            echo ""
            echo "Testing with a query..."
            docker exec cli peer chaincode query \
                -C $CHANNEL_NAME \
                -n $CC_NAME \
                -c '{"function":"GetAllShipments","Args":[]}' 2>&1 | head -20
            
            echo ""
            echo "=========================================="
            echo "✅ Chaincode is ready to use!"
            echo "=========================================="
        else
            echo ""
            echo "⚠️  Initialization may have issues. Check output above."
        fi
    else
        echo "❌ Chaincode not committed. Need to commit first."
        echo ""
        echo "Run: ./deploy-chaincode.sh"
    fi
else
    echo "❌ Chaincode not installed."
    echo ""
    echo "Run: ./deploy-chaincode.sh to install and initialize"
fi

echo ""
echo "Log files created:"
echo "  /tmp/cc-installed.txt - Installation status"
echo "  /tmp/cc-ready.txt - Approval readiness"
echo "  /tmp/cc-committed.txt - Commit status"
echo "  /tmp/cc-init.txt - Initialization output"
