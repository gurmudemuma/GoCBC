#!/bin/bash
set -e

echo "🔧 Fixing Admin Certificates"
echo "============================="
echo ""

orgs=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for org in "${orgs[@]}"; do
    echo "📋 Processing $org..."
    
    BASE="blockchain/organizations/peerOrganizations/${org}.cecbs.et"
    ADMIN_MSP="$BASE/users/Admin@${org}.cecbs.et/msp"
    
    # Create admincerts directory
    mkdir -p "$ADMIN_MSP/admincerts"
    
    # Copy admin cert to admincerts
    cp "$ADMIN_MSP/signcerts/Admin@${org}.cecbs.et-cert.pem" "$ADMIN_MSP/admincerts/"
    
    # Also copy to peer MSP
    mkdir -p "$BASE/msp/admincerts"
    cp "$ADMIN_MSP/signcerts/Admin@${org}.cecbs.et-cert.pem" "$BASE/msp/admincerts/"
    
    # Copy entire MSP to peer container
    docker exec "peer0.${org}.cecbs.et" sh -c "mkdir -p /etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp/admincerts" 2>/dev/null || true
    docker cp "$ADMIN_MSP/signcerts/Admin@${org}.cecbs.et-cert.pem" "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp/admincerts/"
    
    echo "  ✓ Admin cert configured"
done

echo ""
echo "✅ All admin certificates configured"
echo ""
echo "🔄 Restarting peers..."
docker restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et

echo "⏳ Waiting for peers..."
sleep 10

echo ""
echo "✅ Complete! Testing admin access..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | head -5
