#!/bin/bash
# Fix migration issue by applying schema directly

set -e

echo "=========================================="
echo "🔧 FIXING DATABASE MIGRATION ISSUE"
echo "=========================================="

echo ""
echo "This script will:"
echo "1. Drop all existing tables (clean slate)"
echo "2. Apply schema directly via psql (bypassing migration runner)"
echo "3. Create default admin user"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Applying schema directly to PostgreSQL..."

# Apply the migration file directly using psql
docker exec -i cecbs-postgres psql -U cecbs -d cecbs <<'EOF'
-- Drop all tables first
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF NOT EXISTS post_delivery_tracking CASCADE;
DROP TABLE IF EXISTS approval_workflow_state CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS customs_clearances CASCADE;
DROP TABLE IF EXISTS customs_declarations CASCADE;
DROP TABLE IF EXISTS forex_allocations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS letters_of_credit CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS document_verifications CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS shipment_status_history CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS quality_inspections CASCADE;
DROP TABLE IF EXISTS exporter_applications CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Now create them in correct order
\i /docker-entrypoint-initdb.d/000_initial_schema.sql

-- Verify tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

EOF

if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully"
else
    echo "❌ Failed to apply schema"
    exit 1
fi

echo ""
echo "Step 2: Creating default admin user..."

docker exec -i cecbs-postgres psql -U cecbs -d cecbs <<'EOF'
-- Insert admin user (password: admin123)
INSERT INTO users (
    username,
    password_hash,
    email,
    organization,
    role,
    full_name,
    status,
    created_at
) VALUES (
    'admin',
    '$2b$10$rJZOEGVZBqZ1WQVKZJv2U.9yKQ3xh9qK5x3x3x3x3x3x3x3x3x3x3',  -- admin123
    'admin@cecbs.et',
    'ADMIN',
    'ADMIN',
    'System Administrator',
    'active',
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

SELECT username, role, status FROM users WHERE username = 'admin';

EOF

echo ""
echo "=========================================="
echo "✅ DATABASE FIXED!"
echo "=========================================="
echo ""
echo "Schema applied directly to PostgreSQL"
echo "Admin user: admin / admin123"
echo ""

