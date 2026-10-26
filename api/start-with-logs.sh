#!/bin/bash
cd /home/guda/GoCBC/api
echo "Starting API at $(date)" > startup.log
node dist/server.js >> startup.log 2>&1 &
echo $! > api.pid
echo "API started with PID $(cat api.pid)"
echo "Check logs: tail -f /home/guda/GoCBC/api/startup.log"
