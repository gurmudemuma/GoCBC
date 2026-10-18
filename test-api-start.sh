#!/bin/bash
cd /home/guda/GoCBC/api
echo "Starting API test..." > /tmp/api-test.log
npx ts-node src/server.ts >> /tmp/api-test.log 2>&1 &
API_PID=$!
echo "API PID: $API_PID" >> /tmp/api-test.log
sleep 5
if ps -p $API_PID > /dev/null; then
   echo "API is running" >> /tmp/api-test.log
   curl -s http://localhost:3001/health >> /tmp/api-test.log 2>&1
else
   echo "API failed to start" >> /tmp/api-test.log
fi
cat /tmp/api-test.log
