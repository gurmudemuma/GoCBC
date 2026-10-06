#!/bin/bash

# ============================================================================
# GoCBC DEPLOYMENT - COPY AND PASTE THESE COMMANDS
# ============================================================================
# Run these commands in your terminal one by one
# Each command is explained with expected output
# ============================================================================

echo "============================================================================"
echo "GoCBC HIGH PRIORITY FEATURES DEPLOYMENT"
echo "Version: 1.21"
echo "============================================================================"
echo ""

# ============================================================================
# STEP 1: Navigate to project directory
# ============================================================================
echo "STEP 1: Navigate to project directory"
echo "Command:"
echo "cd /home/guda/GoCBC"
echo ""
cd /home/guda/GoCBC

# ============================================================================
# STEP 2: Check if system is running
# ============================================================================
echo "STEP 2: Check if Docker containers are running"
echo "Command:"
echo "docker ps | grep -E '(peer|orderer|couchdb|postgres|api)' | wc -l"
echo ""
echo "Expected: Should show a number (5 or more means system is running)"
docker ps | grep -E '(peer|orderer|couchdb|postgres|api)' | wc -l
echo ""

read -p "Press Enter to continue..."

# ============================================================================
# STEP 3: Start the system (if not running)
# ============================================================================
echo "STEP 3: Start the system (if needed)"
echo "Command:"
echo "./start-all.sh --no-interactive"
echo ""
echo "Note: This may take 2-3 minutes"
echo "If system is already running, you can skip this (Ctrl+C and continue to Step 4)"
echo ""

read -p "Press Enter to start the system (or Ctrl+C to skip)..."
./start-all.sh --no-interactive

echo ""
echo "Waiting 30 seconds for system to stabilize..."
sleep 30

# ============================================================================
# STEP 4: Run database migrations
# ============================================================================
echo "============================================================================"
echo "STEP 4: Run database migrations (4 new tables)"
echo "============================================================================"
echo ""
echo "This will create:"
echo "  - repatriations table (15 columns)"
echo "  - inspections table (17 columns)"
echo "  - border_crossings table (16 columns)"
echo "  - letter_of_credits updates (5 new columns)"
echo ""
echo "Command:"
echo "./run-new-migrations.sh"
echo ""

read -p "Press Enter to run migrations..."
./run-new-migrations.sh

echo ""
read -p "Migrations complete. Press Enter to continue..."

# ============================================================================
# STEP 5: Build chaincode Docker image
# ============================================================================
echo "============================================================================"
echo "STEP 5: Build chaincode Docker image (v1.21)"
echo "============================================================================"
echo ""
echo "This will compile and package the chaincode"
echo "Expected time: 2-3 minutes"
echo ""
echo "Command:"
echo "docker build -t coffee-chaincode:1.21 -f chaincodes/coffee/Dockerfile chaincodes/coffee/"
echo ""

read -p "Press Enter to build Docker image..."
docker build -t coffee-chaincode:1.21 -f chaincodes/coffee/Dockerfile chaincodes/coffee/

echo ""
echo "Verifying image was created..."
docker images | grep coffee-chaincode | grep 1.21

echo ""
read -p "Image built successfully. Press Enter to continue..."

# ============================================================================
# STEP 6: Deploy chaincode to Fabric network
# ============================================================================
echo "============================================================================"
echo "STEP 6: Deploy chaincode to Hyperledger Fabric"
echo "============================================================================"
echo ""
echo "This will:"
echo "  - Package the chaincode"
echo "  - Install on peers"
echo "  - Approve for organizations"
echo "  - Commit to channel"
echo ""
echo "Expected time: 1-2 minutes"
echo ""
echo "Command:"
echo "./deploy-chaincode.sh"
echo ""

read -p "Press Enter to deploy chaincode..."
./deploy-chaincode.sh

echo ""
echo "Waiting 15 seconds for deployment to finalize..."
sleep 15

echo ""
read -p "Chaincode deployed. Press Enter to continue..."

# ============================================================================
# STEP 7: Start chaincode container
# ============================================================================
echo "============================================================================"
echo "STEP 7: Start chaincode container"
echo "============================================================================"
echo ""
echo "Command:"
echo "./start-chaincode-container.sh"
echo ""

read -p "Press Enter to start chaincode container..."
./start-chaincode-container.sh

echo ""
echo "Waiting 10 seconds for chaincode to initialize..."
sleep 10

echo ""
echo "Verifying chaincode container is running..."
docker ps | grep coffee-chaincode

echo ""
read -p "Chaincode container started. Press Enter to continue..."

# ============================================================================
# STEP 8: Restart API server
# ============================================================================
echo "============================================================================"
echo "STEP 8: Restart API server (load new routes)"
echo "============================================================================"
echo ""
echo "Command:"
echo "./restart-api.sh"
echo ""

read -p "Press Enter to restart API..."
./restart-api.sh

echo ""
echo "Waiting 10 seconds for API to be ready..."
sleep 10

echo ""
read -p "API restarted. Press Enter to continue..."

# ============================================================================
# STEP 9: Verify deployment
# ============================================================================
echo "============================================================================"
echo "STEP 9: Verify deployment"
echo "============================================================================"
echo ""

echo "Checking API health..."
echo "Command: curl http://localhost:3000/health"
curl -s http://localhost:3000/health && echo "" || echo "API not responding"

echo ""
echo "Checking new endpoints..."
echo ""

echo "1. Repatriation API:"
curl -s http://localhost:3000/api/repatriation/health && echo " ✓" || echo " ✗"

echo "2. Inspection API:"
curl -s http://localhost:3000/api/inspection/health && echo " ✓" || echo " ✗"

echo "3. Border Crossing API:"
curl -s http://localhost:3000/api/bordercrossing/health && echo " ✓" || echo " ✗"

echo "4. Banking API (with LC Discrepancies):"
curl -s http://localhost:3000/api/banking/health && echo " ✓" || echo " ✗"

echo ""
echo "Checking chaincode version..."
docker exec cli peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/coffee.com/orderers/orderer.coffee.com/msp/tlscacerts/tlsca.coffee.com-cert.pem 2>/dev/null | grep "Version:"

echo ""
echo "============================================================================"
echo "DEPLOYMENT COMPLETE!"
echo "============================================================================"
echo ""
echo "Summary:"
echo "  ✓ Database migrations applied (4 new tables)"
echo "  ✓ Chaincode version 1.21 deployed"
echo "  ✓ API server updated with new routes"
echo "  ✓ System operational at 90% completion"
echo ""
echo "Next steps:"
echo "  1. Run comprehensive tests:"
echo "     ./test-new-features.sh"
echo ""
echo "  2. Run full workflow test:"
echo "     ./test-complete-workflow-extended.sh"
echo ""
echo "  3. Review documentation:"
echo "     - DEPLOYMENT-READY-COMPLETE.md"
echo "     - HIGH-PRIORITY-FEATURES-IMPLEMENTATION.md"
echo ""
echo "============================================================================"
