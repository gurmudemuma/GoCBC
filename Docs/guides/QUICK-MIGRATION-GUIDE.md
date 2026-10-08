# 🚀 Quick Migration Guide: SQLite → PostgreSQL

## TL;DR - Execute These Commands

```bash
# 1. Install script dependencies
cd scripts
npm install

# 2. Run migrations
node migrate-db-pg.js

# 3. Create admin user
node add-admin-user-pg.js

# 4. Verify everything works
node check-admin-role-pg.js

# 5. Clean up SQLite (AFTER testing!)
powershell cleanup-sqlite.ps1  # Windows
# OR
bash cleanup-sqlite.sh         # Linux/Mac
```

## That's It! 🎉

Your system now uses:
- ✅ **PostgreSQL** for off-chain data
- ✅ **Hyperledger Fabric** for blockchain
- ✅ **CouchDB** for Fabric state database
- ❌ **No SQLite**

## Test Your System

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start Fabric network
docker-compose -f docker-compose-fabric.yml up -d

# Start API
cd api && npm start

# Start UI
cd ui && npm run dev

# Login
# Username: admin
# Password: admin123
```

## Verify Migration Success

Run this command to check everything is clean:

```bash
# Should return nothing (no SQLite files)
find . -name "*.db" -not -path "*/node_modules/*"

# Should return nothing (no SQLite in package.json)
grep -r "sqlite" api/package.json
```

## Need Help?

See the detailed checklist: [MIGRATION-CHECKLIST.md](./MIGRATION-CHECKLIST.md)

Or the full guide: [Docs/SQLITE-TO-POSTGRESQL-MIGRATION.md](./Docs/SQLITE-TO-POSTGRESQL-MIGRATION.md)
