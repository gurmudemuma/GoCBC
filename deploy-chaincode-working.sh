#!/usr/bin/env bash
# Working chaincode deployment script
# Uses bash -c to avoid MSYS path conversion issues on Windows

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1

# Use the latest package ID (last one from the list)
PACKAGE_ID="coffee_1.11:1594e746feb39486ac95e8ecda01fa3694398137270c6c5d0613410fc0bac3a2"

echo "=========================================="
echo "Deploying Coffee Chaincode"
echo "Channel: $CHANNEL"
echo "Package: $PACKAGE_ID"
echo "=========================================="
echo ""

# Distribute orderer TLS cert to all peers
echo "[1/3] Distributing TLS certificates..."
ORDERER_TLS="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker exec $peer mkdir -p /var/hyperledger/orderer-tls 2>/dev/null || true
    docker cp "$ORDERER_TLS" $peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem
done

# Copy peer TLS certs
for org in ecta ecx banks nbe customs shipping; do
    PEER_TLS="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    for target_peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
        docker exec $target_peer mkdir -p /var/hyperledger/peer-tls 2>/dev/null || true
        docker cp "$PEER_TLS" $target_peer:/var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem
    done
done

echo "✓ TLS certificates distributed"
echo ""

# Approve for all organizations
echo "[2/3] Approving chaincode for all organizations..."

echo "  Approving ECTAMSP..."
docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECTAMSP
export CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE
"

echo "  Approving ECXMSP..."
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECXMSP
export CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE
"

echo "  Approving BanksMSP..."
docker exec peer0.banks.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp
export CORE_PEER_LOCALMSPID=BanksMSP
export CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE
"

echo "  Approving NBEMSP..."
docker exec peer0.nbe.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp
export CORE_PEER_LOCALMSPID=NBEMSP
export CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CC_SEQUENCE
"

echo "✓ Approved by 4 organizations (ECTA, ECX, Banks, NBE)"
echo ""

# Commit chaincode
echo "[3/3] Committing chaincode definition..."
docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECTAMSP
export CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecta.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecx.cecbs.et-cert.pem \
    --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.banks.cecbs.et-cert.pem \
    --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.nbe.cecbs.et-cert.pem \
    --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.customs.cecbs.et-cert.pem \
    --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.shipping.cecbs.et-cert.pem
"

echo "✓ Committed successfully!"
echo ""

# Verify
echo "Verifying deployment..."
sleep 2
docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME
"

echo ""
echo "=========================================="
echo "✅ CHAINCODE DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Test the chaincode:"
echo "  docker exec peer0.ecta.cecbs.et bash -c 'export FABRIC_CFG_PATH=/etc/hyperledger/fabric && export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp && peer chaincode query -C $CHANNEL -n $CC_NAME -c \"{\\\"Args\\\":[\\\"QueryAllExporters\\\"]}\"'"
echo ""
