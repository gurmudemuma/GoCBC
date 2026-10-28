#!/bin/bash
# Fix ectaAdmin login using Docker

echo "🔧 Fixing ectaAdmin login via Docker..."
echo ""

# Check if PostgreSQL container exists
POSTGRES_CONTAINER=$(docker ps -a --filter "ancestor=postgres" --format "{{.Names}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    # Try to find by name pattern
    POSTGRES_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -i postgres | head -1)
fi

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ No PostgreSQL container found"
    echo ""
    echo "Available containers:"
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo "Please specify the PostgreSQL container name:"
    echo "   export POSTGRES_CONTAINER=your_postgres_container_name"
    echo "   Then run this script again"
    exit 1
fi

echo "📦 Using PostgreSQL container: $POSTGRES_CONTAINER"
echo ""

# Generate bcrypt hash for 'admin123'
echo "🔐 Generating password hash..."
HASH=$(docker run --rm node:18-alpine sh -c "npm install -g bcrypt && node -e \"const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h));\"" 2>/dev/null | tail -1)

if [ -z "$HASH" ]; then
    echo "⚠️  Could not generate hash with Docker, using pre-generated hash"
    HASH='$2b$10$8K1p/a0dL2GZkHq9I3lXxu.YG.n5i1F5eKhPj0yKzLg0F5P5PtFzS'
fi

echo "Generated hash: ${HASH:0:20}..."
echo ""

# Create SQL fix script
cat > /tmp/fix-login-temp.sql << EOF
-- Fix login for ectaAdmin and admin users

-- First, show current users
SELECT 'Current users:' as info;
SELECT id, username, email, role, status FROM users WHERE role = 'ADMIN' OR username IN ('ectaAdmin', 'admin');

-- Create/Update ectaAdmin user
INSERT INTO users (
    username, email, password_hash, role, organization, status, 
    full_name, phone, created_at, updated_at
) VALUES (
    'ectaAdmin',
    'ecta@admin.et',
    '${HASH}',
    'ADMIN',
    'ECTA',
    'active',
    'ECTA Administrator',
    '+251911000000',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
    password_hash = '${HASH}',
    status = 'active',
    role = 'ADMIN',
    organization = 'ECTA',
    email = 'ecta@admin.et',
    full_name = 'ECTA Administrator',
    updated_at = NOW();

-- Create/Update admin user
INSERT INTO users (
    username, email, password_hash, role, organization, status, 
    full_name, phone, created_at, updated_at
) VALUES (
    'admin',
    'admin@cecbs.et',
    '${HASH}',
    'ADMIN',
    'SYSTEM',
    'active',
    'System Administrator',
    '+251911000001',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
    password_hash = '${HASH}',
    status = 'active',
    role = 'ADMIN',
    updated_at = NOW();

-- Show updated users
SELECT 'Updated users:' as info;
SELECT id, username, email, role, organization, status, full_name FROM users WHERE username IN ('ectaAdmin', 'admin');
EOF

echo "📝 SQL script created"
echo ""
echo "🚀 Executing fix in PostgreSQL container..."
echo ""

# Copy SQL file to container and execute
docker cp /tmp/fix-login-temp.sql $POSTGRES_CONTAINER:/tmp/fix-login.sql

# Execute the SQL
docker exec -i $POSTGRES_CONTAINER psql -U cecbs -d cecbs -f /tmp/fix-login.sql

# Cleanup
rm /tmp/fix-login-temp.sql
docker exec $POSTGRES_CONTAINER rm /tmp/fix-login.sql

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ LOGIN FIX COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 CREDENTIALS:"
echo ""
echo "   Option 1:"
echo "   Username: ectaAdmin"
echo "   Password: admin123"
echo ""
echo "   Option 2:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🔄 Next steps:"
echo "   1. Refresh your browser (Ctrl+Shift+R)"
echo "   2. Clear browser cache if needed"
echo "   3. Login with credentials above"
echo ""
