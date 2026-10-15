#!/bin/bash

CHAINCODE_NAME="coffee"
CHANNEL_NAME="coffeechannel"

echo "=== Checking Chaincode Approvals ===" > /tmp/approvals.txt

for org in ecx ecta; do
    echo "" >> /tmp/approvals.txt
    echo "--- Checking $org ---" >> /tmp/approvals.txt
    docker exec \
      -e CORE_PEER_LOCALMSPID=$(echo $org | tr '[:lower:]' '[:upper:]')MSP \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$org.cecbs.et/msp \
      peer0.$org.cecbs.et \
      peer lifecycle chaincode checkcommitreadiness -C $CHANNEL_NAME -n $CHAINCODE_NAME --version 1.0 --sequence 1 >> /tmp/approvals.txt 2>&1
done

cat /tmp/approvals.txt
