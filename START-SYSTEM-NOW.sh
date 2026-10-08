#!/bin/bash
# Start system - captures output properly

cd /home/guda/GoCBC

echo "Stopping any existing services..."
./stop-all.sh > /dev/null 2>&1

echo "Starting system with clean state..."
export CLEAN_START=true

# Start with input redirect
echo "1" | ./start-all.sh --no-interactive 2>&1 | tee /tmp/full-startup.log

echo ""
echo "==========================================="
echo "Startup log saved to: /tmp/full-startup.log"
echo "==========================================="
echo ""
echo "To check migration:"
echo "  grep -A 20 'Running database migrations' /tmp/full-startup.log"
echo ""
echo "To check chaincode:"
echo "  grep -A 20 'Deploying Complete Chaincode' /tmp/full-startup.log"
echo ""
