#!/bin/bash
# Quick database status check

export PGPASSWORD="cecbs123"

echo "=== CHECKING DATABASE STATUS ==="
echo ""

# Check if PostgreSQL is accessible
psql -h localhost -p 5432 -U cecbs -d cecbs -c "SELECT version();" > /tmp/pg-version.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is accessible"
    cat /tmp/pg-version.txt | head -3
else
    echo "❌ PostgreSQL is NOT accessible"
    cat /tmp/pg-version.txt
    exit 1
fi

echo ""
echo "=== TABLE COUNT ==="
psql -h localhost -p 5432 -U cecbs -d cecbs -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';" > /tmp/table-count.txt 2>&1
cat /tmp/table-count.txt

echo ""
echo "=== TABLES LIST ==="
psql -h localhost -p 5432 -U cecbs -d cecbs -c "\dt" > /tmp/tables-list.txt 2>&1
cat /tmp/tables-list.txt | head -40

echo ""
echo "=== CHECKING CRITICAL TABLES ==="
for table in users exporter_applications documents audit_trail shipments; do
    COUNT=$(psql -h localhost -p 5432 -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" 2>&1 | tr -d ' ')
    if [ "$COUNT" = "1" ]; then
        ROWS=$(psql -h localhost -p 5432 -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM $table;" 2>&1 | tr -d ' ')
        echo "✅ $table ($ROWS rows)"
    else
        echo "❌ $table (MISSING)"
    fi
done

echo ""
echo "=== DONE ==="
