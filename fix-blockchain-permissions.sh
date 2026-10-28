#!/bin/bash
# Fix blockchain certificate permissions for non-root access

echo "Fixing blockchain certificate permissions..."
echo "This script needs sudo to change ownership from root to current user"
echo ""

# Get current user
CURRENT_USER=$(whoami)

# Fix blockchain certificates
echo "1. Fixing blockchain organization certificates..."
sudo chown -R $CURRENT_USER:$CURRENT_USER /home/guda/GoCBC/blockchain/organizations/ 2>/dev/null
sudo chmod -R u+r /home/guda/GoCBC/blockchain/organizations/ 2>/dev/null

# Fix API wallet
echo "2. Fixing API wallet directory..."
sudo chown -R $CURRENT_USER:$CURRENT_USER /home/guda/GoCBC/api/wallet/ 2>/dev/null
sudo chmod -R 700 /home/guda/GoCBC/api/wallet/ 2>/dev/null

# Verify fixes
echo ""
echo "3. Verifying permissions..."
ls -l /home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp/keystore/priv_sk 2>/dev/null && echo "✅ ECTA certificates readable"
ls -la /home/guda/GoCBC/api/wallet/ 2>/dev/null | head -3

echo ""
echo "✅ Permission fix complete!"
echo "Run: cd /home/guda/GoCBC/api && node simple-test.js"
