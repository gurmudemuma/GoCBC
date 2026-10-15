#!/bin/bash

echo "=== Checking API Status ===" > /tmp/api-status.txt
echo "" >> /tmp/api-status.txt

echo "Docker containers:" >> /tmp/api-status.txt
docker ps --format "{{.Names}}: {{.Status}}" | grep -E "(api|postgres|redis)" >> /tmp/api-status.txt 2>&1

echo "" >> /tmp/api-status.txt
echo "API health check:" >> /tmp/api-status.txt
curl -s http://localhost:3001/health 2>&1 >> /tmp/api-status.txt || echo "API not responding" >> /tmp/api-status.txt

echo "" >> /tmp/api-status.txt
echo "Node processes:" >> /tmp/api-status.txt
ps aux | grep -E "node|npm" | grep -v grep >> /tmp/api-status.txt 2>&1 || echo "No node processes" >> /tmp/api-status.txt

cat /tmp/api-status.txt
