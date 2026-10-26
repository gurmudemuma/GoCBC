#!/bin/bash
#
# Complete Database Setup Script
# Ensures all required tables exist for CECBS system
#

set -e

echo "=========================================="
echo "CECBS Complete Database Setup"
echo "=========================================="
echo ""

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cecbs"
DB_USER="cecbs"
DB_PASS="cecbs123"

export PGPASSWORD="$DB_PASS"

echo "🔍 Checking PostgreSQL connection..."
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not accessible"
    echo "   Please start PostgreSQL: sudo systemctl start postgresql"
    exit 1
fi
echo "✅ PostgreSQL is running"
echo ""

echo "📊 Checking existing tables..."
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
echo "   Found $TABLE_COUNT tables"
echo ""

echo "🔧 Running database initialization..."
if [ -f "scripts/init-db.sql" ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/init-db.sql > /tmp/init-db.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema initialized"
    else
        echo "⚠️ Some errors occurred (might be duplicate tables - that's OK)"
        echo "   Check /tmp/init-db.log for details"
    fi
else
    echo "⚠️ scripts/init-db.sql not found"
fi
echo ""

echo "🔧 Running migrations..."
if [ -f "api/run-migrations.js" ]; then
    cd api
    node run-migrations.js > /tmp/migrations.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Migrations completed"
    else
        echo "⚠️ Migration errors (might be OK if tables exist)"
        echo "   Check /tmp/migrations.log for details"
    fi
    cd ..
else
    echo "⚠️ api/run-migrations.js not found"
fi
echo ""

echo "📊 Final table count..."
TABLE_COUNT_AFTER=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
echo "   Total tables: $TABLE_COUNT_AFTER"
echo ""

echo "🔍 Checking critical tables..."
CRITICAL_TABLES=(
    "users"
    "exporter_applications"
    "export_contracts"
    "sales_contracts"
    "shipments"
    "quality_inspections"
    "documents"
    "audit_trail"
    "blockchain_sync_queue"
    "blockchain_cache"
)

MISSING_TABLES=()
for table in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table')" 2>/dev/null | tr -d ' ')
    
    if [ "$EXISTS" = "t" ]; then
        echo "   ✅ $table"
    else
        echo "   ❌ $table (MISSING)"
        MISSING_TABLES+=("$table")
    fi
done
echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo "=========================================="
    echo "✅ DATABASE SETUP COMPLETE"
    echo "   All critical tables exist"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    echo "⚠️ SETUP INCOMPLETE"
    echo "   Missing ${#MISSING_TABLES[@]} critical table(s):"
    for table in "${MISSING_TABLES[@]}"; do
        echo "   - $table"
    done
    echo ""
    echo "   Check logs for details:"
    echo "   - /tmp/init-db.log"
    echo "   - /tmp/migrations.log"
    echo "=========================================="
    exit 1
fi
