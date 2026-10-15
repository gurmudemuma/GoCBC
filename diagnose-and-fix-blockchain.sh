#!/bin/bash

# Comprehensive Blockchain Diagnostics and Fix
# This script diagnoses the blockchain issue and attempts to fix it

OUTPUT_FILE="/tmp/blockchain-diagnosis.txt"

echo "===============================================" > $OUTPUT_FILE
echo "Blockchain Diagnostics Report" >> $OUTPUT_FILE
echo "===============================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
date >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 1. Check if channel exists
echo "=== 1. Channel Status ===" >> $OUTPUT_FILE
docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel 2>&1 >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 2. Check chaincode installed
echo "=== 2. Installed Chaincodes ===" >> $OUTPUT_FILE
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 3. Check chaincode committed
echo "=== 3. Committed Chaincodes ===" >> $OUTPUT_FILE
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1 >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 4. Check chaincode container
echo "=== 4. Chaincode Container Status ===" >> $OUTPUT_FILE
docker ps | grep coffee >> $OUTPUT_FILE 2>&1
echo "" >> $OUTPUT_FILE

# 5. Try a simple commit with proper paths
echo "=== 5. Attempting Chaincode Commit ===" >> $OUTPUT_FILE

# Get package ID
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "coffee" | head -1 | awk '{print $3}' | sed 's/,//')
echo "Package ID: $PACKAGE_ID" >> $OUTPUT_FILE

if [ -n "$PACKAGE_ID" ]; then
    # Try to commit the chaincode
    echo "Committing chaincode..." >> $OUTPUT_FILE
    
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --sequence 1 \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
        --peerAddresses peer0.ecx.cecbs.et:8051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        2>&1 >> $OUTPUT_FILE
    
    echo "Commit attempt completed" >> $OUTPUT_FILE
else
    echo "ERROR: No package ID found" >> $OUTPUT_FILE
fi

echo "" >> $OUTPUT_FILE

# 6. Check committed status after attempt
echo "=== 6. Committed Status After Fix Attempt ===" >> $OUTPUT_FILE
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel -n coffee 2>&1 >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 7. Test chaincode invoke
echo "=== 7. Test Chaincode Invoke ===" >> $OUTPUT_FILE
docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"QueryAllExporters","Args":[]}' \
    2>&1 >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "===============================================" >> $OUTPUT_FILE
echo "Diagnostics Complete" >> $OUTPUT_FILE
echo "===============================================" >> $OUTPUT_FILE

# Output results
cat $OUTPUT_FILE

echo ""
echo "Full report saved to: $OUTPUT_FILE"
echo ""
