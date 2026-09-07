# ✅ Automatic Database Migration Enabled

## What Changed?

Both startup scripts now **automatically run database migrations** when you start the system:

- **`start-all.sh`** (Linux/Mac/Git Bash)
- **`start-all.ps1`** (Windows PowerShell)

## How It Works

When you run `./start-all.sh` or `.\start-all.ps1`, the system will:

1. ✅ **Check if PostgreSQL is running**
2. ✅ **Install script dependencies** (if needed)
3. ✅ **Run all migrations** from `api/src/migrations/*.sql`
4. ✅ **Check if admin user exists**
5. ✅ **Create admin user** if missing (admin/admin123)
6. ✅ **Continue startup** even if migrations fail (with warning)

## What This Means For You

### First Time Setup
```bash
# Just run the start script - migrations happen automatically!
./start-all.sh
```

No need to manually run:
- ❌ ~~`cd scripts && npm install`~~
- ❌ ~~`node migrate-db-pg.js`~~
- ❌ ~~`node add-admin-user-pg.js`~~

**It's all automatic now!** 🎉

### Existing Installations

If you already have migrations run, the script will:
- ⏭️ Skip already-applied migrations
- ✅ Confirm admin user exists
- ✅ Continue normally

**No duplicate migrations or errors!**

## Manual Migration (If Needed)

You can still run migrations manually:

```bash
# Manual migration
cd scripts
npm install
node migrate-db-pg.js

# Manual admin user creation
node add-admin-user-pg.js

# Check admin
node check-admin-role-pg.js
```

## Startup Flow

```
1. Check Prerequisites ✅
2. Build Chaincode ✅
3. Install Dependencies ✅
4. Build TypeScript ✅
5. Start Fabric Network ✅
6. Run Database Migrations ✅  ← NEW!
7. Deploy Chaincode ✅
8. Start API ✅
9. Start UI ✅
```

## Error Handling

If migrations fail:
- ⚠️ System shows warning
- ⚠️ Logs saved to `/tmp/cecbs-migration.log` (Linux) or `%TEMP%\cecbs-migration.log` (Windows)
- ✅ System continues startup
- 💡 Manual fix instructions shown

## Logs

Migration logs are saved to:
- **Linux/Mac**: `/tmp/cecbs-migration.log`
- **Windows**: `C:\Users\<you>\AppData\Local\Temp\cecbs-migration.log`

View logs:
```bash
# Linux/Mac
tail -f /tmp/cecbs-migration.log

# Windows PowerShell
Get-Content $env:TEMP\cecbs-migration.log -Tail 50
```

## Benefits

✅ **One Command Startup** - No manual migration steps  
✅ **Idempotent** - Safe to run multiple times  
✅ **Auto Admin Creation** - First run creates admin user  
✅ **Fail-Safe** - System continues even if migrations fail  
✅ **Logged** - All migration output saved for debugging  

## Testing

Test the automatic migration:

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run start script
./start-all.sh

# 3. Look for this section in output:
# ═══════════════════════════════════════════
#   Running Database Migrations
# ═══════════════════════════════════════════
# ✓ PostgreSQL is ready
# ▶ Running database migrations...
# ✓ Database migrations completed successfully
# ▶ Checking for admin user...
# ✓ Admin user exists
```

## Rollback

To disable automatic migrations, comment out this line in the start scripts:

```bash
# In start-all.sh or start-all.ps1
# run_database_migrations  # Comment this to disable
```

---

## Summary

You no longer need to remember migration commands!

**Old way:**
```bash
cd scripts
npm install
node migrate-db-pg.js
node add-admin-user-pg.js
cd ..
./start-all.sh
```

**New way:**
```bash
./start-all.sh  # That's it! 🎉
```

**PostgreSQL + Hyperledger Fabric + CouchDB** - All configured automatically!
