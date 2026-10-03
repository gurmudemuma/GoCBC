# User Management 500 Error - Diagnosis and Fix

## Problem

The User Management page is showing 500 Internal Server Error when trying to fetch users:
```
Failed to load users: AxiosError: Request failed with status code 500
GET /api/v1/users?limit=10&offset=0 - 500 Internal Server Error
```

## Root Cause

The `users` table in the PostgreSQL database is missing required columns that the API endpoint is trying to SELECT. 

The GET /users endpoint (in `/api/src/routes/users.ts`) is trying to query:
```sql
SELECT id, username, email, full_name, role, organization, 
       exporter_id, status, created_at, last_login 
FROM users
```

However, the initial migration file `000_initial_schema.sql` was missing several columns:
- `full_name`
- `exporter_id`
- `ecta_license`
- `phone`
- `permissions`
- `last_login`
- `is_active`
- And other bank-related fields

## Solution

### Step 1: Apply the Schema Migration

A migration file has been created at:
`/home/guda/GoCBC/api/src/migrations/018_update_users_table_schema.sql`

This migration will:
1. Add all missing columns to the users table
2. Convert the `password` column to `password_hash` if needed
3. Ensure email and organization are NOT NULL with proper defaults
4. Add indexes for better query performance

### Step 2: Run the Migration

#### Option A: Using the automated script (Recommended)

```bash
cd /home/guda/GoCBC
node run-users-table-migration.js
```

This script will:
- Connect to the PostgreSQL database
- Show current table schema
- Apply the migration
- Show updated schema
- Test the query to verify it works

#### Option B: Run manually with psql

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U cecbs -d cecbs

# Run the migration
\i api/src/migrations/018_update_users_table_schema.sql

# Verify the schema
\d users

# Test the query
SELECT id, username, email, full_name, role, organization, 
       exporter_id, status, created_at, last_login 
FROM users 
LIMIT 5;
```

#### Option C: Run via Docker (if database is in Docker)

```bash
# Find the postgres container name
docker ps | grep postgres

# Run the migration
docker exec -i <postgres_container_name> psql -U cecbs -d cecbs < api/src/migrations/018_update_users_table_schema.sql
```

### Step 3: Restart the API Server

After applying the migration, restart the API:

```bash
# If using npm
cd /home/guda/GoCBC/api
npm run dev

# If using Docker
docker-compose restart api

# If using pm2
pm2 restart api
```

### Step 4: Test the User Management Page

1. Navigate to the User Management page in the UI
2. The page should now load without 500 errors
3. You should see a list of users in the table

## Verification

To verify the fix worked, you can:

### 1. Check the API endpoint directly:

```bash
# Login first
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token'

# Save the token and use it to get users
curl http://localhost:3001/api/v1/users?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | jq
```

### 2. Check the database schema:

```bash
psql -h localhost -p 5432 -U cecbs -d cecbs -c "\d users"
```

Expected columns:
- id
- username
- password_hash
- email (UNIQUE, NOT NULL)
- full_name
- role
- organization (NOT NULL)
- exporter_id
- ecta_license
- phone
- bank_name
- bank_account_number
- bank_branch
- bank_branch_code
- permissions
- status
- last_login
- is_active
- created_at
- updated_at

## Files Modified

1. `/home/guda/GoCBC/api/src/migrations/000_initial_schema.sql` - Updated to include all columns
2. `/home/guda/GoCBC/api/src/migrations/018_update_users_table_schema.sql` - New migration file
3. `/home/guda/GoCBC/run-users-table-migration.js` - Migration runner script

## Prevention

To prevent similar issues in the future:

1. **Always keep migrations in sync with code**: When adding new fields to models, create corresponding migrations
2. **Test migrations**: Run migrations on a test database before production
3. **Use migration tracking**: Implement a `migrations` table to track which migrations have been applied
4. **Schema validation**: Add startup checks to validate that the database schema matches expectations

## Additional Notes

- The migration is idempotent - it can be run multiple times safely
- Existing data will not be lost
- The migration adds sensible defaults for NULL values
- Indexes are created for commonly queried columns

## Troubleshooting

### Error: "relation 'users' does not exist"

The users table hasn't been created yet. Run the initial schema:

```bash
psql -h localhost -p 5432 -U cecbs -d cecbs < api/src/migrations/000_initial_schema.sql
```

### Error: "password_hash column does not exist"

Your database still has the old `password` column name. The migration will automatically rename it.

### Error: "duplicate key value violates unique constraint"

You have duplicate emails in the database. Run this before the migration:

```sql
-- Find duplicates
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Fix duplicates by adding a suffix
UPDATE users 
SET email = email || '.' || id 
WHERE id IN (
  SELECT id FROM users WHERE email IN (
    SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1
  )
);
```

## Need Help?

If you encounter issues:
1. Check the API logs: `docker logs <api_container>` or `pm2 logs api`
2. Check PostgreSQL logs: `docker logs <postgres_container>`
3. Verify database connection: Check `DATABASE_URL` in `/home/guda/GoCBC/api/.env`
