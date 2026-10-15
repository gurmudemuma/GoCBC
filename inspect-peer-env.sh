#!/bin/bash

echo "=== Peer Environment Variables ===" > /tmp/peer-env.txt
docker exec peer0.ecx.cecbs.et env | grep CORE_PEER >> /tmp/peer-env.txt 2>&1

echo "" >> /tmp/peer-env.txt
echo "=== MSP Directory Contents ===" >> /tmp/peer-env.txt
docker exec peer0.ecx.cecbs.et ls -la /etc/hyperledger/fabric/msp 2>&1 >> /tmp/peer-env.txt || echo "MSP dir not found" >> /tmp/peer-env.txt

echo "" >> /tmp/peer-env.txt
echo "=== Checking for admin certs ===" >> /tmp/peer-env.txt
docker exec peer0.ecx.cecbs.et find /etc/hyperledger -name "*Admin*" -o -name "*admin*" 2>&1 | head -20 >> /tmp/peer-env.txt

cat /tmp/peer-env.txt
