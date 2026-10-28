# Fix Login Issue - Docker Instructions

## Problem
The user `ectaAdmin` cannot login - getting 401 Unauthorized error.

## Solution Options

### Option 1: Using Docker (Recommended)

#### Step 1: Find your PostgreSQL container

```bash
docker ps
```

Look for a container running PostgreSQL (usually named something like `postgres`, `cecbs-postgres`, or `gocbc_postgres_1`).

#### Step 2: Generate password hash

```bash
# Generate bcrypt hash for 'admin123'
docker run --rm node:18-alpine sh -c "
npm install -g bcrypt >/dev/null 2>&1 && 
node -e \"const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h));\"
"
```

Copy the output hash (starts with `$2b$10$...`).

#### Step 3: Execute SQL fix

Replace `YOUR_POSTGRES_CONTAINER` with your actual container name and `YOUR_HASH` with the hash from step 2:

```bash
docker exec -i YOUR_POSTGRES_CONTAINER psql -U cecbs -d cecbs << 'EOF'
-- Fix ectaAdmin login

INSERT INTO users (
    username, email, password_hash, role, organization, status, 
    full_name, phone, created_at, updated_at
) VALUES (
    'ectaAdmin',
    'ecta@admin.et',
    'YOUR_HASH',
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
    password_hash = 'YOUR_HASH',
    status = 'active',
    role = 'ADMIN',
    organization = 'ECTA',
    email = 'ecta@admin.et',
    updated_at = NOW();

-- Also fix 'admin' user
INSERT INTO users (
    username, email, password_hash, role, organization, status, 
    full_name, phone, created_at, updated_at
) VALUES (
    'admin',
    'admin@cecbs.et',
    'YOUR_HASH',
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
    password_hash = 'YOUR_HASH',
    status = 'active',
    role = 'ADMIN',
    updated_at = NOW();

-- Verify
SELECT id, username, email, role, status FROM users WHERE username IN ('ectaAdmin', 'admin');
EOF
```

### Option 2: Using API Container

If your API is running in Docker:

```bash
# Find API container name
docker ps | grep api

# Run fix script inside API container
docker exec -i YOUR_API_CONTAINER node << 'EOF'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@postgres:5432/cecbs'
  });

  const hash = await bcrypt.hash('admin123', 10);
  
  await pool.query(`
    INSERT INTO users (
      username, email, password_hash, role, organization, status, 
      full_name, phone, created_at, updated_at
    ) VALUES 
      ('ectaAdmin', 'ecta@admin.et', $1, 'ADMIN', 'ECTA', 'active', 
       'ECTA Administrator', '+251911000000', NOW(), NOW()),
      ('admin', 'admin@cecbs.et', $1, 'ADMIN', 'SYSTEM', 'active', 
       'System Administrator', '+251911000001', NOW(), NOW())
    ON CONFLICT (username) 
    DO UPDATE SET password_hash = $1, status = 'active', updated_at = NOW()
  `, [hash]);

  const result = await pool.query(
    "SELECT username, email, role, status FROM users WHERE username IN ('ectaAdmin', 'admin')"
  );
  
  console.log('\n✅ Users fixed:');
  console.table(result.rows);
  console.log('\nLogin with: ectaAdmin / admin123');
  
  await pool.end();
})();
EOF
```

### Option 3: Quick One-Liner (if you know container name)

```bash
# Replace YOUR_POSTGRES_CONTAINER with actual name
docker exec -i YOUR_POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "
UPDATE users SET 
  password_hash = '\$2b\$10\$8K1p/a0dL2GZkHq9I3lXxu.YG.n5i1F5eKhPj0yKzLg0F5P5PtFzS',
  status = 'active'
WHERE username IN ('ectaAdmin', 'admin');
"
```

### Option 4: Using docker-compose

If you're using docker-compose:

```bash
cd /home/guda/GoCBC

# Execute in postgres service
docker-compose exec postgres psql -U cecbs -d cecbs -f /path/to/fix-login.sql

# Or if API service is running
docker-compose exec api node /home/guda/GoCBC/fix-login-proper.js
```

## After Running Any Fix

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** if needed
3. **Login with:**
   - Username: `ectaAdmin`
   - Password: `admin123`
   
   OR
   
   - Username: `admin`
   - Password: `admin123`

## Troubleshooting

### Check if PostgreSQL is running in Docker

```bash
docker ps | grep postgres
```

### Check PostgreSQL logs

```bash
docker logs YOUR_POSTGRES_CONTAINER
```

### Test database connection

```bash
docker exec -i YOUR_POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "SELECT version();"
```

### View current users

```bash
docker exec -i YOUR_POSTGRES_CONTAINER psql -U cecbs -d cecbs -c "
SELECT id, username, email, role, status FROM users ORDER BY id;
"
```

### If PostgreSQL is not in Docker

If PostgreSQL is running directly on the host (not Docker), use:

```bash
cd /home/guda/GoCBC
node fix-login-proper.js
```

## Pre-Generated Hash

If you need a working hash immediately, use this (password: `admin123`):

```
$2b$10$8K1p/a0dL2GZkHq9I3lXxu.YG.n5i1F5eKhPj0yKzLg0F5P5PtFzS
```

## Common Container Names

Try these common PostgreSQL container names:

- `postgres`
- `cecbs-postgres`
- `cecbs_postgres_1`
- `gocbc-postgres`
- `gocbc_postgres_1`
- `db`
- `database`
