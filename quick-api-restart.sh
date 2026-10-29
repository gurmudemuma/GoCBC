#!/bin/bash
pkill -f "ts-node-dev.*server.ts"
sleep 4
cd /home/guda/GoCBC/api
nohup npm run dev > /tmp/api-latest.log 2>&1 &
sleep 10
curl -s http://localhost:3001/health
