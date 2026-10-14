#!/bin/bash

echo "Starting CouchDB..."

# Check if container exists
if docker ps -a --format '{{.Names}}' | grep -q "^couchdb$"; then
    echo "CouchDB container exists, starting it..."
    docker start couchdb
else
    echo "Creating new CouchDB container..."
    docker run -d \
        --name couchdb \
        -p 5984:5984 \
        -e COUCHDB_USER=admin \
        -e COUCHDB_PASSWORD=adminpw \
        apache/couchdb:latest
fi

echo "Waiting for CouchDB to be ready..."
sleep 5

# Check if accessible
if curl -s -f -u admin:adminpw http://localhost:5984/ > /dev/null 2>&1; then
    echo "✓ CouchDB is running"
    
    # Create database
    echo "Creating coffeechannel_coffee database..."
    curl -s -X PUT -u admin:adminpw http://localhost:5984/coffeechannel_coffee
    
    echo ""
    echo "✓ Setup complete!"
    echo "CouchDB Web UI: http://localhost:5984/_utils"
    echo "Username: admin"
    echo "Password: adminpw"
else
    echo "✗ CouchDB is not accessible"
    echo "Check with: docker logs couchdb"
fi
