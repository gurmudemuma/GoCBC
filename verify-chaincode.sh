#!/bin/bash

echo "=== Chaincode Deployment Verification ==="
echo ""

# Check if package exists
if [ -f "blockchain/channel-artifacts/coffee_1.0.tgz" ]; then
    echo "✅ Chaincode package exists"
else
    echo "❌ Chaincode package NOT found"
    exit 1
fi

# Check chaincode container
if docker ps | grep -q coffee-chaincode; then
    echo "✅ Chaincode container is running"
else
    echo "❌ Chaincode container is NOT running"
    exit 1
fi

# Try to query installed chaincode
echo ""
echo "Querying installed chaincode on peer0.ecta..."
QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
    peer lifecycle chaincode queryinstalled 2>&1
")

if echo "$QUERY_RESULT" | grep -q "Installed chaincodes on peer"; then
    echo "$QUERY_RESULT"
    
    if echo "$QUERY_RESULT" | grep -q "coffee_1.0"; then
        echo ""
        echo "✅ Chaincode is INSTALLED"
        
        # Extract package ID
        PACKAGE_ID=$(echo "$QUERY_RESULT" | grep "coffee_1.0" | awk -F 'Package ID: ' '{print $2}' | awk -F', Label:' '{print $1}')
        echo "Package ID: $PACKAGE_ID"
        
        # Check if committed
        echo ""
        echo "Checking if chaincode is committed to channel..."
        COMMIT_CHECK=$(docker exec peer0.ecta.cecbs.et bash -c "
            export FABRIC_CFG_PATH=/etc/hyperledger/fabric
            export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
            peer lifecycle chaincode querycommitted -C coffeechannel 2>&1
        ")
        
        if echo "$COMMIT_CHECK" | grep -q "coffee"; then
            echo "✅ Chaincode is COMMITTED to channel"
            echo "$COMMIT_CHECK"
        else
            echo "⚠️  Chaincode is NOT yet committed to channel"
            echo "Next step: Approve and commit chaincode"
        fi
    else
        echo "⚠️  Chaincode NOT installed yet"
        echo "Installing chaincode..."
        
        # Install chaincode
        for org in ecta ecx banks nbe customs shipping; do
            echo "Installing on ${org}..."
            docker cp blockchain/channel-artifacts/coffee_1.0.tgz peer0.${org}.cecbs.et:/tmp/
            docker exec peer0.${org}.cecbs.et bash -c "
                export FABRIC_CFG_PATH=/etc/hyperledger/fabric
                export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp
                peer lifecycle chaincode install /tmp/coffee_1.0.tgz 2>&1
            "
        done
        
        echo "Installation complete. Run this script again to verify."
    fi
else
    echo "❌ Could not query chaincode"
    echo "$QUERY_RESULT"
    exit 1
fi

echo ""
echo "=== Verification Complete ==="
