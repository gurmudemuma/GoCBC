#!/bin/bash
set -e

echo "🔧 Fixing Peer MSP with admincerts"
echo "===================================="
echo ""

orgs=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for org in "${orgs[@]}"; do
    echo "📋 Fixing $org peer MSP..."
    
    BASE="blockchain/organizations/peerOrganizations/${org}.cecbs.et"
    
    # Create peer MSP admincerts directory and copy admin cert
    docker exec "peer0.${org}.cecbs.et" sh -c "mkdir -p /etc/hyperledger/fabric/msp/admincerts" 2>/dev/null || true
    docker cp "$BASE/msp/admincerts/Admin@${org}.cecbs.et-cert.pem" "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/msp/admincerts/"
    
    echo "  ✓ Peer MSP fixed"
done

echo ""
echo "✅ All peer MSPs configured"
echo ""
echo "🔄 Restarting peers..."
docker-compose -f docker-compose-fabric.yml restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et

echo "⏳ Waiting for peers to start..."
sleep 15

echo ""
echo "✅ Testing admin access..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
