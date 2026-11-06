#!/bin/bash
echo "Verifying permission fixes in scripts..."
echo ""

echo "1. Checking start-all.sh for permission fix..."
if grep -q "chown.*CHAINCODE_PACKAGE" /home/guda/GoCBC/start-all.sh; then
    echo "   ✓ start-all.sh has permission fix"
else
    echo "   ✗ start-all.sh missing permission fix"
fi

echo ""
echo "2. Checking deploy-chaincode.sh for permission fix..."
if grep -q "chown.*CHAINCODE_PACKAGE" /home/guda/GoCBC/deploy-chaincode.sh; then
    echo "   ✓ deploy-chaincode.sh has permission fix"
else
    echo "   ✗ deploy-chaincode.sh missing permission fix"
fi

echo ""
echo "3. Checking for sudo fallback logic..."
if grep -q "sudo chown" /home/guda/GoCBC/start-all.sh; then
    echo "   ✓ start-all.sh has sudo fallback"
else
    echo "   ✗ start-all.sh missing sudo fallback"
fi

echo ""
echo "Verification complete!"
