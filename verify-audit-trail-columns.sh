#!/bin/bash

echo "=========================================="
echo "AUDIT TRAIL TABLE VERIFICATION"
echo "=========================================="
echo ""

docker exec -i cecbs-postgres psql -U cecbs -d cecbs << 'EOF'
-- Check all columns exist
SELECT 
  column_name, 
  data_type,
  CASE 
    WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
    ELSE ''
  END as length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
ORDER BY ordinal_position;

-- Show row count
SELECT COUNT(*) as total_rows FROM audit_trail;

-- Check if any required columns are missing
SELECT 
  CASE 
    WHEN COUNT(*) = 13 THEN '✅ ALL REQUIRED COLUMNS PRESENT'
    ELSE '❌ MISSING COLUMNS: ' || (13 - COUNT(*))::text
  END as status
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
  AND column_name IN (
    'id', 'entity_type', 'entity_id', 'action', 
    'performed_by', 'performed_by_org', 'organization',
    'old_value', 'new_value', 'reason', 
    'metadata', 'ip_address', 'created_at'
  );
EOF

echo ""
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
