#!/bin/bash

echo "=== API Container Status ===" > /tmp/status-check.txt
docker ps --filter "name=cecbs-api" >> /tmp/status-check.txt 2>&1

echo "" >> /tmp/status-check.txt
echo "=== API Logs (last 30 lines) ===" >> /tmp/status-check.txt
docker logs cecbs-api --tail 30 >> /tmp/status-check.txt 2>&1

echo "" >> /tmp/status-check.txt
echo "=== Port 3001 Status ===" >> /tmp/status-check.txt
lsof -i :3001 >> /tmp/status-check.txt 2>&1 || echo "No process on port 3001" >> /tmp/status-check.txt

echo "" >> /tmp/status-check.txt
echo "=== API Health Check ===" >> /tmp/status-check.txt
curl -s http://localhost:3001/health >> /tmp/status-check.txt 2>&1 || echo "API not responding" >> /tmp/status-check.txt

echo "" >> /tmp/status-check.txt
echo "=== Port 3000 Status ===" >> /tmp/status-check.txt
lsof -i :3000 >> /tmp/status-check.txt 2>&1 || echo "No process on port 3000" >> /tmp/status-check.txt

cat /tmp/status-check.txt
