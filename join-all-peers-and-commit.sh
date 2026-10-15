#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"
CHAINCODE_VERSION="1.0"
SEQUENCE=1

echo "=== Joining All Peers to Channel and Committing Chaincode ==="

# List of all organizations and their peers
ORGS="nbe customs shipping"

# First, get the channel block (from a peer that's already joined)
echo "Fetching channel genesis block..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer channel fetch 0 /tmp/coffeechannel.block -c $CHANNEL_NAME \
    -o orderer.cecbs.et:7050 \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

echo "Channel block fetched."

# Join each peer to the channel
for org in $ORGS; do
    echo ""
    echo "--- Joining peer0.$org to channel ---"
    
    ORG_MSP=$(echo $org | sed 's/\b\(.\)/\u\1/')MSP
    
    # Copy the channel block to the peer
    docker cp peer0.ecx.cecbs.et:/tmp/coffeechannel.block /tmp/coffeechannel.block
    docker cp /tmp/coffeechannel.block peer0.$org.cecbs.et:/tmp/coffeechannel.block
    
    # Join the channel
    docker exec \
      -e CORE_PEER_LOCALMSPID=$ORG_MSP \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$org.cecbs.et/msp \
      peer0.$org.cecbs.et \
      peer channel join -b /tmp/coffeechannel.block || {
        echo "Warning: Failed to join $org to channel (might already be joined)"
      }
    
    echo "peer0.$org joined (or already member)"
done

# Now get the package ID
echo ""
echo "Getting chaincode package ID..."
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk -F'Package ID: |, Label:' '{print $2}' | head -1)

echo "Package ID: $PACKAGE_ID"

# Approve chaincode for each organization
for org in $ORGS; do
    echo ""
    echo "--- Approving chaincode for $org ---"
    
    ORG_MSP=$(echo $org | sed 's/\b\(.\)/\u\1/')MSP
    
    docker exec \
      -e CORE_PEER_LOCALMSPID=$ORG_MSP \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$org.cecbs.et/msp \
      peer0.$org.cecbs.et \
      peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID $CHANNEL_NAME \
        --name $CHAINCODE_NAME \
        --version $CHAINCODE_VERSION \
        --package-id "$PACKAGE_ID" \
        --sequence $SEQUENCE \
        --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem || {
          echo "Warning: Approval failed for $org"
        }
    
    echo "$org approval complete"
done

# Check commit readiness
echo ""
echo "Checking commit readiness..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness -C $CHANNEL_NAME -n $CHAINCODE_NAME --version $CHAINCODE_VERSION --sequence $SEQUENCE

# Commit the chaincode
echo ""
echo "Committing chaincode..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt

echo ""
echo "Verifying chaincode commitment..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME

echo ""
echo "=== SUCCESS! Chaincode committed ===" 
