#!/bin/bash
docker ps --filter "name=peer0" --format "table {{.Names}}\t{{.Status}}" > /tmp/peer-status.txt
echo "" >> /tmp/peer-status.txt
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | head -3 >> /tmp/peer-status.txt
cat /tmp/peer-status.txt
