#!/bin/bash
##################################################################
# Run Sync Test and Display Results
##################################################################

cd /home/guda/GoCBC/sync-service

echo "════════════════════════════════════════════════════════════"
echo "  Testing CouchDB → PostgreSQL Sync (Fixed)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Run sync and capture output
echo "🔄 Running sync service..."
echo ""

node couchdb-postgres-sync.js 2>&1 | tee sync-output.log

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Sync Test Complete"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Output saved to: sync-output.log"
echo ""

# Check for errors
if grep -q "Could not update sync status" sync-output.log; then
    echo "⚠️  WARNING: Sync status update errors found"
    echo ""
else
    echo "✅ No sync status errors detected"
    echo ""
fi

# Query PostgreSQL to verify data
echo "📊 Querying PostgreSQL for synced data..."
echo ""

docker exec postgres psql -U cecbs -d cecbs -c "
SELECT 
    synced_from, 
    COUNT(*) as shipments
FROM blockchain_shipments 
GROUP BY synced_from 
ORDER BY synced_from;
" 2>/dev/null

echo ""

docker exec postgres psql -U cecbs -d cecbs -c "
SELECT 
    couch_instance,
    database_name,
    documents_synced,
    status,
    last_sync
FROM sync_status 
ORDER BY last_sync DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "✅ Test complete!"
