#!/bin/bash

##############################################################################
# Ensure CouchDB is Running
# Handles all edge cases: running, stopped, port conflict, etc.
# Now uses Docker Compose CouchDB instances instead of standalone
##############################################################################

set -e

COUCHDB_URL="http://localhost:5984"
COUCHDB_USER="admin"
COUCHDB_PASS="adminpw"
DB_NAME="coffeechannel_coffee"

echo "🔧 Ensuring CouchDB is running..."

# Function to test if CouchDB is accessible
test_couchdb() {
    curl -s -f -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/ > /dev/null 2>&1
}

# Function to wait for CouchDB
wait_for_couchdb() {
    echo "⏳ Waiting for CouchDB to be ready..."
    for i in {1..30}; do
        if test_couchdb; then
            echo "✅ CouchDB is ready"
            return 0
        fi
        sleep 2
    done
    echo "❌ CouchDB did not become ready"
    return 1
}

# Check if we're using Docker Compose CouchDB instances
if docker ps --format '{{.Names}}' | grep -q "^couchdb\."; then
    echo "ℹ️  Using Docker Compose CouchDB instances"
    echo "ℹ️  Standalone CouchDB not needed (using couchdb.ecta on port 5985)"
    
    # Check if any CouchDB is accessible on port 5984
    if test_couchdb; then
        echo "✅ CouchDB is already running and accessible on port 5984"
    else
        echo "⚠️  Port 5984 not accessible, but Docker Compose CouchDB instances are running"
        echo "ℹ️  This is expected - using internal Docker network instead"
    fi
else
    # Fallback to standalone CouchDB if Docker Compose instances don't exist
    echo "🔍 No Docker Compose CouchDB found, checking for standalone instance..."
    
    # 1. Check if CouchDB is already accessible
    if test_couchdb; then
        echo "✅ CouchDB is already running and accessible"
    else
        echo "🔍 CouchDB not accessible, checking containers..."
        
        # 2. Check if container exists and is running
        if docker ps --format '{{.Names}}' | grep -q "^couchdb$"; then
            echo "✅ CouchDB container is running but not accessible yet"
            wait_for_couchdb
        # 3. Check if container exists but is stopped
        elif docker ps -a --format '{{.Names}}' | grep -q "^couchdb$"; then
            echo "🔄 Starting existing CouchDB container..."
            docker start couchdb > /dev/null 2>&1
            wait_for_couchdb
        # 4. Skip creating standalone - let Docker Compose handle it
        else
            echo "⚠️  No standalone CouchDB found"
            echo "ℹ️  Will be created by docker-compose when Fabric network starts"
            echo "✅ Skipping standalone CouchDB creation"
            exit 0
        fi
    fi
fi

# 5. Create database if it doesn't exist (only if CouchDB is accessible)
if test_couchdb; then
    echo "📦 Ensuring database exists..."
    RESPONSE=$(curl -s -X PUT -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME 2>&1)

    if echo "$RESPONSE" | grep -q '"ok":true'; then
        echo "✅ Database '$DB_NAME' created"
    elif echo "$RESPONSE" | grep -q '"error":"file_exists"'; then
        echo "✅ Database '$DB_NAME' already exists"
    else
        echo "⚠️  Unexpected response: $RESPONSE"
    fi

    # 6. Create indexes
    echo "📑 Creating indexes..."
    curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
        -H "Content-Type: application/json" \
        $COUCHDB_URL/$DB_NAME/_index \
        -d '{"index":{"fields":["docType"]},"name":"docType-index","type":"json"}' > /dev/null 2>&1

    curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
        -H "Content-Type: application/json" \
        $COUCHDB_URL/$DB_NAME/_index \
        -d '{"index":{"fields":["owner"]},"name":"owner-index","type":"json"}' > /dev/null 2>&1

    curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
        -H "Content-Type: application/json" \
        $COUCHDB_URL/$DB_NAME/_index \
        -d '{"index":{"fields":["status"]},"name":"status-index","type":"json"}' > /dev/null 2>&1

    echo "✅ Indexes created/verified"
else
    echo "ℹ️  Skipping database creation (will be handled by blockchain peers)"
fi

# 7. Verify everything
echo ""
echo "🎉 CouchDB Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if test_couchdb; then
    echo "📍 URL:      $COUCHDB_URL"
    echo "💾 Database: $DB_NAME"
    echo "🌐 Web UI:   http://localhost:5984/_utils"
    echo "👤 Username: $COUCHDB_USER"
    echo "🔑 Password: $COUCHDB_PASS"
else
    echo "ℹ️  Using Docker Compose CouchDB instances"
    echo "📍 ECTA CouchDB:     http://localhost:5985"
    echo "📍 ECX CouchDB:      http://localhost:6984"
    echo "📍 Banks CouchDB:    http://localhost:7984"
    echo "📍 NBE CouchDB:      http://localhost:8984"
    echo "📍 Customs CouchDB:  http://localhost:9984"
    echo "📍 Shipping CouchDB: http://localhost:10984"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
