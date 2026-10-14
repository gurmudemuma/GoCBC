#!/bin/bash
##############################################################################
# Apply Missing Approval Columns Migration
# Adds columns required for the exporter application approval workflow
##############################################################################

set -e

DB_USER="cecbs"
DB_PASSWORD="cecbs123"
DB_NAME="cecbs"
DB_HOST="localhost"
DB_PORT="5432"

echo "Applying approval columns migration to PostgreSQL database..."
echo "Database: $DB_NAME"
echo ""

export PGPASSWORD="$DB_PASSWORD"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f add-missing-approval-columns.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Added columns:"
    echo "  - account_created (BOOLEAN)"
    echo "  - license_number (VARCHAR)"
    echo "  - ecta_license_number (VARCHAR)"
    echo "  - license_issued_date (TIMESTAMP)"
    echo "  - license_expiry_date (TIMESTAMP)"
    echo "  - digital_signature (TEXT)"
    echo "  - verification_code (VARCHAR)"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi
