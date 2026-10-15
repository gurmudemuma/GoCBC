#!/bin/bash

echo "=== Docker Containers Status ===" > /tmp/network-status.txt
docker ps --format "{{.Names}} - {{.Status}}" >> /tmp/network-status.txt 2>&1

echo "" >> /tmp/network-status.txt
echo "=== Chaincode Status ===" >> /tmp/network-status.txt
docker exec peer0.ecx.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel -n coffee 2>&1 >> /tmp/network-status.txt || echo "Chaincode query failed" >> /tmp/network-status.txt

echo "" >> /tmp/network-status.txt
echo "=== Process Status ===" >> /tmp/network-status.txt
pgrep -f "start-all.sh" >> /tmp/network-status.txt 2>&1 || echo "start-all.sh not running" >> /tmp/network-status.txt

cat /tmp/network-status.txt
