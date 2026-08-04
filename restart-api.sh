#!/bin/bash
# Restart API Server

echo "🔄 Restarting CECBS API Server..."
bash stop-api.sh
sleep 1
bash start-api.sh
