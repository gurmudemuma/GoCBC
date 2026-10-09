#!/bin/bash
echo "🔧 Fixing Audit Trail Database..."

# Using sqlite3 if available
if command -v sqlite3 &> /dev/null; then
    echo "Using SQLite..."
    sqlite3 api/cecbs.db << 'SQL'
ALTER TABLE audit_trail ADD COLUMN performed_by TEXT;
ALTER TABLE audit_trail ADD COLUMN performed_by_org TEXT;
ALTER TABLE audit_trail ADD COLUMN organization TEXT;
.schema audit_trail
SQL
    echo "✅ Columns added to SQLite database"
fi

# Restart API
echo "🔄 Restarting API..."
./restart-api.sh

echo "✅ Done! Test the Audit Trail tab now."
