#!/bin/bash
##################################################################
# COMPLETE SYSTEM DEPLOYMENT - Expert Version
# - Cleans old chaincode packages
# - Deploys with clean state
# - Fixes all endorsement issues
##################################################################

set -e

echo "=========================================="
echo "  COMPLETE DEPLOYMENT - EXPERT MODE"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

# Clean old chaincode packages FIRST
echo "1. Cleaning old chaincode packages..."
cd chaincodes/coffee
BEFORE=$(ls -1 coffee_*.{tgz,tar.gz} 2>/dev/null | wc -l)
echo "   Found $BEFORE old packages"
ls -t coffee_*.tgz 2>/dev/null | tail -n +2 | xargs -r rm -f
ls -t coffee_*.tar.gz 2>/dev/null | xargs -r rm -f
AFTER=$(ls -1 coffee_*.tgz 2>/dev/null | wc -l)
echo "   Kept $AFTER packages (cleaned $((BEFORE - AFTER)))"
cd ../..

# Run start-all with clean state
echo ""
echo "2. Starting system with CLEAN state..."
echo ""
export CLEAN_START=true
./start-all.sh

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "System should now be running at:"
echo "  UI:  http://localhost:3000"
echo "  API: http://localhost:3001"
echo ""
