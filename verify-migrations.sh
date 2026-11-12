#!/bin/bash

################################################################################
# Migration Verification Script
# Verifies that all database migrations are in place for 100% test pass rate
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GoCBC Migration Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cecbs"
DB_USER="cecbs"
DB_PASS="cecbs123"

PSQL_CMD="PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

# Check 1: Migration files exist
echo -e "${YELLOW}[1/5]${NC} Checking migration files..."
MIGRATION_DIR="./api/src/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} Found $MIGRATION_COUNT migration file(s) in $MIGRATION_DIR"
    ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | while read file; do
        echo "  - $(basename $file)"
    done
else
    echo -e "${RED}✗${NC} Migration directory not found: $MIGRATION_DIR"
    exit 1
fi
echo ""

# Check 2: Database connection
echo -e "${YELLOW}[2/5]${NC} Testing database connection..."
if $PSQL_CMD -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to database"
    echo "  Connection string: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    exit 1
fi
echo ""

# Check 3: Critical columns exist
echo -e "${YELLOW}[3/5]${NC} Checking critical columns..."

check_column() {
    local table=$1
    local column=$2
    if $PSQL_CMD -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='$table' AND column_name='$column';" 2>/dev/null | grep -q "$column"; then
        echo -e "${GREEN}✓${NC} $table.$column exists"
        return 0
    else
        echo -e "${RED}✗${NC} $table.$column MISSING"
        return 1
    fi
}

ALL_COLUMNS_OK=true

# Check letters_of_credit columns
check_column "letters_of_credit" "issued_at" || ALL_COLUMNS_OK=false
check_column "letters_of_credit" "issued_by" || ALL_COLUMNS_OK=false
check_column "letters_of_credit" "blockchain_tx_id" || ALL_COLUMNS_OK=false
check_column "letters_of_credit" "port_of_loading" || ALL_COLUMNS_OK=false
check_column "letters_of_credit" "partial_shipment" || ALL_COLUMNS_OK=false

# Check shipments columns
check_column "shipments" "delivery_date" || ALL_COLUMNS_OK=false

# Check forex_allocations columns
check_column "forex_allocations" "approval_date" || ALL_COLUMNS_OK=false
check_column "forex_allocations" "repatriation_date" || ALL_COLUMNS_OK=false
check_column "forex_allocations" "repatriation_amount" || ALL_COLUMNS_OK=false

echo ""

if [ "$ALL_COLUMNS_OK" = false ]; then
    echo -e "${RED}✗${NC} Some columns are missing!"
    echo ""
    echo "To fix, run migrations manually:"
    echo "  cd /home/guda/GoCBC"
    echo "  PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f api/src/migrations/005_add_missing_columns.sql"
    echo ""
    exit 1
fi

# Check 4: Migration tracking table
echo -e "${YELLOW}[4/5]${NC} Checking migration tracking..."
if $PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='_schema_migrations';" 2>/dev/null | grep -q "1"; then
    echo -e "${GREEN}✓${NC} Migration tracking table exists"
    
    APPLIED_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM _schema_migrations;" 2>/dev/null | tr -d ' ')
    if [ "$APPLIED_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} $APPLIED_COUNT migration(s) recorded as applied"
        echo ""
        echo "Applied migrations:"
        $PSQL_CMD -t -c "SELECT '  - ' || migration_name || ' (applied: ' || applied_at::date || ')' FROM _schema_migrations ORDER BY id;" 2>/dev/null
    else
        echo -e "${YELLOW}⚠${NC} No migrations recorded (will run on next API start)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Migration tracking table not found (will be created on first API start)"
fi
echo ""

# Check 5: API build status
echo -e "${YELLOW}[5/5]${NC} Checking API build..."
if [ -f "./api/dist/server.js" ]; then
    echo -e "${GREEN}✓${NC} API is built (dist/server.js exists)"
    
    if [ -f "./api/dist/utils/runMigrations.js" ]; then
        echo -e "${GREEN}✓${NC} Migration runner is built"
    else
        echo -e "${YELLOW}⚠${NC} Migration runner not found in build"
    fi
else
    echo -e "${RED}✗${NC} API is not built"
    echo "  Run: cd api && npm run build"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Your system is ready. Migrations will run automatically when:"
echo "  1. You run: ./start-all.sh"
echo "  2. You start the API: cd api && node dist/server.js"
echo ""
echo "To verify test pass rate after startup:"
echo "  cd /home/guda/GoCBC && bash test/complete-crud-workflow-test.sh"
echo ""
echo "Expected result: 40/40 tests passing (100%)"
echo ""
