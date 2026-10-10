#!/bin/bash
echo "=== TESTING ACTUAL EXPOSED PORTS ==="
echo ""

echo "PostgreSQL (5432):"
nc -zv localhost 5432 2>&1 | head -1

echo "Redis (6379):"
nc -zv localhost 6379 2>&1 | head -1

echo "Orderer (7050):"
nc -zv localhost 7050 2>&1 | head -1

echo "ECTA Peer (7051):"
nc -zv localhost 7051 2>&1 | head -1

echo "CouchDB ECTA (5984):"
nc -zv localhost 5984 2>&1 | head -1

echo ""
echo "=== TESTING COUCHDB ==="
curl -s http://localhost:5984 2>&1 | head -5

echo ""
echo "=== CHECKING API/UI PROCESSES ==="
ps aux | grep -E "(node|npm)" | grep -v grep | head -5
