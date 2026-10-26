#!/bin/bash
# Restart UI Server

echo "🔄 Restarting CECBS UI Server..."
bash stop-ui.sh
sleep 1
bash start-ui.sh
