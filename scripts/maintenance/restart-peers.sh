#!/bin/bash

echo "=== Restarting Blockchain Peers ===" > /tmp/peer-restart.txt

cd /home/guda/GoCBC

echo "1. Restarting all peer containers..." >> /tmp/peer-restart.txt
docker-compose -f docker-compose-fabric.yml restart \
  peer0.ecta.cecbs.et \
  peer0.ecx.cecbs.et \
  peer0.banks.cecbs.et \
  peer0.nbe.cecbs.et \
  peer0.customs.cecbs.et \
  peer0.shipping.cecbs.et 2>&1 >> /tmp/peer-restart.txt

echo "2. Waiting 20 seconds for peers to restart..." >> /tmp/peer-restart.txt
sleep 20

echo "3. Checking peer status..." >> /tmp/peer-restart.txt
docker ps --filter "name=peer0" --format "table {{.Names}}\t{{.Status}}" >> /tmp/peer-restart.txt

echo "4. Testing peer connectivity..." >> /tmp/peer-restart.txt
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | head -5 >> /tmp/peer-restart.txt

cat /tmp/peer-restart.txt
