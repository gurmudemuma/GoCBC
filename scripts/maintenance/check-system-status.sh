#!/bin/bash

echo "=== System Status Check ===" > /tmp/system-status.txt
echo "Date: $(date)" >> /tmp/system-status.txt
echo "" >> /tmp/system-status.txt

echo "=== Docker Containers ===" >> /tmp/system-status.txt
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> /tmp/system-status.txt 2>&1
echo "" >> /tmp/system-status.txt

echo "=== Ports in Use ===" >> /tmp/system-status.txt
lsof -i:3000 -i:3001 -i:5432 -i:7051 2>/dev/null | head -20 >> /tmp/system-status.txt
echo "" >> /tmp/system-status.txt

echo "=== API Health ===" >> /tmp/system-status.txt
curl -s http://localhost:3001/health >> /tmp/system-status.txt 2>&1 || echo "API not responding" >> /tmp/system-status.txt
echo "" >> /tmp/system-status.txt

echo "=== UI Health ===" >> /tmp/system-status.txt
curl -s http://localhost:3000 | head -5 >> /tmp/system-status.txt 2>&1 || echo "UI not responding" >> /tmp/system-status.txt
echo "" >> /tmp/system-status.txt

echo "=== Blockchain Peer Status ===" >> /tmp/system-status.txt
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | head -10 >> /tmp/system-status.txt
echo "" >> /tmp/system-status.txt

cat /tmp/system-status.txt
