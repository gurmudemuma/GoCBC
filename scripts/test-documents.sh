#!/bin/bash

echo "=========================================="
echo "  Testing Document Upload & Retrieval"
echo "=========================================="
echo ""

# Check if PostgreSQL is running
PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db -c "\q" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ PostgreSQL is not accessible"
    echo "Please ensure PostgreSQL is running on localhost:5432"
    exit 1
fi

echo "✅ PostgreSQL is accessible"
echo ""

# Run the document check SQL script
echo "Running document diagnostics..."
echo ""

PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db -f /home/guda/GoCBC/scripts/check-documents.sql

echo ""
echo "=========================================="
echo "  Quick Commands"
echo "=========================================="
echo ""
echo "To check documents manually:"
echo "  PGPASSWORD=root psql -U postgres -h localhost -p 5432 -d gocbc_db"
echo ""
echo "Then run:"
echo "  SELECT * FROM documents WHERE entity_type = 'EXPORTER_APPLICATION';"
echo ""
echo "To test API endpoint (replace APP-ID and TOKEN):"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" \\"
echo "    http://localhost:3001/api/v1/documents/entity/EXPORTER_APPLICATION/APP-ID"
echo ""
