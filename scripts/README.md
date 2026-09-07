# CECBS Utility Scripts (PostgreSQL)

All utility scripts have been migrated from SQLite to PostgreSQL.

## Prerequisites

```bash
# Install dependencies
cd scripts
npm install
```

## Available Scripts

### 1. Database Migration
Runs all SQL migrations from `api/src/migrations/`

```bash
node migrate-db-pg.js
```

### 2. Add Admin User
Creates the default admin user for the system

```bash
node add-admin-user-pg.js
```

**Default credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change password after first login!**

### 3. Check Admin User
Verifies admin user exists and shows details

```bash
node check-admin-role-pg.js
```

### 4. Update Applications
Backfills missing fields in old approved applications

```bash
node update-old-applications-pg.js
```

## Using NPM Scripts

You can also use the npm script shortcuts:

```bash
npm run migrate        # Run migrations
npm run add-admin      # Add admin user
npm run check-admin    # Check admin user
npm run update-apps    # Update old applications
```

## Environment Variables

The scripts use the following environment variable:

```env
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
```

If not set, it defaults to the above connection string.

## Troubleshooting

### Connection Failed
```
❌ Database connection failed: connect ECONNREFUSED
```

**Solution:** Start PostgreSQL
```bash
docker-compose up -d postgres
```

### Permission Denied
```
❌ Error: permission denied for table users
```

**Solution:** Check database user permissions
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cecbs;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cecbs;
```

### Table Not Found
```
❌ Error: relation "users" does not exist
```

**Solution:** Run migrations first
```bash
node migrate-db-pg.js
```

## Migration from SQLite

Old SQLite scripts have been replaced:
- ❌ `add-admin-user.js` (SQLite) → ✅ `add-admin-user-pg.js` (PostgreSQL)
- ❌ `check-admin-role.js` (SQLite) → ✅ `check-admin-role-pg.js` (PostgreSQL)
- ❌ `migrate-db.js` (SQLite) → ✅ `migrate-db-pg.js` (PostgreSQL)
- ❌ `update-old-applications.js` (SQLite) → ✅ `update-old-applications-pg.js` (PostgreSQL)

The old SQLite scripts can be safely deleted.
