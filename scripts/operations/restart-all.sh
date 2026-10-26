#!/bin/bash
# Restart All CECBS Services (API + UI)

set -e

echo "=================================================="
echo "  Restarting All CECBS Services"
echo "=================================================="

# Step 1: Kill all processes and free ports
echo ""
echo "Step 1: Killing existing processes..."
bash kill-ports.sh

# Step 2: Wait for ports to be fully released
echo ""
echo "Step 2: Waiting for ports to be released..."
sleep 3

# Step 3: Restart API
echo ""
echo "Step 3: Starting API..."
bash start-api.sh

# Step 4: Restart UI
echo ""
echo "Step 4: Starting UI..."
bash start-ui.sh

# Step 5: Show status
echo ""
echo "=================================================="
echo "  ✅ All Services Restarted"
echo "=================================================="
echo ""
echo "📋 Check logs:"
echo "   API: bash logs-api.sh"
echo "   UI:  bash logs-ui.sh"
echo ""
echo "🔗 Access URLs:"
echo "   UI:  http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "🛑 To stop services:"
echo "   bash stop-api.sh"
echo "   bash stop-ui.sh"
echo ""
