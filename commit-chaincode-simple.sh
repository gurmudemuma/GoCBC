#!/bin/bash
# Simple chaincode commit script

set -e

CHANNEL_NAME="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.0"
CC_SEQUENCE=1

# Get the package ID from any peer
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep "$CC_NAME" | head -1 | awk '{print $3}' | sed 's/,//')

echo "Package ID: $PACKAGE_ID"

if [ -z "$PACKAGE_ID" ]; then
    echo "Error: Chaincode not installed"
    exit 1
fi

# Approve for all orgs
echo "Approving chaincode for all organizations..."

docker exec peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

docker exec peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

docker exec peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

docker exec peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

docker exec peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

docker exec peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --package-id $PACKAGE_ID --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050

echo "✅ All organizations approved"

# Commit chaincode
echo "Committing chaincode..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION \
  --sequence $CC_SEQUENCE \
  --tls --cafile /etc/hyperledger/fabric/tls/ca.crt \
  -o orderer.cecbs.et:7050 \
  --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

echo "✅ Chaincode committed successfully!"
