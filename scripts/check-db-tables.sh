#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "  Database Schema Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. Counting tables..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

echo ""
echo "2. Listing all tables..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
" | grep -v "row"

echo ""
echo "3. Checking critical tables and their columns..."

# Critical tables to check
TABLES=(
    "users"
    "contracts"
    "shipments"
    "quality_inspections"
    "customs_declarations"
    "letters_of_credit"
    "payments"
    "documents"
    "audit_logs"
    "exporters"
    "exporter_applications"
)

for table in "${TABLES[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Table: $table"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if table exists and count columns
    docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
    SELECT 
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table')
            THEN '✓ EXISTS'
            ELSE '✗ MISSING'
        END as status,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '$table') as column_count;
    " 2>/dev/null
    
    # List columns if table exists
    docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = '$table'
    ORDER BY ordinal_position;
    " 2>/dev/null | head -30
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "4. Checking for specific important columns..."
echo "════════════════════════════════════════════════════════════"

# Check specific columns that are commonly needed
docker exec cecbs-postgres psql -U cecbs -d cecbs << 'EOF'
-- Check quality_inspections.passed column
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quality_inspections' AND column_name = 'passed'
    ) THEN '✓ quality_inspections.passed EXISTS'
    ELSE '✗ quality_inspections.passed MISSING'
    END;

-- Check customs_declarations.clearance_status column
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customs_declarations' AND column_name = 'clearance_status'
    ) THEN '✓ customs_declarations.clearance_status EXISTS'
    ELSE '✗ customs_declarations.clearance_status MISSING'
    END;

-- Check documents.entity_type column
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'entity_type'
    ) THEN '✓ documents.entity_type EXISTS'
    ELSE '✗ documents.entity_type MISSING'
    END;

-- Check documents.entity_id column
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'entity_id'
    ) THEN '✓ documents.entity_id EXISTS'
    ELSE '✗ documents.entity_id MISSING'
    END;

-- Check payments.contract_id column
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'contract_id'
    ) THEN '✓ payments.contract_id EXISTS'
    ELSE '✗ payments.contract_id MISSING'
    END;

-- Check contracts rejection metadata
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'rejection_reason'
    ) THEN '✓ contracts.rejection_reason EXISTS'
    ELSE '✗ contracts.rejection_reason MISSING'
    END;
EOF

echo ""
echo "════════════════════════════════════════════════════════════"
echo "5. Summary"
echo "════════════════════════════════════════════════════════════"

docker exec cecbs-postgres psql -U cecbs -d cecbs << 'EOF'
SELECT 
    'Total Tables: ' || COUNT(DISTINCT table_name)::text as summary
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Total Columns: ' || COUNT(*)::text
FROM information_schema.columns 
WHERE table_schema = 'public';
EOF

echo ""
echo "✓ Verification Complete"
echo ""
