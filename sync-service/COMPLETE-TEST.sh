#!/bin/bash
##################################################################
# Complete Sync Service Test
##################################################################

REPORT_FILE="/home/guda/GoCBC/sync-service/TEST-REPORT.txt"
SYNC_LOG="/home/guda/GoCBC/sync-service/sync-test.log"

echo "════════════════════════════════════════════════════════════" | tee $REPORT_FILE
echo "  CouchDB → PostgreSQL Sync Service Test" | tee -a $REPORT_FILE
echo "  $(date)" | tee -a $REPORT_FILE
echo "════════════════════════════════════════════════════════════" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# 1. Check Docker containers
echo "1️⃣  Checking Docker Containers..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

docker ps --format "{{.Names}}" | grep -E "postgres|couchdb" > /tmp/containers.txt
if [ -s /tmp/containers.txt ]; then
    echo "✅ Found blockchain containers:" | tee -a $REPORT_FILE
    cat /tmp/containers.txt | tee -a $REPORT_FILE
else
    echo "❌ No blockchain containers found!" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# 2. Test CouchDB connections
echo "2️⃣  Testing CouchDB Connections..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

for port in 5984 6984 7984 8984 9984 10984; do
    if curl -s -u admin:adminpw http://localhost:$port/_up > /dev/null 2>&1; then
        dbs=$(curl -s -u admin:adminpw http://localhost:$port/_all_dbs 2>/dev/null | grep -o 'coffeechannel[^"]*' | wc -l)
        echo "  ✓ Port $port: Online ($dbs databases)" | tee -a $REPORT_FILE
    else
        echo "  ✗ Port $port: Offline" | tee -a $REPORT_FILE
    fi
done
echo "" | tee -a $REPORT_FILE

# 3. Test PostgreSQL connection
echo "3️⃣  Testing PostgreSQL Connection..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

if docker exec postgres psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Connected" | tee -a $REPORT_FILE
    
    # Check if tables exist
    tables=$(docker exec postgres psql -U cecbs -d cecbs -t -c "\dt" 2>/dev/null | grep blockchain | wc -l)
    echo "   Tables found: $tables" | tee -a $REPORT_FILE
else
    echo "❌ PostgreSQL: Connection failed" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# 4. Run sync service
echo "4️⃣  Running Sync Service..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

cd /home/guda/GoCBC/sync-service
timeout 20 node couchdb-postgres-sync.js > $SYNC_LOG 2>&1

if [ $? -eq 0 ] || [ $? -eq 124 ]; then
    echo "✅ Sync service executed" | tee -a $REPORT_FILE
    
    # Check for errors in log
    if grep -q "Could not update sync status" $SYNC_LOG; then
        echo "⚠️  WARNING: Sync status errors found" | tee -a $REPORT_FILE
        echo "" | tee -a $REPORT_FILE
        echo "Errors:" | tee -a $REPORT_FILE
        grep "Could not update sync status" $SYNC_LOG | head -5 | tee -a $REPORT_FILE
    else
        echo "✅ No sync status errors" | tee -a $REPORT_FILE
    fi
    
    # Show summary from log
    if grep -q "Synchronization Summary" $SYNC_LOG; then
        echo "" | tee -a $REPORT_FILE
        echo "Summary:" | tee -a $REPORT_FILE
        sed -n '/Synchronization Summary/,/═══════════/p' $SYNC_LOG | tee -a $REPORT_FILE
    fi
else
    echo "❌ Sync service failed to execute" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# 5. Check PostgreSQL data
echo "5️⃣  Checking PostgreSQL Data..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

if docker exec postgres psql -U cecbs -d cecbs -c "SELECT 1;" > /dev/null 2>&1; then
    # Count shipments by organization
    echo "Shipments by organization:" | tee -a $REPORT_FILE
    docker exec postgres psql -U cecbs -d cecbs -t -c "
        SELECT synced_from, COUNT(*) 
        FROM blockchain_shipments 
        GROUP BY synced_from 
        ORDER BY synced_from;
    " 2>/dev/null | tee -a $REPORT_FILE
    
    echo "" | tee -a $REPORT_FILE
    
    # Check sync status table
    echo "Sync status (last 5):" | tee -a $REPORT_FILE
    docker exec postgres psql -U cecbs -d cecbs -t -c "
        SELECT 
            couch_instance || ' - ' || database_name || ' (' || 
            COALESCE(documents_synced::text, '0') || ' docs, ' || 
            COALESCE(status, 'unknown') || ')'
        FROM sync_status 
        ORDER BY last_sync DESC 
        LIMIT 5;
    " 2>/dev/null | tee -a $REPORT_FILE
else
    echo "❌ Cannot query PostgreSQL" | tee -a $REPORT_FILE
fi

echo "" | tee -a $REPORT_FILE
echo "════════════════════════════════════════════════════════════" | tee -a $REPORT_FILE
echo "  Test Complete" | tee -a $REPORT_FILE
echo "════════════════════════════════════════════════════════════" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "📄 Full report saved to: $REPORT_FILE" | tee -a $REPORT_FILE
echo "📋 Sync log saved to: $SYNC_LOG" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Display the report
cat $REPORT_FILE
