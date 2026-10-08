#!/bin/bash

# Test script to verify migration and channel fixes

set -e

echo "=========================================="
echo "Testing Database Migration Fix"
echo "=========================================="

# Check if PostgreSQL is running
if docker ps | grep -q cecbs-postgres; then
    echo "✓ PostgreSQL container is running"
    
    # Test migration
    echo "Copying migration file..."
    docker cp api/src/migrations/000_initial_schema.sql cecbs-postgres:/tmp/schema.sql
    
    echo "Running migration..."
    docker exec cecbs-postgres psql -U cecbs -d cecbs -f /tmp/schema.sql > /tmp/migration_output.txt 2>&1
    
    if grep -q "ERROR" /tmp/migration_output.txt; then
        echo "✗ Migration had errors:"
        grep "ERROR" /tmp/migration_output.txt
    else
        echo "✓ Migration completed"
    fi
    
    # Count tables
    TABLE_COUNT=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')
    echo "✓ Found ${TABLE_COUNT} tables in database"
    
    # List tables
    echo "Tables created:"
    docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\dt" | grep public || echo "No tables found"
    
else
    echo "✗ PostgreSQL container is not running"
fi

echo ""
echo "=========================================="
echo "Testing Channel Join Fix"
echo "=========================================="

# Check if peers are running
PEER_COUNT=$(docker ps --filter "name=peer0" --format "{{.Names}}" | wc -l)
echo "Found ${PEER_COUNT} peer containers running"

if [ $PEER_COUNT -gt 0 ]; then
    # Fix block file permissions
    echo "Fixing block file permissions..."
    sudo chmod 644 blockchain/channel-artifacts/coffeechannel.block 2>/dev/null || chmod 644 blockchain/channel-artifacts/coffeechannel.block
    ls -l blockchain/channel-artifacts/coffeechannel.block
    
    # Test copying block to first peer
    FIRST_PEER=$(docker ps --filter "name=peer0" --format "{{.Names}}" | head -1)
    echo "Testing block copy to ${FIRST_PEER}..."
    
    if docker cp blockchain/channel-artifacts/coffeechannel.block ${FIRST_PEER}:/tmp/; then
        echo "✓ Successfully copied block file to peer"
        
        # Check if peer already joined
        echo "Checking peer channels..."
        docker exec ${FIRST_PEER} peer channel list 2>&1 | tee /tmp/peer_channels.txt
        
        if grep -q "coffeechannel" /tmp/peer_channels.txt; then
            echo "✓ Peer already joined coffeechannel"
        else
            echo "✗ Peer has not joined coffeechannel yet"
        fi
    else
        echo "✗ Failed to copy block file to peer"
    fi
else
    echo "✗ No peer containers are running"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
