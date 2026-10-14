#!/bin/bash

echo "=== Simple Status Check ===" > /tmp/status.txt

# Check Docker
if command -v docker &> /dev/null; then
    echo "Docker: INSTALLED" >> /tmp/status.txt
    CONTAINER_COUNT=$(docker ps 2>/dev/null | wc -l)
    echo "Docker containers running: $((CONTAINER_COUNT - 1))" >> /tmp/status.txt
    
    # Check for Fabric containers
    PEER_COUNT=$(docker ps 2>/dev/null | grep -c "peer0\." || echo "0")
    ORDERER_COUNT=$(docker ps 2>/dev/null | grep -c "orderer" || echo "0")
    echo "Fabric peers running: $PEER_COUNT" >> /tmp/status.txt
    echo "Fabric orderers running: $ORDERER_COUNT" >> /tmp/status.txt
else
    echo "Docker: NOT INSTALLED" >> /tmp/status.txt
fi

# Check API
if curl -s --max-time 2 http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "API: RUNNING on port 3001" >> /tmp/status.txt
else
    echo "API: NOT RUNNING" >> /tmp/status.txt
fi

# Check CouchDB
if curl -s --max-time 2 http://localhost:5984 > /dev/null 2>&1; then
    echo "CouchDB: RUNNING on port 5984" >> /tmp/status.txt
else
    echo "CouchDB: NOT RUNNING" >> /tmp/status.txt
fi

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "PostgreSQL: RUNNING on port 5432" >> /tmp/status.txt
else
    echo "PostgreSQL: Status unknown (pg_isready not available)" >> /tmp/status.txt
fi

# Summary
echo "" >> /tmp/status.txt
echo "=== Summary ===" >> /tmp/status.txt
if [ "$PEER_COUNT" -ge "6" ] && [ "$ORDERER_COUNT" -ge "1" ]; then
    echo "✅ Blockchain network is READY (all 6 peers + orderer running)" >> /tmp/status.txt
else
    echo "❌ Blockchain network is NOT READY" >> /tmp/status.txt
    echo "   Need to start the Fabric network first" >> /tmp/status.txt
    echo "   Run: cd /home/guda/GoCBC/blockchain && ./network.sh up createChannel" >> /tmp/status.txt
fi

cat /tmp/status.txt
