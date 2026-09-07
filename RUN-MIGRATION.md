# 🚀 Run Migration Now - Step by Step Commands

Copy and paste these commands into your terminal (PowerShell or CMD).

## Step 1: Install Script Dependencies

```powershell
cd C:\goCBC\scripts
npm install
```

**Wait for:** `added 2 packages`

---

## Step 2: Test Database Connection (Optional)

```powershell
node -e "require('./db-helper').testConnection().then(r => console.log(JSON.stringify(r, null, 2)))"
```

**Expected:** `{ "success": true, ... }`

If this fails, start PostgreSQL first:
```powershell
cd C:\goCBC
docker-compose up -d postgres
```

---

## Step 3: Run Database Migrations

```powershell
cd C:\goCBC\scripts
node migrate-db-pg.js
```

**Expected:** `✅ All migrations processed successfully!`

---

## Step 4: Create Admin User

```powershell
node add-admin-user-pg.js
```

**Expected:**
```
✅ Admin user created successfully!
Username: admin
Password: admin123
```

---

## Step 5: Verify Admin User

```powershell
node check-admin-role-pg.js
```

**Expected:** `✅ Admin user found!`

---

## Step 6: Start the Complete System

```powershell
# Terminal 1 - Start PostgreSQL
cd C:\goCBC
docker-compose up -d postgres

# Terminal 1 - Start Fabric Blockchain
docker-compose -f docker-compose-fabric.yml up -d

# Terminal 2 - Start API
cd C:\goCBC\api
npm start

# Terminal 3 - Start UI
cd C:\goCBC\ui
npm run dev
```

---

## Step 7: Login and Test

1. Open browser: **http://localhost:3000**
2. Login with:
   - Username: **admin**
   - Password: **admin123**
3. Verify you can see the dashboard

---

## Step 8: Clean Up SQLite (After Testing)

**Only run this AFTER you've verified everything works!**

```powershell
cd C:\goCBC
powershell scripts\cleanup-sqlite.ps1
```

This will delete all SQLite files and old scripts.

---

## Troubleshooting

### PostgreSQL not running?
```powershell
docker-compose up -d postgres
docker ps | findstr postgres
```

### Can't connect to database?
Check `.env` file has:
```
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
```

### Fabric not running?
```powershell
docker-compose -f docker-compose-fabric.yml up -d
docker ps | findstr peer
```

---

## Quick Verification Commands

```powershell
# Check if no SQLite files exist
Get-ChildItem -Path C:\goCBC -Recurse -Include "*.db" -Exclude "node_modules" | Select-Object FullName

# Check PostgreSQL running
docker ps | findstr postgres

# Check Fabric running
docker ps | findstr peer

# Check CouchDB running
docker ps | findstr couchdb
```

---

## 🎉 Success Criteria

- ✅ `npm install` completes in scripts folder
- ✅ Migrations run successfully
- ✅ Admin user created
- ✅ API starts without errors
- ✅ UI loads in browser
- ✅ Can login with admin credentials
- ✅ Dashboard displays correctly

**You're done!** Your system is now using PostgreSQL + Hyperledger Fabric + CouchDB with no SQLite.
