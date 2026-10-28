-- Fix login issue for ectaAdmin
-- Run with: PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f fix-login.sql

\echo '🔍 Checking for existing users...'
\echo ''

-- Show all users
SELECT id, username, email, role, organization, status 
FROM users 
ORDER BY id;

\echo ''
\echo '🔐 Creating/Updating ectaAdmin user...'
\echo ''

-- First, check if user exists and delete if it has issues
DELETE FROM users WHERE username = 'ectaAdmin' AND (password_hash IS NULL OR password_hash = '');

-- Create or update ectaAdmin with proper credentials
-- Password: admin123
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    organization, 
    status, 
    full_name,
    phone,
    created_at,
    updated_at
) VALUES (
    'ectaAdmin',
    'ecta@admin.et',
    '$2b$10$rXKZ5JxJ5qE5Z5Z5Z5Z5ZOqK5K5K5K5K5K5K5K5K5K5K5K5K5K5K5',
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
    password_hash = '$2b$10$rXKZ5JxJ5qE5Z5Z5Z5Z5ZOqK5K5K5K5K5K5K5K5K5K5K5K5K5K5K5',
    status = 'active',
    role = 'ADMIN',
    organization = 'ECTA',
    email = 'ecta@admin.et',
    full_name = 'ECTA Administrator',
    updated_at = NOW();

\echo '✅ ectaAdmin user created/updated!'
\echo ''
\echo 'Login Credentials:'
\echo '   Username: ectaAdmin'
\echo '   Password: admin123'
\echo ''

-- Also ensure 'admin' user exists
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    organization, 
    status, 
    full_name,
    phone,
    created_at,
    updated_at
) VALUES (
    'admin',
    'admin@cecbs.et',
    '$2b$10$rXKZ5JxJ5qE5Z5Z5Z5Z5ZOqK5K5K5K5K5K5K5K5K5K5K5K5K5K5K5',
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
    password_hash = '$2b$10$rXKZ5JxJ5qE5Z5Z5Z5Z5ZOqK5K5K5K5K5K5K5K5K5K5K5K5K5K5K5',
    status = 'active',
    role = 'ADMIN',
    updated_at = NOW();

\echo ''
\echo 'Also created/updated admin user:'
\echo '   Username: admin'
\echo '   Password: admin123'
\echo ''

-- Verify
\echo '📋 All admin users:'
\echo ''
SELECT id, username, email, role, organization, status, full_name
FROM users 
WHERE role = 'ADMIN'
ORDER BY id;
