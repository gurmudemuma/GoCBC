#!/bin/bash
##################################################################
# Test CouchDB to PostgreSQL Sync
##################################################################

echo "════════════════════════════════════════════════════════════"
echo "  Testing CouchDB → PostgreSQL Sync"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check CouchDB instances
echo "📡 Testing CouchDB Connectivity..."
echo ""

test_couchdb() {
    local name=$1
    local port=$2
    
    if curl -s -u admin:adminpw http://localhost:$port/_all_dbs > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name (port $port) - Connected"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name (port $port) - Failed"
        return 1
    fi
}

couchdb_ok=0
test_couchdb "ECTA" 5984 && ((couchdb_ok++))
test_couchdb "ECX" 6984 && ((couchdb_ok++))
test_couchdb "Banks" 7984 && ((couchdb_ok++))
test_couchdb "NBE" 8984 && ((couchdb_ok++))
test_couchdb "Customs" 9984 && ((couchdb_ok++))
test_couchdb "Shipping" 10984 && ((couchdb_ok++))

echo ""
echo "  CouchDB instances: $couchdb_ok/6 online"
echo ""

# Test 2: Check PostgreSQL
echo "🐘 Testing PostgreSQL Connectivity..."
echo ""

if docker exec postgres psql -U cecbs -d cecbs -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL - Connected"
    pg_ok=1
else
    echo -e "  ${RED}✗${NC} PostgreSQL - Failed"
    pg_ok=0
fi

echo ""

# Test 3: Check if sync tables exist
if [ $pg_ok -eq 1 ]; then
    echo "📊 Checking PostgreSQL Tables..."
    echo ""
    
    tables=("blockchain_shipments" "blockchain_documents" "blockchain_contracts" "blockchain_payments" "blockchain_customs" "sync_status")
    
    for table in "${tables[@]}"; do
        if docker exec postgres psql -U cecbs -d cecbs -c "\d $table" > /dev/null 2>&1; then
            count=$(docker exec postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
            echo -e "  ${GREEN}✓${NC} $table (${count} rows)"
        else
            echo -e "  ${YELLOW}⚠${NC} $table (not created yet)"
        fi
    done
    
    echo ""
fi

# Test 4: Check CouchDB databases
echo "📂 Checking CouchDB Databases..."
echo ""

for port in 5984 6984 7984 8984 9984 10984; do
    dbs=$(curl -s -u admin:adminpw http://localhost:$port/_all_dbs 2>/dev/null | grep -o 'coffeechannel[^"]*' | wc -l)
    echo "  Port $port: $dbs coffeechannel databases"
done

echo ""

# Test 5: Run one-time sync
if [ "$1" == "--run-sync" ]; then
    echo "🔄 Running One-Time Sync..."
    echo ""
    node couchdb-postgres-sync.js
    echo ""
fi

# Summary
echo "════════════════════════════════════════════════════════════"
echo "  Test Summary"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $couchdb_ok -eq 6 ] && [ $pg_ok -eq 1 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo ""
    echo "Ready to start sync service:"
    echo "  • One-time sync:    node couchdb-postgres-sync.js"
    echo "  • Continuous sync:  node couchdb-postgres-sync.js --watch"
    echo "  • With PM2:         ./start-sync.sh"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some systems are not ready${NC}"
    echo ""
    if [ $couchdb_ok -lt 6 ]; then
        echo "  Please ensure all CouchDB containers are running:"
        echo "    cd /home/guda/GoCBC && ./start-all.sh"
    fi
    if [ $pg_ok -eq 0 ]; then
        echo "  Please ensure PostgreSQL container is running:"
        echo "    docker ps | grep postgres"
    fi
    echo ""
    exit 1
fi
