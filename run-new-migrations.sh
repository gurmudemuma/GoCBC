#!/bin/bash

# Run New Database Migrations for HIGH Priority Features
# Migrations: 019 (Repatriation), 020 (Inspection), 021 (Border Crossing), 022 (LC Discrepancies)

set -e

echo "================================================"
echo "Running New Migrations for HIGH Priority Features"
echo "================================================"
echo ""

# Database connection details from .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-cecbs}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "📊 Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"
echo ""

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Function to run migration
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    echo "──────────────────────────────────────────────"
    echo "📝 Running: $migration_name"
    echo "──────────────────────────────────────────────"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo "✅ SUCCESS: $migration_name completed"
        echo ""
    else
        echo "❌ ERROR: $migration_file failed"
        exit 1
    fi
}

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to PostgreSQL"
    echo "   Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi
echo "✅ PostgreSQL connection successful"
echo ""

# Run migrations in order
echo "🚀 Starting migrations..."
echo ""

run_migration "api/src/migrations/019_create_repatriation_table.sql"
run_migration "api/src/migrations/020_create_inspection_table.sql"
run_migration "api/src/migrations/021_create_border_crossing_table.sql"
run_migration "api/src/migrations/022_add_lc_discrepancies.sql"

echo "================================================"
echo "✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!"
echo "================================================"
echo ""
echo "📊 New Tables Created:"
echo "   1. export_proceeds_repatriation"
echo "   2. pre_shipment_inspections"
echo "   3. border_crossings"
echo "   4. lc_discrepancies"
echo ""
echo "📝 Columns Added to Existing Tables:"
echo "   - letter_of_credits (discrepancy fields)"
echo ""
echo "🎉 Database is ready for new features!"
echo ""

# Verify tables were created
echo "🔍 Verifying table creation..."
echo ""

verify_table() {
    local table_name=$1
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d $table_name" > /dev/null 2>&1; then
        echo "✅ Table exists: $table_name"
    else
        echo "⚠️  Table not found: $table_name"
    fi
}

verify_table "export_proceeds_repatriation"
verify_table "pre_shipment_inspections"
verify_table "border_crossings"
verify_table "lc_discrepancies"

echo ""
echo "================================================"
echo "Database migration complete! Ready for API sync."
echo "================================================"
