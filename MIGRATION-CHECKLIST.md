# ✅ SQLite to PostgreSQL Migration Checklist

## Pre-Migration Verification

- [ ] PostgreSQL is installed and running
  ```bash
  docker ps | grep postgres
  # OR
  docker-compose up -d postgres
  ```

- [ ] PostgreSQL connection works
  ```bash
  psql -h localhost -U cecbs -d cecbs
  # Password: cecbs123
  ```

- [ ] Backup existing SQLite database (if exists)
  ```bash
  cp api/cecbs.db api/cecbs.db.backup-$(date +%Y%m%d)
  ```

## Migration Steps

### Step 1: Install Script Dependencies
```bash
cd scripts
npm install
```

**Expected output:**
```
✅ added 2 packages (pg, bcrypt)
```

- [ ] Dependencies installed successfully

### Step 2: Test Database Connection
```bash
node -e "require('./db-helper').testConnection().then(r => console.log(r))"
```

**Expected output:**
```json
{
  "success": true,
  "time": "2026-09-01T10:30:00.000Z",
  "version": "PostgreSQL 15.x on x86_64..."
}
```

- [ ] Connection test passed

### Step 3: Run Database Migrations
```bash
node migrate-db-pg.js
```

**Expected output:**
```
✅ All migrations processed successfully!
```

- [ ] Migrations completed
- [ ] Tables created: `users`, `audit_trail`, `exporter_applications`, etc.

### Step 4: Create Admin User
```bash
node add-admin-user-pg.js
```

**Expected output:**
```
✅ Admin user created successfully!
Username: admin
Password: admin123
```

- [ ] Admin user created
- [ ] Login credentials noted

### Step 5: Verify Admin User
```bash
node check-admin-role-pg.js
```

**Expected output:**
```
✅ Admin user found!
```

- [ ] Admin verification passed

### Step 6: Update Old Applications (Optional)
```bash
node update-old-applications-pg.js
```

- [ ] Applications updated (or skipped if not needed)

### Step 7: Verify API Database Service
Check that `api/src/services/databaseService.ts` uses PostgreSQL:

```typescript
const connectionString = process.env.DATABASE_URL || 
  'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

this.pgPool = new Pool({ connectionString });
```

- [ ] DatabaseService uses PostgreSQL ✅ (Already correct!)

### Step 8: Update Environment Variables
Check `api/.env`:

```env
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
```

- [ ] DATABASE_URL is set correctly

### Step 9: Test API Startup
```bash
cd api
npm start
```

**Expected output:**
```
✅ PostgreSQL connected
🚀 Server running on port 3001
```

- [ ] API starts successfully
- [ ] Database connection confirmed

### Step 10: Test Login
1. Start UI: `cd ui && npm run dev`
2. Open browser: `http://localhost:3000`
3. Login with `admin` / `admin123`

- [ ] Login successful
- [ ] Dashboard loads

### Step 11: Verify Blockchain Integration
```bash
docker ps | grep peer
docker ps | grep couchdb
```

**Expected:**
- [ ] All peers running (7+ containers)
- [ ] CouchDB running for each peer

### Step 12: Test Complete Workflow
1. Create exporter application
2. Verify data in PostgreSQL
3. Verify blockchain transaction recorded
4. Check audit trail

- [ ] Workflow completes successfully
- [ ] PostgreSQL data synced
- [ ] Blockchain data recorded

## Cleanup (After Successful Migration)

### Remove SQLite Files and Scripts

**Windows:**
```powershell
powershell scripts/cleanup-sqlite.ps1
```

**Linux/Mac:**
```bash
bash scripts/cleanup-sqlite.sh
```

**Manual cleanup:**
```bash
# Remove SQLite database files
rm -f api/cecbs.db
rm -f api/cecbs.db.backup*
rm -f **/*.db

# Remove old scripts
rm -f scripts/migrate-db.js
rm -f scripts/check-admin-role.js
rm -f scripts/add-admin-user.js
rm -f scripts/update-old-applications.js
rm -f api/scripts/add-bank-columns.js
rm -f api/scripts/add-new-columns.js

# Uninstall SQLite packages
cd api
npm uninstall sqlite3 better-sqlite3
```

- [ ] SQLite database files removed
- [ ] Old SQLite scripts removed
- [ ] SQLite npm packages uninstalled

## Post-Migration Verification

### Final Checks

- [ ] No `.db` files in project (except in node_modules)
  ```bash
  find . -name "*.db" -not -path "*/node_modules/*"
  # Should return nothing
  ```

- [ ] No SQLite packages in package.json
  ```bash
  grep -r "sqlite" api/package.json
  # Should return nothing
  ```

- [ ] All scripts use PostgreSQL
  ```bash
  grep -r "sqlite3" scripts/*.js
  # Should return nothing
  ```

- [ ] System architecture confirmed:
  - ✅ PostgreSQL (off-chain)
  - ✅ Hyperledger Fabric (blockchain)
  - ✅ CouchDB (Fabric state database)
  - ❌ No SQLite

## Rollback Plan (If Needed)

If migration fails, rollback:

1. **Restore SQLite database:**
   ```bash
   cp api/cecbs.db.backup-YYYYMMDD api/cecbs.db
   ```

2. **Reinstall SQLite packages:**
   ```bash
   cd api
   npm install sqlite3@^5.1.7
   ```

3. **Revert to old scripts:**
   ```bash
   git checkout scripts/
   ```

## Success Criteria

✅ **Migration is successful when:**

1. PostgreSQL connection works
2. All database tables exist
3. Admin user can login
4. API starts without errors
5. Blockchain integration works
6. Complete workflow functions
7. No SQLite files remain
8. All scripts use PostgreSQL

## Support

### Common Issues

**Issue: Connection refused**
```
❌ Database connection failed: connect ECONNREFUSED
```
**Solution:** Start PostgreSQL
```bash
docker-compose up -d postgres
```

---

**Issue: Table not found**
```
❌ Error: relation "users" does not exist
```
**Solution:** Run migrations
```bash
node scripts/migrate-db-pg.js
```

---

**Issue: Permission denied**
```
❌ Error: permission denied for table users
```
**Solution:** Grant permissions
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cecbs;
```

---

**Issue: Peer connection failed**
```
❌ Error: Failed to connect to peer
```
**Solution:** Check Fabric network
```bash
docker-compose -f docker-compose-fabric.yml up -d
```

## Documentation

After migration, update:
- [ ] README.md - Remove SQLite references
- [ ] QUICK-START.md - Update database setup
- [ ] .env.example - Ensure DATABASE_URL is documented

## Sign-Off

**Migration completed by:** _________________

**Date:** _________________

**Verification:** _________________

---

🎉 **Congratulations!** Your CECBS system is now running on a true consortium blockchain architecture with PostgreSQL + Hyperledger Fabric + CouchDB!
