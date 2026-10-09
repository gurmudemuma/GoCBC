#!/bin/bash

echo "=========================================="
echo "Applying Documents Table Fix"
echo "=========================================="
echo ""

# Apply migration
echo "Running migration..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f /home/guda/GoCBC/database/migrations/1000_add_contract_id_to_documents.sql

echo ""
echo "=========================================="
echo "Verifying columns added..."
echo "=========================================="

# Show updated schema
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "\d documents"

echo ""
echo "=========================================="
echo "Migration complete!"
echo "=========================================="
echo ""
echo "Now restart the API with:"
echo "  bash /home/guda/GoCBC/RESTART-API-WITH-FIX.sh"
