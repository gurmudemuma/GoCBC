#!/bin/bash

echo "=========================================="
echo "System Verification Report"
echo "=========================================="
echo ""

echo "1. Database Tables (Migration)"
echo "----------------------------------------"
TABLE_COUNT=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')
echo "✓ Found ${TABLE_COUNT} tables in database"
echo ""

echo "2. Peer Channel Membership"
echo "----------------------------------------"
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo -n "${peer}: "
    CHANNELS=$(docker exec ${peer} peer channel list 2>&1 | grep "coffeechannel" || echo "NOT JOINED")
    if echo "$CHANNELS" | grep -q "coffeechannel"; then
        echo "✓ Joined coffeechannel"
    else
        echo "✗ Not joined"
    fi
done
echo ""

echo "3. Chaincode Status"
echo "----------------------------------------"
# Check installed chaincode
INSTALLED=$(docker exec peer0.ecx.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
    peer lifecycle chaincode queryinstalled 2>&1" | grep "coffee_1.0")

if [ -n "$INSTALLED" ]; then
    echo "✓ Chaincode installed: coffee_1.0"
else
    echo "✗ Chaincode not installed"
fi

# Check committed chaincode
COMMITTED=$(docker exec peer0.ecx.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
    peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1")

if echo "$COMMITTED" | grep -q "Version:"; then
    VERSION=$(echo "$COMMITTED" | grep -oP 'Version: \K[^\s,]+')
    SEQUENCE=$(echo "$COMMITTED" | grep -oP 'Sequence: \K[^\s,]+')
    echo "✓ Chaincode committed: Version $VERSION, Sequence $SEQUENCE"
else
    echo "✗ Chaincode not committed"
fi

# Check chaincode container
if docker ps --filter "name=coffee-chaincode" --format "{{.Names}}" | grep -q "coffee-chaincode"; then
    echo "✓ Chaincode container running"
else
    echo "✗ Chaincode container not running"
fi
echo ""

echo "4. Channel Configuration"
echo "----------------------------------------"
docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel 2>&1 | grep -E "height|CurrentBlockHash" || echo "Channel not accessible"
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
