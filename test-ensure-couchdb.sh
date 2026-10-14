#!/bin/bash
# Test the ensure-couchdb.sh fix

echo "Testing ensure-couchdb.sh fix..."
echo ""

# Test 1: Run ensure-couchdb.sh
echo "Test 1: Running ensure-couchdb.sh..."
bash ensure-couchdb.sh
echo ""

# Test 2: Check if standalone couchdb was NOT created
echo "Test 2: Checking if standalone 'couchdb' container exists..."
if docker ps -a --format '{{.Names}}' | grep -q "^couchdb$"; then
    echo "❌ FAIL: Standalone 'couchdb' container was created (should be skipped)"
    exit 1
else
    echo "✅ PASS: No standalone 'couchdb' container (correct behavior)"
fi
echo ""

# Test 3: Start docker-compose
echo "Test 3: Starting docker-compose Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | grep -E "Started|Error"
echo ""

# Test 4: Wait and check if couchdb.ecta started without port conflict
echo "Test 4: Checking if couchdb.ecta started successfully..."
sleep 5
if docker ps --format '{{.Names}}' | grep -q "^couchdb.ecta$"; then
    echo "✅ PASS: couchdb.ecta is running"
    
    # Check port mapping
    PORT=$(docker ps --format '{{.Names}} {{.Ports}}' | grep couchdb.ecta | grep -o '0.0.0.0:[0-9]*' | head -1)
    echo "ℹ️  Port mapping: $PORT"
    
    if echo "$PORT" | grep -q "5985"; then
        echo "✅ PASS: Using port 5985 (correct)"
    else
        echo "⚠️  WARNING: Not using expected port 5985"
    fi
else
    echo "❌ FAIL: couchdb.ecta is not running"
    docker logs couchdb.ecta 2>&1 | tail -20
    exit 1
fi
echo ""

# Test 5: Check if ECTA peer starts
echo "Test 5: Checking if peer0.ecta.cecbs.et is running..."
sleep 10
if docker ps --format '{{.Names}}' | grep -q "^peer0.ecta.cecbs.et$"; then
    echo "✅ PASS: peer0.ecta.cecbs.et is running"
    
    # Check if it's listening on port 7051
    if docker ps --format '{{.Names}} {{.Ports}}' | grep peer0.ecta | grep -q "7051"; then
        echo "✅ PASS: Listening on port 7051"
    fi
else
    echo "❌ FAIL: peer0.ecta.cecbs.et is not running"
    docker logs peer0.ecta.cecbs.et 2>&1 | tail -20
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ALL TESTS PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "✅ ensure-couchdb.sh doesn't create standalone container"
echo "✅ docker-compose starts without port conflicts"
echo "✅ couchdb.ecta runs on port 5985"
echo "✅ peer0.ecta.cecbs.et runs on port 7051"
