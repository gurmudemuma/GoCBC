#!/bin/bash
##################################################################
# Stop CouchDB to PostgreSQL Sync Service
##################################################################

echo "════════════════════════════════════════════════════════════"
echo "  Stopping CouchDB → PostgreSQL Sync Service"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    pm2 stop couchdb-postgres-sync
    pm2 delete couchdb-postgres-sync
    echo "✅ Sync service stopped"
else
    echo "⚠ PM2 not found - killing node processes"
    pkill -f "couchdb-postgres-sync.js"
    echo "✅ Sync service stopped"
fi
