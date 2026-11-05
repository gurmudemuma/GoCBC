#!/bin/bash

set -e

echo "========================================="
echo "Fixing Chaincode Connection"
echo "========================================="

cd /home/guda/GoCBC

# Step 1: Reinstall chaincode on all peers
echo ""
echo "Step 1: Installing chaincode package on all peers..."
PEERS=("peer0.ecta.cecbs.et:7051:ECTAMSP" "peer0.ecx.cecbs.et:8051:ECXMSP" "peer0.banks.cecbs.et:9051:BanksMSP" "peer0.nbe.cecbs.et:10051:NBEMSP" "peer0.customs.cecbs.et:11051:CustomsMSP" "peer0.shipping.cecbs.et:12051:ShippingMSP")

for peer_info in "${PEERS[@]}"; do
    IFS=':' read -r peer_addr peer_port msp_id <<< "$peer_info"
    echo "Installing on $peer_addr..."
    
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_ADDRESS=$peer_addr:$peer_port \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        $peer_addr peer lifecycle chaincode install \
        /etc/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz 2>&1 | grep -E "Chaincode code package|already installed" || true
done

# Step 2: Get package ID
echo ""
echo "Step 2: Getting package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID: coffee_1.73" | sed -n 's/^.*Package ID: //; s/, Label:.*$//p' | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID"
    exit 1
fi

echo "Package ID: $PACKAGE_ID"

# Step 3: Approve for all orgs
echo ""
echo "Step 3: Approving chaincode for all organizations..."

APPROVALS=("peer0.ecta.cecbs.et:7051:ECTAMSP:ecta" "peer0.ecx.cecbs.et:8051:ECXMSP:ecx" "peer0.banks.cecbs.et:9051:BanksMSP:banks" "peer0.nbe.cecbs.et:10051:NBEMSP:nbe" "peer0.customs.cecbs.et:11051:CustomsMSP:customs" "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping")

for approval_info in "${APPROVALS[@]}"; do
    IFS=':' read -r peer_addr peer_port msp_id org_name <<< "$approval_info"
    echo "Approving for $org_name ($msp_id)..."
    
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_ADDRESS=$peer_addr:$peer_port \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        $peer_addr peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id $PACKAGE_ID \
        --sequence 1 2>&1 | grep -E "successful|already" || true
done

# Step 4: Check commit readiness
echo ""
echo "Step 4: Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | grep -A 10 "Chaincode definition"

# Step 5: Commit if needed
echo ""
echo "Step 5: Committing chaincode..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/customs-ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt 2>&1 | grep -E "successful|already"

# Step 6: Test invoke
echo ""
echo "Step 6: Testing chaincode invoke..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    -c '{"function":"initLedger","Args":[]}' 2>&1

echo ""
echo "========================================="
echo "Done!"
echo "========================================="
