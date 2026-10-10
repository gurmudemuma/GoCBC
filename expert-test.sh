#!/bin/bash
# Expert System Test - Write results to file for verification
# Created by Kiro - January 7, 2025

OUTPUT_FILE="/home/guda/GoCBC/test-results-$(date +%Y%m%d-%H%M%S).txt"

echo "================================================================================" > "$OUTPUT_FILE"
echo "GOCBC EXPERT SYSTEM TEST - $(date)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Test 1: Docker containers
echo "TEST 1: DOCKER CONTAINERS" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
docker ps --format "table {{.Names}}\t{{.Status}}" >> "$OUTPUT_FILE" 2>&1
echo "" >> "$OUTPUT_FILE"

# Test 2: Container count
CONTAINER_COUNT=$(docker ps -q | wc -l)
echo "Total Running Containers: $CONTAINER_COUNT" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Test 3: API Port
echo "TEST 2: API PORT CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 3001 2>/dev/null; then
    echo "✅ Port 3001: OPEN (API is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 3001: CLOSED (API not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 4: UI Port
echo "TEST 3: UI PORT CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 3000 2>/dev/null; then
    echo "✅ Port 3000: OPEN (UI is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 3000: CLOSED (UI not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 5: PostgreSQL
echo "TEST 4: POSTGRESQL CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 5432 2>/dev/null; then
    echo "✅ Port 5432: OPEN (PostgreSQL is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 5432: CLOSED (PostgreSQL not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 6: Blockchain Orderer
echo "TEST 5: BLOCKCHAIN ORDERER CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 7050 2>/dev/null; then
    echo "✅ Port 7050: OPEN (Orderer is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 7050: CLOSED (Orderer not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 7: ECTA Peer
echo "TEST 6: ECTA PEER CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 7051 2>/dev/null; then
    echo "✅ Port 7051: OPEN (ECTA peer is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 7051: CLOSED (ECTA peer not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 8: CouchDB
echo "TEST 7: COUCHDB CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
if nc -z localhost 5984 2>/dev/null; then
    echo "✅ Port 5984: OPEN (CouchDB is listening)" >> "$OUTPUT_FILE"
else
    echo "❌ Port 5984: CLOSED (CouchDB not running)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 9: API Health Endpoint
echo "TEST 8: API HEALTH ENDPOINT" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/api/v1/health 2>&1 | tail -1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep -oP 'HTTP_CODE:\K\d+')
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Health: RESPONDING (HTTP 200)" >> "$OUTPUT_FILE"
    curl -s http://localhost:3001/api/v1/health 2>&1 | head -20 >> "$OUTPUT_FILE"
else
    echo "❌ API Health: NOT RESPONDING (HTTP $HTTP_CODE)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 10: API Exporters Endpoint (Should require auth)
echo "TEST 9: API AUTHENTICATION CHECK" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/api/v1/exporters 2>&1 | tail -1)
AUTH_CODE=$(echo "$AUTH_RESPONSE" | grep -oP 'HTTP_CODE:\K\d+')
if [ "$AUTH_CODE" = "401" ] || [ "$AUTH_CODE" = "403" ]; then
    echo "✅ Authentication: WORKING (HTTP $AUTH_CODE - Unauthorized as expected)" >> "$OUTPUT_FILE"
else
    echo "⚠️  Authentication: HTTP $AUTH_CODE (Expected 401 or 403)" >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Test 11: Blockchain peer connectivity
echo "TEST 10: ALL BLOCKCHAIN PEER PORTS" >> "$OUTPUT_FILE"
echo "--------------------------------------------------------------------------------" >> "$OUTPUT_FILE"
PORTS="7051 8051 9051 10051 11051 12051"
for port in $PORTS; do
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ Port $port: OPEN" >> "$OUTPUT_FILE"
    else
        echo "❌ Port $port: CLOSED" >> "$OUTPUT_FILE"
    fi
done
echo "" >> "$OUTPUT_FILE"

# Test 12: Summary
echo "================================================================================" >> "$OUTPUT_FILE"
echo "SUMMARY" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Count open critical ports
CRITICAL_PORTS="3001 3000 5432 7050 7051"
OPEN_COUNT=0
for port in $CRITICAL_PORTS; do
    if nc -z localhost $port 2>/dev/null; then
        ((OPEN_COUNT++))
    fi
done

echo "Critical Ports Open: $OPEN_COUNT / 5" >> "$OUTPUT_FILE"
echo "Containers Running: $CONTAINER_COUNT" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ $OPEN_COUNT -eq 5 ] && [ $CONTAINER_COUNT -gt 10 ]; then
    echo "✅ VERDICT: SYSTEM IS FULLY OPERATIONAL" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "All critical services are running:" >> "$OUTPUT_FILE"
    echo "  • API Server (3001)" >> "$OUTPUT_FILE"
    echo "  • UI Server (3000)" >> "$OUTPUT_FILE"
    echo "  • PostgreSQL (5432)" >> "$OUTPUT_FILE"
    echo "  • Blockchain Orderer (7050)" >> "$OUTPUT_FILE"
    echo "  • Blockchain Peers (7051+)" >> "$OUTPUT_FILE"
    echo "  • $CONTAINER_COUNT Docker containers running" >> "$OUTPUT_FILE"
elif [ $OPEN_COUNT -gt 0 ]; then
    echo "⚠️  VERDICT: SYSTEM PARTIALLY RUNNING" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "Some services operational, but not all critical ports are open." >> "$OUTPUT_FILE"
else
    echo "❌ VERDICT: SYSTEM NOT RUNNING" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "No critical ports are open. System needs to be started." >> "$OUTPUT_FILE"
    echo "Run: ./start-all.sh" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "Test completed: $(date)" >> "$OUTPUT_FILE"
echo "Results saved to: $OUTPUT_FILE" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

# Also output to console
cat "$OUTPUT_FILE"

echo ""
echo "Test results saved to: $OUTPUT_FILE"
