#!/bin/bash
##################################################################
# Start CouchDB to PostgreSQL Sync Service
##################################################################

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════════"
echo "  Starting CouchDB → PostgreSQL Sync Service"
echo "════════════════════════════════════════════════════════════"
echo ""

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "✓ PM2 found - using PM2 for process management"
    pm2 start ecosystem.config.js
    pm2 save
    echo ""
    echo "✅ Sync service started with PM2"
    echo "   View logs: pm2 logs couchdb-postgres-sync"
    echo "   Stop service: pm2 stop couchdb-postgres-sync"
    echo "   Restart service: pm2 restart couchdb-postgres-sync"
else
    echo "⚠ PM2 not found - running in foreground mode"
    echo "   Install PM2: npm install -g pm2"
    echo "   For background execution: ./start-sync.sh &"
    echo ""
    node couchdb-postgres-sync.js --watch
fi
