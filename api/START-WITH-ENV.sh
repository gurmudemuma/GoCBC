#!/bin/bash

cd /home/guda/GoCBC/api

echo "Starting API with explicit environment variables..."

# Export all required env vars
export NODE_ENV=production
export PORT=3001
export JWT_SECRET=cecbs-secret-key-change-in-production-use-at-least-32-characters
export JWT_EXPIRY=168h
export DOCUMENT_ENCRYPTION_KEY=cecbs_document_encryption_key_2026_change_in_production_64chars
export DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
export FABRIC_ENABLED=true
export FABRIC_REQUIRED=false
export FABRIC_AS_LOCALHOST=true
export FABRIC_NETWORK_PATH=../blockchain/organizations
export FABRIC_WALLET_PATH=./wallet
export FABRIC_CCP_PATH=../blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json
export FABRIC_CHANNEL_NAME=coffeechannel
export FABRIC_CHAINCODE_NAME=coffee
export FABRIC_MSP_ID=ECTAMSP
export ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
export API_BASE_URL=http://localhost:3001/api/v1
export LOG_LEVEL=info

echo "Environment variables set"
echo "JWT_SECRET length: ${#JWT_SECRET}"
echo "DOCUMENT_ENCRYPTION_KEY length: ${#DOCUMENT_ENCRYPTION_KEY}"
echo ""

# Start API
node dist/server.js > /tmp/api-full.log 2>&1 &
PID=$!

echo "API started with PID: $PID"
echo $PID > /tmp/cecbs-api.pid

sleep 5

if ps -p $PID > /dev/null 2>&1; then
    echo "✓ API is running"
    
    # Test
    echo "Testing health..."
    curl -s http://localhost:3001/health | jq .
    
    echo ""
    echo "SUCCESS! API is running."
    echo "Check logs: tail -f /tmp/api-full.log"
else
    echo "✗ API died"
    echo "Logs:"
    cat /tmp/api-full.log
fi
