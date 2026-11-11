#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# GoCBC Portal Validation - Start System & Run Tests
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ GOCBC PORTAL TAB VALIDATION RUNNER                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if API is already running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ API is already running"
    echo ""
else
    echo "⚠ API is not running. Starting system..."
    echo ""
    
    # Start the system
    cd /home/guda/GoCBC
    ./start-all.sh
    
    echo ""
    echo "⏳ Waiting for services to be ready (60 seconds)..."
    sleep 60
    
    # Check if API is now running
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✓ API is now running"
        echo ""
    else
        echo "✗ Failed to start API"
        echo "Please check the logs and start manually with: ./start-all.sh"
        exit 1
    fi
fi

# Run the portal validation test
echo "Starting portal tab validation..."
echo ""

cd /home/guda/GoCBC/tests/ui
bash PORTAL-TAB-DATA-VALIDATION.sh

exit $?
