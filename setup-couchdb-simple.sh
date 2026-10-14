#!/bin/bash

##############################################################################
# Simple CouchDB Setup - Non-interactive
##############################################################################

set -e

COUCHDB_URL="http://localhost:5984"
COUCHDB_USER="admin"
COUCHDB_PASS="adminpw"
DB_NAME="coffeechannel_coffee"

echo "======================================"
echo "  CouchDB Setup for CECBS"
echo "======================================"

# Wait for CouchDB to be ready
echo "Waiting for CouchDB..."
for i in {1..30}; do
    if curl -s -f -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/ > /dev/null 2>&1; then
        echo "✓ CouchDB is accessible"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Could not connect to CouchDB"
        echo ""
        echo "Please start CouchDB first:"
        echo "  docker start couchdb"
        echo "OR"
        echo "  docker run -d --name couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=adminpw apache/couchdb:latest"
        exit 1
    fi
    sleep 1
done

# Create database (ignore if exists)
echo "Creating database '$DB_NAME'..."
RESPONSE=$(curl -s -X PUT -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME 2>&1)

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✓ Database created successfully"
elif echo "$RESPONSE" | grep -q '"error":"file_exists"'; then
    echo "ℹ Database already exists"
else
    echo "✗ Failed to create database"
    echo "$RESPONSE"
    exit 1
fi

# Create indexes
echo "Creating indexes..."

curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {"fields": ["docType"]},
      "name": "docType-index",
      "type": "json"
    }' > /dev/null 2>&1

curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {"fields": ["owner"]},
      "name": "owner-index",
      "type": "json"
    }' > /dev/null 2>&1

curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {"fields": ["status"]},
      "name": "status-index",
      "type": "json"
    }' > /dev/null 2>&1

echo "✓ Indexes created"

# Update .env file
echo "Updating .env file..."

ENV_FILE="/home/guda/GoCBC/api/.env"

if ! grep -q "COUCHDB_URL" "$ENV_FILE" 2>/dev/null; then
    cat >> "$ENV_FILE" << EOF

# ==================== COUCHDB CONFIGURATION ====================
COUCHDB_URL=$COUCHDB_URL
COUCHDB_USERNAME=$COUCHDB_USER
COUCHDB_PASSWORD=$COUCHDB_PASS
FABRIC_CHANNEL=coffeechannel
FABRIC_CHAINCODE=coffee
EOF
    echo "✓ Configuration added to .env"
else
    echo "ℹ Configuration already exists in .env"
fi

echo ""
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo "URL: $COUCHDB_URL"
echo "Database: $DB_NAME"
echo "Web UI: http://localhost:5984/_utils"
echo ""
echo "Now restart services: ./restart-all.sh"

