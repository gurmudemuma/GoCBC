#!/bin/bash
export PGPASSWORD=cecbs123
echo "Applying migration..."
psql -h localhost -U cecbs -d cecbs -f /home/guda/GoCBC/api/migrations/add-crypto-signature-column.sql > /tmp/migration-output.log 2>&1
echo "Exit code: $?"
echo ""
echo "Checking if column exists..."
psql -h localhost -U cecbs -d cecbs -c "\d document_signatures" | grep crypto_signature_embedded > /tmp/column-check.log 2>&1
if [ -s /tmp/column-check.log ]; then
    echo "✅ Column exists!"
    cat /tmp/column-check.log
else
    echo "❌ Column not found"
fi
echo ""
echo "Migration output:"
cat /tmp/migration-output.log
