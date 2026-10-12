#!/bin/bash
set -e

echo "🔧 Disabling NodeOUs for all organizations"
echo "==========================================="
echo ""

orgs=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for org in "${orgs[@]}"; do
    echo "📋 Disabling NodeOU for $org..."
    
    CONFIG="blockchain/organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml"
    
    # Disable NodeOUs
    sed -i 's/Enable: true/Enable: false/g' "$CONFIG"
    
    # Copy to peer containers - both locations
    docker cp "$CONFIG" "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/msp/config.yaml" 2>/dev/null || true
    docker cp "$CONFIG" "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp/config.yaml" 2>/dev/null || true
    
    echo "  ✓ NodeOUs disabled"
done

echo ""
echo "✅ NodeOUs disabled for all organizations"
echo ""
echo "🔄 Restarting peers..."
docker restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et

echo "⏳ Waiting..."
sleep 10

echo ""
echo "✅ Testing admin access..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
