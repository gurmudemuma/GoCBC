#!/bin/bash

##############################################################################
# Setup CouchDB for CECBS
# Creates the required database and initializes it
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COUCHDB_URL="http://localhost:5984"
COUCHDB_USER="admin"
COUCHDB_PASS="adminpw"
DB_NAME="coffeechannel_coffee"

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  CouchDB Setup for CECBS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"

# Check if CouchDB is running
echo -e "${YELLOW}[1/5]${NC} Checking if CouchDB is running..."
if docker ps | grep -q couchdb; then
    echo -e "${GREEN}✓${NC} CouchDB container is running"
elif systemctl is-active --quiet couchdb 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CouchDB system service is running"
else
    echo -e "${RED}✗${NC} CouchDB is not running!"
    echo -e "${YELLOW}Starting CouchDB with Docker...${NC}"
    
    # Start CouchDB container
    docker run -d \
        --name couchdb \
        -p 5984:5984 \
        -e COUCHDB_USER=$COUCHDB_USER \
        -e COUCHDB_PASSWORD=$COUCHDB_PASS \
        apache/couchdb:latest
    
    echo -e "${YELLOW}Waiting for CouchDB to start...${NC}"
    sleep 10
fi

# Test connection
echo -e "\n${YELLOW}[2/5]${NC} Testing CouchDB connection..."
for i in {1..30}; do
    if curl -s -f -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} CouchDB is accessible"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} Could not connect to CouchDB after 30 attempts"
        exit 1
    fi
    sleep 1
done

# Check if database exists
echo -e "\n${YELLOW}[3/5]${NC} Checking if database exists..."
if curl -s -f -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Database '$DB_NAME' already exists"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing database...${NC}"
        curl -s -X DELETE -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME
        echo -e "${GREEN}✓${NC} Database deleted"
    else
        echo -e "${BLUE}Keeping existing database${NC}"
        exit 0
    fi
fi

# Create database
echo -e "\n${YELLOW}[4/5]${NC} Creating database '$DB_NAME'..."
RESPONSE=$(curl -s -X PUT -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME)

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓${NC} Database created successfully"
else
    echo -e "${RED}✗${NC} Failed to create database"
    echo "Response: $RESPONSE"
    exit 1
fi

# Verify database
echo -e "\n${YELLOW}[5/5]${NC} Verifying database..."
DB_INFO=$(curl -s -u $COUCHDB_USER:$COUCHDB_PASS $COUCHDB_URL/$DB_NAME)

if echo "$DB_INFO" | grep -q '"db_name":"'$DB_NAME'"'; then
    echo -e "${GREEN}✓${NC} Database verified"
    echo -e "\n${BLUE}Database Info:${NC}"
    echo "$DB_INFO" | python3 -m json.tool 2>/dev/null || echo "$DB_INFO"
else
    echo -e "${RED}✗${NC} Database verification failed"
    exit 1
fi

# Create indexes for common queries
echo -e "\n${YELLOW}Creating indexes...${NC}"

# Index for docType
curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {
        "fields": ["docType"]
      },
      "name": "docType-index",
      "type": "json"
    }' > /dev/null

echo -e "${GREEN}✓${NC} docType index created"

# Index for owner
curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {
        "fields": ["owner"]
      },
      "name": "owner-index",
      "type": "json"
    }' > /dev/null

echo -e "${GREEN}✓${NC} owner index created"

# Index for status
curl -s -X POST -u $COUCHDB_USER:$COUCHDB_PASS \
    -H "Content-Type: application/json" \
    $COUCHDB_URL/$DB_NAME/_index \
    -d '{
      "index": {
        "fields": ["status"]
      },
      "name": "status-index",
      "type": "json"
    }' > /dev/null

echo -e "${GREEN}✓${NC} status index created"

# Update .env file with CouchDB credentials
echo -e "\n${YELLOW}Updating API .env file...${NC}"

ENV_FILE="/home/guda/GoCBC/api/.env"

# Add CouchDB configuration if not present
if ! grep -q "COUCHDB_URL" "$ENV_FILE" 2>/dev/null; then
    cat >> "$ENV_FILE" << EOF

# ==================== COUCHDB CONFIGURATION ====================

# CouchDB URL
COUCHDB_URL=$COUCHDB_URL

# CouchDB credentials
COUCHDB_USERNAME=$COUCHDB_USER
COUCHDB_PASSWORD=$COUCHDB_PASS

# Fabric channel and chaincode (for database name)
FABRIC_CHANNEL=coffeechannel
FABRIC_CHAINCODE=coffee
EOF
    echo -e "${GREEN}✓${NC} CouchDB configuration added to .env"
else
    echo -e "${BLUE}ℹ${NC}  CouchDB configuration already exists in .env"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  CouchDB Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Connection Details:${NC}"
echo "  URL: $COUCHDB_URL"
echo "  Database: $DB_NAME"
echo "  Username: $COUCHDB_USER"
echo "  Password: $COUCHDB_PASS"

echo -e "\n${BLUE}Access CouchDB:${NC}"
echo "  Web UI: http://localhost:5984/_utils"
echo "  Database: http://localhost:5984/$DB_NAME/_all_docs"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Restart the API server: ./restart-all.sh"
echo "  2. The system will now use CouchDB for blockchain data"
echo "  3. No more fallback warnings!"

