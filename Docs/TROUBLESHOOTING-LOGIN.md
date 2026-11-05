# GoCBC Login Issue Troubleshooting Guide

## Problem
Login endpoint returns 500 Internal Server Error or connection resets.

## Root Cause Analysis

The API is running in a Docker container (`cecbs-api`) and needs to:
1. Connect to PostgreSQL database (`cecbs-postgres`)  
2. Have user records seeded in the database
3. Handle bcrypt password hashing correctly

## Solution Steps

### Step 1: Verify Infrastructure is Running

```bash
# Check all containers are up
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "api|postgres|peer|orderer"

# Should show 24 containers running including:
# - cecbs-api (Up)
# - cecbs-postgres (Up)
# - All 6 peer nodes (Up)
# - Orderer (Up)
```

### Step 2: Seed the Database with Users

```bash
cd /home/guda/GoCBC

# Run the seed script
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < scripts/seed-users.sql

# Verify users exist
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT username, role, organization FROM users;"
```

Expected output should show users like:
- `admin` (ADMIN, SYSTEM)
- `ecta_admin` (ECTA, ECTA)
- `nbe_admin` (NBE, NBE)
- etc.

### Step 3: Test Login via API

```bash
# Test the admin login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq '.'
```

**Expected successful response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "ADMIN",
      ...
    }
  }
}
```

### Step 4: Check API Logs if Login Fails

```bash
# View recent API logs
docker logs cecbs-api --tail 100

# Look for errors related to:
# - Database connection errors
# - bcrypt errors
# - JWT errors
# - Any stack traces
```

## Available Login Credentials

After seeding, these credentials should work:

### System Admin
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** ADMIN
- **Organization:** SYSTEM

### Organization Admins  
All have password: `password123`

- **ECTA Admin:** `ecta_admin`
- **ECX Admin:** `ecx_admin`  
- **NBE Admin:** `nbe_admin`
- **Bank Admin:** `bank_admin`
- **Customs Admin:** `customs_admin`
- **Shipping Admin:** `shipping_admin`

### Test Exporter
- **Username:** `exporter1`
- **Password:** `password123`
- **Exporter ID:** EXP001
- **License:** LIC001

## Common Issues

### Issue 1: "Connection reset by peer"
**Cause:** API container crashed while processing request  
**Solution:**  
1. Check API logs: `docker logs cecbs-api --tail 50`
2. Look for uncaught exceptions
3. Restart API: `docker restart cecbs-api`
4. Wait 10 seconds for it to initialize
5. Try login again

### Issue 2: "ECONNREFUSED"  
**Cause:** PostgreSQL is not running or API can't reach it  
**Solution:**
```bash
# Restart PostgreSQL
docker restart cecbs-postgres

# Wait for it to be ready
sleep 5

# Restart API to reconnect
docker restart cecbs-api
sleep 10
```

### Issue 3: "Invalid credentials"  
**Cause:** Users not seeded or wrong password  
**Solution:** Re-run seed script (Step 2 above)

### Issue 4: Database connection uses wrong host
**Cause:** API .env file has `localhost` instead of container name  
**Solution:** Docker-compose should override this, but verify:
```bash
docker exec cecbs-api printenv DATABASE_URL
# Should show: postgresql://cecbs:cecbs123@cecbs-postgres:5432/cecbs
```

## Quick Fix Script

Run this to fix everything:

```bash
#!/bin/bash
cd /home/guda/GoCBC

echo "1. Seeding users..."
docker exec -i cecbs-postgres psql -U cecbs -d cecbs < scripts/seed-users.sql

echo "2. Restarting API..."
docker restart cecbs-api
sleep 10

echo "3. Testing login..."
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq '.'

echo ""
echo "If you see a token above, login is working!"
```

## Next Steps After Login Works

1. Open UI at http://localhost:3000
2. Login with one of the credentials above  
3. Run E2E test: `bash complete-e2e-test.sh`

