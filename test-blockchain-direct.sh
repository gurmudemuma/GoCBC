#!/bin/bash

echo "================================================================"
echo "  Direct Blockchain Test (Without Orderer TLS Issues)"
echo "================================================================"
echo ""

# Test 1: Query chaincode (doesn't need orderer)
echo "1. Testing chaincode query (no orderer needed)..."
QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllContracts","Args":[]}' 2>&1)

if echo "$QUERY_RESULT" | grep -qE "\[|\{|success|Contract"; then
  echo "✓ Chaincode query works"
  echo "   Found contracts on blockchain"
else
  echo "❌ Chaincode query failed"
  echo "$QUERY_RESULT"
fi

echo ""
echo "2. Testing chaincode invocation WITH proper TLS..."

# Create test contract using proper TLS settings
TEST_CONTRACT_ID="CONT-TEST-$(date +%s)"

INVOKE_RESULT=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
  peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls \
  --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  -C coffeechannel \
  -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  -c "{\"function\":\"RegisterSalesContract\",\"Args\":[
    \"$TEST_CONTRACT_ID\",
    \"EXP-TEST-001\",
    \"BUYER-TEST-001\",
    \"USA\",
    \"Arabica Grade 1\",
    \"100\",
    \"10\",
    \"USD\",
    \"true\",
    \"Bank of America\",
    \"Commercial Bank of Ethiopia\",
    \"[]\"
  ]}" \
  --waitForEvent 2>&1)

echo "Invocation result:"
echo "$INVOKE_RESULT"

if echo "$INVOKE_RESULT" | grep -qE "Chaincode invoke successful|result: status:200"; then
  echo ""
  echo "✓ Contract creation successful!"
  
  # Verify the contract exists
  echo ""
  echo "3. Verifying contract on blockchain..."
  sleep 3
  
  VERIFY_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c "{\"function\":\"ReadSalesContract\",\"Args\":[\"$TEST_CONTRACT_ID\"]}" 2>&1)
  
  if echo "$VERIFY_RESULT" | grep -q "$TEST_CONTRACT_ID"; then
    echo "✓ Contract verified: $TEST_CONTRACT_ID"
    echo ""
    echo "================================================================"
    echo "  ✓ BLOCKCHAIN IS WORKING CORRECTLY!"
    echo "================================================================"
    echo ""
    echo "The issue is with the API's blockchain connection settings."
    echo "Check: /home/guda/GoCBC/api/src/services/fabricService.ts"
  else
    echo "⚠ Contract not found on query"
    echo "$VERIFY_RESULT"
  fi
else
  echo ""
  echo "❌ Contract creation failed"
  
  # Check if it's a timeout issue
  if echo "$INVOKE_RESULT" | grep -q "context deadline exceeded"; then
    echo ""
    echo "DIAGNOSIS: Orderer connection timeout"
    echo "  - Orderer is running but not accepting connections properly"
    echo "  - Possible causes:"
    echo "    1. TLS certificate mismatch"
    echo "    2. Network routing issue"
    echo "    3. Orderer needs restart"
    echo ""
    echo "SOLUTION: Restart orderer with:"
    echo "  docker restart orderer.cecbs.et"
  fi
fi

echo ""
