#!/bin/bash
# Comprehensive chaincode connection test

echo "========================================="
echo "Chaincode Connection Diagnostic"
echo "========================================="
echo ""

echo "1. Chaincode container status:"
docker ps --filter "name=coffee-chaincode" --format "  {{.Names}}: {{.Status}}"
echo ""

echo "2. Chaincode container CCID:"
docker inspect coffee-chaincode --format='  {{range .Config.Env}}{{println .}}{{end}}' | grep CORE_CHAINCODE_ID_NAME
echo ""

echo "3. Chaincode TLS setting:"
docker inspect coffee-chaincode --format='  {{range .Config.Env}}{{println .}}{{end}}' | grep CHAINCODE_TLS
echo ""

echo "4. Chaincode listening on port 9999:"
docker exec coffee-chaincode sh -c "netstat -ln | grep 9999 || ss -ln | grep 9999" 2>&1 | head -3
echo ""

echo "5. Network connectivity from peer to chaincode:"
docker exec peer0.ecta.cecbs.et sh -c "nc -zv -w3 coffee-chaincode 9999" 2>&1
echo ""

echo "6. DNS resolution from peer:"
docker exec peer0.ecta.cecbs.et getent hosts coffee-chaincode
echo ""

echo "7. Chaincode logs (last 10 lines):"
docker logs --tail 10 coffee-chaincode 2>&1
echo ""

echo "8. Peer external builder directory for v2.19:"
docker exec peer0.ecta.cecbs.et sh -c "ls -la /var/hyperledger/production/externalbuilder/builds/ | grep 2.19" 2>&1 || echo "  No v2.19 build found"
echo ""

echo "9. Connection.json in peer build (if exists):"
docker exec peer0.ecta.cecbs.et sh -c "find /var/hyperledger/production/externalbuilder/builds -name connection.json -path '*2.19*' -exec cat {} \;" 2>&1 || echo "  No connection.json for v2.19 found"
echo ""

echo "10. Recent peer chaincode errors:"
docker logs --since 2m peer0.ecta.cecbs.et 2>&1 | grep -i "chaincode registration\|timeout expired" | tail -5
echo ""

echo "========================================="
echo "Test complete"
echo "========================================="
