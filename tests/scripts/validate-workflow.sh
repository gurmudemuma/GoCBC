#!/bin/bash

# Coffee Export Workflow Validation Script
# Checks data integrity across all workflow stages

PGPASSWORD=cecbs123
DB_USER=cecbs
DB_HOST=localhost
DB_NAME=cecbs

echo "=================================="
echo "COFFEE EXPORT WORKFLOW VALIDATION"
echo "=================================="
echo ""

# Check 1: Table Existence
echo "📊 Check 1: Verifying all required tables exist..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('exporters', 'contracts', 'shipments', 'quality_inspections', 
                     'customs_declarations', 'letters_of_credit', 'payments', 'exporter_applications');" | tr -d ' '

# Check 2: Exporter-Contract Links
echo "🔗 Check 2: Verifying exporter-contract integrity..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM contracts c
LEFT JOIN exporters e ON c.exporter_id = e.exporter_id
WHERE e.exporter_id IS NULL;" | tr -d ' '

# Check 3: Contract-Shipment Quantity
echo "📦 Check 3: Checking contract-shipment quantities..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM (
  SELECT c.contract_id, c.quantity as contract_quantity,
         COALESCE(SUM(s.quantity), 0) as shipped_quantity
  FROM contracts c
  LEFT JOIN shipments s ON c.contract_id = s.contract_id AND s.status != 'CANCELLED'
  GROUP BY c.contract_id, c.quantity
  HAVING COALESCE(SUM(s.quantity), 0) > c.quantity
) AS violations;" | tr -d ' '

# Check 4: Quality Inspections
echo "✅ Check 4: Verifying inspection-shipment links..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM quality_inspections qi
LEFT JOIN shipments s ON qi.shipment_id = s.shipment_id
WHERE s.shipment_id IS NULL;" | tr -d ' '

# Check 5: Export Permits
echo "🎫 Check 5: Checking export permit issuance..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM quality_inspections
WHERE status = 'permit_issued';" | tr -d ' '

# Check 6: Customs Declarations
echo "🛃 Check 6: Validating customs declarations..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
SELECT COUNT(*) FROM customs_declarations;" | tr -d ' '

# Check 7: Workflow Summary
echo ""
echo "=================================="
echo "WORKFLOW STAGE SUMMARY"
echo "=================================="
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Exporters' as stage,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
FROM exporters

UNION ALL

SELECT 
    'Contracts',
    COUNT(*),
    SUM(CASE WHEN status IN ('REGISTERED', 'APPROVED', 'active', 'draft') THEN 1 ELSE 0 END)
FROM contracts

UNION ALL

SELECT 
    'Shipments',
    COUNT(*),
    SUM(CASE WHEN status NOT IN ('CANCELLED', 'REJECTED') THEN 1 ELSE 0 END)
FROM shipments

UNION ALL

SELECT 
    'Inspections',
    COUNT(*),
    SUM(CASE WHEN status IN ('permit_issued', 'approved') THEN 1 ELSE 0 END)
FROM quality_inspections

UNION ALL

SELECT 
    'Customs',
    COUNT(*),
    SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END)
FROM customs_declarations

UNION ALL

SELECT 
    'Payments',
    COUNT(*),
    SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN 1 ELSE 0 END)
FROM payments;
"

echo ""
echo "✅ Validation complete!"
