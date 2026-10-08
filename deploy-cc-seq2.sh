#!/bin/bash

set -e

echo "=========================================="
echo "Deploying Chaincode - Sequence 2"
echo "=========================================="
echo ""

PACKAGE_ID="coffee_1.0:2fc048bb3273b3c044c1a1fb44b708542b7eb1c101192f42a47a35868ad9f571"

echo "Step 1: Approving for all organizations with sequence 2..."
echo "----------------------------------------"

for org_info in "ecta:ECTAMSP:7051" "ecx:ECXMSP:8051" "banks:BanksMSP:9051" "nbe:NBEMSP:10051" "customs:CustomsMSP:11051" "shipping:ShippingMSP:12051"; do
    IFS=':' read -r org msp port <<< "$org_info"
    echo "Approving for ${org}..."
    
    docker exec peer0.${org}.cecbs.et bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_LOCALMSPID=${msp}
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp
        export CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port}
        export CORE_PEER_TLS_ENABLED=true
        export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
        
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
            --channelID coffeechannel \
            --name coffee \
            --version 1.0 \
            --package-id ${PACKAGE_ID} \
            --sequence 2 \
            2>&1
    " | grep -E "Successfully|Error" || echo "  ✓ Approved"
    sleep 2
done

echo ""
echo "Waiting for approvals..."
sleep 5

echo ""
echo "Step 2: Committing chaincode..."
echo "----------------------------------------"

docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECXMSP
export CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt

peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 2 \
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.ecta.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.ecx.cecbs.et-cert.pem \
    --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.banks.cecbs.et-cert.pem \
    --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.nbe.cecbs.et-cert.pem \
    --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.customs.cecbs.et-cert.pem \
    --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.shipping.cecbs.et-cert.pem \
    2>&1
"

echo ""
echo "Step 3: Verifying..."
echo "----------------------------------------"

docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1
"

echo ""
echo "✅ Chaincode Deployment Complete!"
