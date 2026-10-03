#!/bin/bash

# Test All Database Migrations
# This script tests all 22 migrations in order

set -e  # Exit on any error

echo "======================================================================"
echo "Testing All Database Migrations"
echo "======================================================================"
echo ""

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cecbs"
DB_USER="cecbs"
DB_PASSWORD="cecbs123"

export PGPASSWORD="$DB_PASSWORD"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Step 1: Drop and recreate test database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS cecbs_test;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE cecbs_test;"

echo ""
echo "Step 2: Running migrations in order..."
echo ""

MIGRATION_DIR="api/src/migrations"
FAILED_MIGRATIONS=()
SUCCESSFUL_MIGRATIONS=()

# Get all migration files sorted
MIGRATION_FILES=($(ls -1 "$MIGRATION_DIR"/*.sql | sort))

for MIGRATION_FILE in "${MIGRATION_FILES[@]}"; do
    MIGRATION_NAME=$(basename "$MIGRATION_FILE")
    
    echo -n "Running $MIGRATION_NAME... "
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d cecbs_test -f "$MIGRATION_FILE" > /tmp/migration_output.log 2>&1; then
        echo -e "${GREEN}✓ SUCCESS${NC}"
        SUCCESSFUL_MIGRATIONS+=("$MIGRATION_NAME")
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_MIGRATIONS+=("$MIGRATION_NAME")
        echo "Error details:"
        cat /tmp/migration_output.log | grep -A 5 "ERROR"
    fi
done

echo ""
echo "======================================================================"
echo "Migration Test Results"
echo "======================================================================"
echo ""
echo "Total migrations: ${#MIGRATION_FILES[@]}"
echo -e "${GREEN}Successful: ${#SUCCESSFUL_MIGRATIONS[@]}${NC}"
echo -e "${RED}Failed: ${#FAILED_MIGRATIONS[@]}${NC}"
echo ""

if [ ${#FAILED_MIGRATIONS[@]} -gt 0 ]; then
    echo -e "${RED}Failed migrations:${NC}"
    for FAILED in "${FAILED_MIGRATIONS[@]}"; do
        echo "  - $FAILED"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}🎉 All migrations passed successfully!${NC}"
    echo ""
    
    echo "Step 3: Verifying table counts..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d cecbs_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    echo "Total tables created: $TABLE_COUNT"
    
    echo ""
    echo "Step 4: Listing all tables..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d cecbs_test -c "\dt"
    
    echo ""
    echo "Step 5: Cleanup test database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE cecbs_test;"
    
    echo ""
    echo -e "${GREEN}✓ Migration test completed successfully!${NC}"
    exit 0
fi
