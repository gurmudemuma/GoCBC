#!/bin/bash
# Quick start script - starts system cleanly

set -e

cd /home/guda/GoCBC

echo "=========================================="
echo "🚀 QUICK START - GoCBC System"
echo "=========================================="
echo ""

# Stop any existing services
echo "1. Stopping existing services..."
./stop-all.sh 2>&1 | grep -E "✓|⚠|❌" || true
sleep 3

# Clean start
echo ""
echo "2. Starting with clean state..."
export CLEAN_START=true

# Start non-interactively
echo "3. Launching all services..."
./start-all.sh --no-interactive --skip-tests 2>&1 | tee /tmp/gocbc-startup.log

echo ""
echo "=========================================="
echo "✅ STARTUP COMPLETE"
echo "=========================================="
echo ""
echo "Check full logs: cat /tmp/gocbc-startup.log"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo ""
