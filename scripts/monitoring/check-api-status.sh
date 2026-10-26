#!/bin/bash

echo "=== API Process Check ==="
ps aux | grep -E "node.*api|npm.*dev" | grep -v grep || echo "No API processes running"

echo ""
echo "=== Port 3001 Check ==="
ss -tln | grep :3001 || echo "Port 3001 not listening"

echo ""
echo "=== API Health Check ==="
curl -s -m 5 http://localhost:3001/health 2>&1 || echo "API not responding"

echo ""
echo "=== Recent API Logs (last 30 lines) ==="
if [ -f /home/guda/GoCBC/logs/api.log ]; then
    tail -30 /home/guda/GoCBC/logs/api.log
else
    echo "No API log file found"
fi
