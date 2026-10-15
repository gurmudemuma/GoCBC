#!/bin/bash

echo "================================================================"
echo "FINAL COMPREHENSIVE FIX FOR API"
echo "================================================================"
echo ""

cd /home/guda/GoCBC/api

# Step 1: Ensure .env file exists and has required vars
echo "Step 1: Checking .env file..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    
    # Check for required vars
    if grep -q "JWT_SECRET=" .env && grep -q "DOCUMENT_ENCRYPTION_KEY=" .env; then
        echo "✓ Required environment variables are in .env"
    else
        echo "✗ Missing required variables, adding them..."
        cat >> .env << 'ENVEOF'

# ADDED BY FIX SCRIPT
JWT_SECRET=cecbs-secret-key-change-in-production-use-at-least-32-characters
DOCUMENT_ENCRYPTION_KEY=cecbs_document_encryption_key_2026_change_in_production_64chars
ENVEOF
    fi
else
    echo "✗ No .env file, creating one..."
    cat > .env << 'ENVEOF'
NODE_ENV=development
PORT=3001
JWT_SECRET=cecbs-secret-key-change-in-production-use-at-least-32-characters
JWT_EXPIRY=168h
DOCUMENT_ENCRYPTION_KEY=cecbs_document_encryption_key_2026_change_in_production_64chars
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
FABRIC_ENABLED=true
FABRIC_REQUIRED=false
FABRIC_AS_LOCALHOST=true
FABRIC_NETWORK_PATH=../blockchain/organizations
FABRIC_CHANNEL_NAME=coffeechannel
FABRIC_CHAINCODE_NAME=coffee
FABRIC_MSP_ID=ECTAMSP
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ENVEOF
    echo "✓ Created .env file"
fi

echo ""
echo "Step 2: Kill existing API processes..."
pkill -f "node.*dist/server.js" || true
pkill -f "node.*api" || true
sleep 2

echo ""
echo "Step 3: Starting API with environment variables from .env..."

# Load .env and start
set -a  # automatically export all variables
source .env
set +a

# Make sure critical vars are set
export JWT_SECRET="${JWT_SECRET:-cecbs-secret-key-change-in-production-use-at-least-32-characters}"
export DOCUMENT_ENCRYPTION_KEY="${DOCUMENT_ENCRYPTION_KEY:-cecbs_document_encryption_key_2026_change_in_production_64chars}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"
export DATABASE_URL="${DATABASE_URL:-postgresql://cecbs:cecbs123@localhost:5432/cecbs}"

echo "Environment loaded:"
echo "  JWT_SECRET: ${#JWT_SECRET} chars"
echo "  DOCUMENT_ENCRYPTION_KEY: ${#DOCUMENT_ENCRYPTION_KEY} chars"
echo "  PORT: $PORT"
echo "  DATABASE_URL: $DATABASE_URL"
echo ""

# Start in background
nohup node dist/server.js > /tmp/api-console-final.log 2>&1 &
PID=$!
echo "API started with PID: $PID"
echo $PID > /tmp/cecbs-api.pid

echo ""
echo "Step 4: Waiting 6 seconds for API to initialize..."
sleep 6

# Check if still running
if ps -p $PID > /dev/null 2>&1; then
    echo "✓ API process is running (PID: $PID)"
    
    # Test health
    echo ""
    echo "Step 5: Testing health endpoint..."
    HEALTH_JSON=$(curl -s http://localhost:3001/health)
    echo "$HEALTH_JSON" | jq . 2>/dev/null || echo "$HEALTH_JSON"
    
    if echo "$HEALTH_JSON" | grep -q '"status":"healthy"'; then
        echo ""
        echo "================================================================"
        echo "✓✓✓ SUCCESS! API IS RUNNING AND HEALTHY ✓✓✓"
        echo "================================================================"
        echo ""
        echo "Now do this:"
        echo "  1. Go to browser: http://localhost:3000"
        echo "  2. Login as: exp001 / password123"
        echo "  3. Click 'Contracts (0)' tab"
        echo "  4. You should see 20 contracts!"
        echo ""
        echo "API logs: tail -f /tmp/api-console-final.log"
        echo "API PID: $PID"
        echo ""
    else
        echo "✗ API not responding with healthy status"
        echo "Check logs: tail -50 /tmp/api-console-final.log"
    fi
else
    echo "✗ API process died"
    echo ""
    echo "Last 50 lines of log:"
    tail -50 /tmp/api-console-final.log 2>/dev/null || echo "No log file"
fi

echo ""
echo "================================================================"
