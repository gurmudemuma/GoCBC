#!/bin/bash
set -e

echo "🔧 FINAL FIX: Re-enable NodeOUs with correct config"
echo "===================================================="
echo ""

# Re-enable NodeOUs for all orgs
orgs=("ecta" "ecx" "banks" "nbe" "customs" "shipping")

for org in "${orgs[@]}"; do
    CONFIG="blockchain/organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml"
    sed -i 's/Enable: false/Enable: true/g' "$CONFIG"
done

echo "✓ NodeOUs re-enabled"
echo ""

# Now restart fabric network cleanly
echo "🔄 Restarting fabric network..."
cd /c/goCBC
docker-compose -f docker-compose-fabric.yml restart

echo "⏳ Waiting for network (30s)..."
sleep 30

echo ""
echo "✅ Network restarted"
echo ""

# Now run test
echo "🧪 Testing system..."
sleep 5
bash test-all-features.sh
