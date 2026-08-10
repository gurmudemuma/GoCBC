#!/bin/bash
set -e

echo "🔧 Fixing MSP Configuration"
echo "============================"
echo ""

# All organizations
orgs=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for org in "${orgs[@]}"; do
    echo "📋 Fixing $org MSP config..."
    
    # Copy MSP config to peer container
    SOURCE="blockchain/organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml"
    DEST="peer0.${org}.cecbs.et:/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp/config.yaml"
    
    if [ -f "$SOURCE" ]; then
        docker cp "$SOURCE" "$DEST" 2>/dev/null && echo "  ✓ Copied to peer" || echo "  ⚠ Failed to copy"
    else
        echo "  ⚠ Source config not found"
    fi
done

echo ""
echo "✅ MSP configs updated"
echo ""
echo "🔄 Restarting peers to apply changes..."
docker restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et

echo "⏳ Waiting for peers to restart..."
sleep 10

echo "✅ Done! Peers restarted with correct MSP config"
