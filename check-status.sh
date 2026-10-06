#!/bin/bash
echo "=== Container Status ==="
docker ps --format "{{.Names}}" | sort
echo ""
echo "=== Total Containers Running ==="
docker ps -q | wc -l
echo ""
echo "=== Chaincode Container ==="
docker ps --filter "name=coffee-chaincode" --format "{{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""
echo "=== Chaincode Environment ==="
docker inspect coffee-chaincode 2>/dev/null | grep -A5 "Env" | grep CORE_CHAINCODE_ID_NAME || echo "Not found"
