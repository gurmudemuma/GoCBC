#!/bin/bash

# Diagnostic Report Generator
# Collects all relevant information for Hyperledger Fabric troubleshooting

OUTPUT_FILE="blockchain-diagnostic-$(date +%Y%m%d-%H%M%S).txt"

echo "Generating diagnostic report: $OUTPUT_FILE"
echo "This will take 1-2 minutes..."
echo ""

{
    echo "=========================================="
    echo "HYPERLEDGER FABRIC DIAGNOSTIC REPORT"
    echo "Generated: $(date)"
    echo "=========================================="
    echo ""

    echo "=========================================="
    echo "1. DOCKER CONTAINERS STATUS"
    echo "=========================================="
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=peer0\|orderer\|couch"
    echo ""

    echo "=========================================="
    echo "2. PEER CHANNELS"
    echo "=========================================="
    echo "--- peer0.ecta.cecbs.et ---"
    docker exec peer0.ecta.cecbs.et peer channel list 2>&1 || echo "Failed to query"
    echo ""
    echo "--- peer0.nbe.cecbs.et ---"
    docker exec peer0.nbe.cecbs.et peer channel list 2>&1 || echo "Failed to query"
    echo ""
    echo "--- peer0.banks.cecbs.et ---"
    docker exec peer0.banks.cecbs.et peer channel list 2>&1 || echo "Failed to query"
    echo ""

    echo "=========================================="
    echo "3. INSTALLED CHAINCODES"
    echo "=========================================="
    echo "--- peer0.ecta.cecbs.et ---"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 || echo "Failed to query"
    echo ""
    echo "--- peer0.nbe.cecbs.et ---"
    docker exec peer0.nbe.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 || echo "Failed to query"
    echo ""
    echo "--- peer0.banks.cecbs.et ---"
    docker exec peer0.banks.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 || echo "Failed to query"
    echo ""

    echo "=========================================="
    echo "4. CHAINCODE APPROVAL STATUS"
    echo "=========================================="
    docker exec peer0.ecta.cecbs.et \
        peer lifecycle chaincode checkcommitreadiness \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --sequence 1 2>&1 || echo "Failed to check commit readiness"
    echo ""

    echo "=========================================="
    echo "5. COMMITTED CHAINCODES"
    echo "=========================================="
    docker exec peer0.ecta.cecbs.et \
        peer lifecycle chaincode querycommitted \
        -C coffeechannel 2>&1 || echo "Failed to query committed chaincodes"
    echo ""

    echo "=========================================="
    echo "6. MSP CONFIGURATION"
    echo "=========================================="
    echo "--- ECTA MSP config.yaml ---"
    docker exec peer0.ecta.cecbs.et \
        cat /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp/config.yaml 2>&1 || echo "File not found"
    echo ""
    echo "--- NBE MSP config.yaml ---"
    docker exec peer0.nbe.cecbs.et \
        cat /etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp/config.yaml 2>&1 || echo "File not found"
    echo ""

    echo "=========================================="
    echo "7. ORDERER LOGS (Last 50 lines)"
    echo "=========================================="
    docker logs orderer.cecbs.et 2>&1 | tail -50
    echo ""

    echo "=========================================="
    echo "8. PEER LOGS (Last 30 lines each)"
    echo "=========================================="
    echo "--- peer0.ecta.cecbs.et ---"
    docker logs peer0.ecta.cecbs.et 2>&1 | tail -30
    echo ""
    echo "--- peer0.nbe.cecbs.et ---"
    docker logs peer0.nbe.cecbs.et 2>&1 | tail -30
    echo ""
    echo "--- peer0.banks.cecbs.et ---"
    docker logs peer0.banks.cecbs.et 2>&1 | tail -30
    echo ""

    echo "=========================================="
    echo "9. ORDERER CONFIGURATION"
    echo "=========================================="
    echo "--- Genesis Block Method ---"
    docker exec orderer.cecbs.et sh -c "grep -A 5 'BootstrapMethod' /etc/hyperledger/fabric/orderer.yaml 2>&1" || echo "Cannot read orderer.yaml"
    echo ""
    echo "--- Channel Participation ---"
    docker exec orderer.cecbs.et sh -c "ls -la /var/hyperledger/production/orderer/chains/ 2>&1" || echo "Cannot list channels"
    echo ""

    echo "=========================================="
    echo "10. PEER MSP DIRECTORY STRUCTURE"
    echo "=========================================="
    echo "--- ECTA Admin MSP ---"
    docker exec peer0.ecta.cecbs.et ls -la /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp/ 2>&1 || echo "Directory not found"
    echo ""
    docker exec peer0.ecta.cecbs.et ls -la /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp/admincerts/ 2>&1 || echo "admincerts not found"
    echo ""

    echo "=========================================="
    echo "11. TLS CERTIFICATES"
    echo "=========================================="
    echo "--- Orderer TLS CA Cert ---"
    docker exec peer0.ecta.cecbs.et \
        openssl x509 -in /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem -text -noout 2>&1 | grep -A 2 "Subject:" || echo "Cannot read cert"
    echo ""

    echo "=========================================="
    echo "12. NETWORK CONNECTIVITY"
    echo "=========================================="
    echo "--- Ping orderer from peer ---"
    docker exec peer0.ecta.cecbs.et ping -c 2 orderer.cecbs.et 2>&1 || echo "Cannot ping orderer"
    echo ""
    echo "--- DNS resolution ---"
    docker exec peer0.ecta.cecbs.et nslookup orderer.cecbs.et 2>&1 || echo "DNS lookup failed"
    echo ""

    echo "=========================================="
    echo "13. CONFIGTX.YAML SUMMARY"
    echo "=========================================="
    echo "--- Channel Profile ---"
    grep -A 30 "CoffeeChannel:" blockchain/configtx.yaml 2>&1 || echo "Cannot read configtx.yaml"
    echo ""
    echo "--- Orderer Type ---"
    grep "OrdererType:" blockchain/configtx.yaml 2>&1 || echo "Cannot find OrdererType"
    echo ""

    echo "=========================================="
    echo "14. DOCKER COMPOSE VOLUMES"
    echo "=========================================="
    echo "--- Peer ECTA volumes ---"
    grep -A 15 "peer0.ecta.cecbs.et:" docker-compose-fabric.yml | grep -E "volumes:|^ *-" || echo "Cannot read docker-compose"
    echo ""

    echo "=========================================="
    echo "15. TEST QUERIES"
    echo "=========================================="
    echo "--- Orderer connection test ---"
    docker exec peer0.ecta.cecbs.et \
        peer channel fetch config /tmp/test.block \
        -o orderer.cecbs.et:7050 \
        -c coffeechannel \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 || echo "Orderer connection failed"
    echo ""
    echo "--- Chaincode query test ---"
    docker exec peer0.ecta.cecbs.et \
        peer chaincode query \
        -C coffeechannel \
        -n coffee \
        -c '{"function":"queryAllCoffee","Args":[]}' 2>&1 || echo "Chaincode query failed (expected if not committed)"
    echo ""

    echo "=========================================="
    echo "16. SYSTEM RESOURCES"
    echo "=========================================="
    echo "--- Docker disk usage ---"
    docker system df
    echo ""
    echo "--- Container resource usage ---"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps --filter "name=peer0\|orderer" --format "{{.Names}}")
    echo ""

    echo "=========================================="
    echo "END OF DIAGNOSTIC REPORT"
    echo "=========================================="

} > "$OUTPUT_FILE" 2>&1

echo "✓ Diagnostic report saved to: $OUTPUT_FILE"
echo ""
echo "To view: cat $OUTPUT_FILE"
echo "To share: Send this file to the specialist"
