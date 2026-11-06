#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Database Schema Verification                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cecbs"
DB_USER="postgres"
DB_PASS="postgres"

export PGPASSWORD=$DB_PASS

echo "1. Checking database connection..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ Database connection successful"
else
    echo "   ✗ Database connection failed"
    exit 1
fi

echo ""
echo "2. Listing all tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" | grep -E "table|public"

echo ""
echo "3. Checking critical tables..."

# List of critical tables
TABLES=(
    "users"
    "roles"
    "exporter_applications"
    "contracts"
    "shipments"
    "quality_inspections"
    "customs_declarations"
    "letters_of_credit"
    "payments"
    "documents"
    "audit_logs"
    "blockchain_sync"
    "exporters"
)

for table in "${TABLES[@]}"; do
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d $table" > /dev/null 2>&1; then
        echo "   ✓ $table exists"
    else
        echo "   ✗ $table MISSING"
    fi
done

echo ""
echo "4. Getting table column counts..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
    table_name,
    COUNT(column_name) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
EOF

echo ""
echo "5. Checking for missing columns in critical tables..."

# Check users table
echo ""
echo "   Users table columns:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d users" | grep -E "id|username|email|organization|role|exporter_id"

# Check contracts table
echo ""
echo "   Contracts table columns:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d contracts" 2>/dev/null | head -20

# Check shipments table
echo ""
echo "   Shipments table columns:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d shipments" | head -20

# Check quality_inspections table
echo ""
echo "   Quality Inspections table columns:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d quality_inspections" | head -20

echo ""
echo "6. Checking for common missing columns..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Check if quality_inspections has 'passed' column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'quality_inspections' 
            AND column_name = 'passed'
        ) THEN '✓ quality_inspections.passed exists'
        ELSE '✗ quality_inspections.passed MISSING'
    END as status;

-- Check if customs_declarations has required columns
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customs_declarations' 
            AND column_name = 'clearance_status'
        ) THEN '✓ customs_declarations.clearance_status exists'
        ELSE '✗ customs_declarations.clearance_status MISSING'
    END as status;

-- Check if documents has entity linkage
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'entity_type'
        ) THEN '✓ documents.entity_type exists'
        ELSE '✗ documents.entity_type MISSING'
    END as status;
EOF

echo ""
echo "7. Summary of migration status..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
    COUNT(DISTINCT table_name) as total_tables,
    SUM(CASE WHEN table_name LIKE '%_history' THEN 1 ELSE 0 END) as history_tables,
    SUM(CASE WHEN table_name LIKE 'blockchain_%' THEN 1 ELSE 0 END) as blockchain_tables
FROM information_schema.tables
WHERE table_schema = 'public';
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Verification Complete                                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
