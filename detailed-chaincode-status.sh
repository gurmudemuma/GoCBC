#!/bin/bash

OUTPUT=/tmp/chaincode-status-detailed.txt

echo "=== Checking Chaincode on All Peers ===" > $OUTPUT
echo "" >> $OUTPUT

for peer in peer0.ecta peer0.ecx peer0.nbe peer0.customs peer0.shipping; do
    echo "--- $peer.cecbs.et ---" >> $OUTPUT
    echo "Installed:" >> $OUTPUT
    docker exec $peer.cecbs.et peer lifecycle chaincode queryinstalled >> $OUTPUT 2>&1
    echo "" >> $OUTPUT
    echo "Committed on coffeechannel:" >> $OUTPUT
    docker exec $peer.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel >> $OUTPUT 2>&1
    echo "" >> $OUTPUT
    echo "==================" >> $OUTPUT
    echo "" >> $OUTPUT
done

cat $OUTPUT
