# Data Persistence Issue - Users Disappearing After Restart

## Problem
Users created through the admin panel (bank admin, ECTA admin, and their subordinate users) disappear after system restart. Only the default `admin` and `exporter1` users remain.

## Current Database Status
- **Database**: PostgreSQL (cecbs database)
- **Connection**: postgresql://cecbs:cecbs123@localhost:5432/cecbs
- **Current Users**: Only 2 users (admin + exporter1)
- **Issue**: Created users disappear on restart

## Diagnosis Steps

### 1. Run the Diagnosis Script
```bash
cmd /c diagnose-db-persistence.bat
```

This will check:
- PostgreSQL service status
- Data directory location
- Current user count
- Database persistence settings
- Whether PostgreSQL is running in Docker

### 2. Check if PostgreSQL is in Docker
If PostgreSQL is running in a Docker container **without persistent volumes**, all data is lost when the container restarts.

**Solution**: Add persistent volumes to docker-compose.yml:
```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data  # This line is CRITICAL
    environment:
      POSTGRES_DB: cecbs
      POSTGRES_USER: cecbs
      POSTGRES_PASSWORD: cecbs123
    ports:
      - "5432:5432"

volumes:
  postgres-data:  # This defines the persistent volume
```

### 3. Check PostgreSQL Service
If PostgreSQL is installed as a Windows service, verify it's configured correctly:
```powershell
# Check service status
sc query postgresql-x64-16

# Check if it's set to start automatically
sc qc postgresql-x64-16
```

### 4. Verify Database Initialization Scripts
Check if any scripts are recreating/truncating tables on startup:
- Check `api/src/server.ts` for database initialization
- Check startup scripts (start-api.sh, START-SYSTEM.bat)
- Check for any migration scripts running automatically

## Temporary Workaround

Until the root cause is fixed, you can backup users after creation:

```bash
# Backup users
cd api
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://cecbs:cecbs123@localhost:5432/cecbs'});p.query('SELECT * FROM users').then(r=>{require('fs').writeFileSync('users-backup.json',JSON.stringify(r.rows,null,2));console.log('Backed up',r.rows.length,'users');p.end();})"

# Restore users (if they disappear)
cd api
node scripts/restore-users.js
```

## Next Steps

1. Run `cmd /c diagnose-db-persistence.bat` to identify the root cause
2. Share the output to get specific fix recommendations
3. Once identified:
   - If Docker: Add persistent volumes
   - If Windows service: Check data directory permissions
   - If initialization script: Disable or fix it

## Test Data Persistence

After applying the fix, test with:
```bash
cd api
node test-db-persistence.js
# Restart system
node check-db-users.js
# Verify the test user still exists
```

## Files Created for Diagnosis
- `diagnose-db-persistence.bat` - Comprehensive database health check
- `api/check-db-users.js` - Quick user count check
- `api/test-db-persistence.js` - Create test user to verify persistence
- `test-api-users.js` - Test API user endpoints

## Role Dropdown Fix (Completed)
The role dropdown selection issue has been fixed by simplifying the dropdown to a flat list structure (matching the organization dropdown that works correctly).
