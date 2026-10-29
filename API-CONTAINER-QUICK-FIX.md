# API Container Not Starting - Quick Fix

## Problem
```
✗ API Server (Docker) failed to respond at http://localhost:3001/health after 60s
```

## Immediate Solutions (Pick One)

### 1️⃣ Run Diagnostic Tool (EASIEST)
```bash
./fix-api-container.sh
```
Follow the prompts to restart or recreate the container.

### 2️⃣ Check Logs & Restart
```bash
# See what's wrong
docker logs cecbs-api --tail 50

# Restart it
docker restart cecbs-api

# Wait and test (npm install takes time)
sleep 30
curl http://localhost:3001/health
```

### 3️⃣ Recreate Container (RECOMMENDED IF RESTART FAILS)
```bash
cd /home/guda/GoCBC

# Remove old container
docker stop cecbs-api && docker rm cecbs-api

# Create fresh one
docker-compose -f docker-compose-fabric.yml up -d cecbs-api

# Wait for npm install to complete
echo "Waiting for npm install..."
sleep 45

# Test
curl http://localhost:3001/health
```

### 4️⃣ Watch It Start (DEBUG MODE)
```bash
# Terminal 1: Watch logs
docker logs cecbs-api -f

# Terminal 2: Restart container
docker restart cecbs-api
```

Look for:
- ✓ `npm install` completing
- ✓ `API server started on port 3001`
- ✗ Any error messages

## Common Issues

### Issue: npm install still running
**Wait longer** - First startup takes 2-3 minutes
```bash
docker logs cecbs-api -f | grep -E "npm|install|started"
```

### Issue: TypeScript errors
**Build on host first**:
```bash
cd /home/guda/GoCBC/api
npm run build
docker restart cecbs-api
```

### Issue: Database connection failed
**Check PostgreSQL**:
```bash
docker ps | grep postgres
docker logs cecbs-postgres --tail 20
```

### Issue: Port conflict
**Already fixed!** Phase 1.5 cleans ports automatically ✅

## If Nothing Works

Let the script use **host-based API** instead:

```bash
# Remove container
docker stop cecbs-api && docker rm cecbs-api

# The script will automatically fall back to host API
./start-all.sh
```

Or manually run API:
```bash
cd /home/guda/GoCBC/api
npm run dev
```

## What Changed in start-all.sh

✅ Extended timeout: 60s → 80s (npm install needs time)
✅ Shows container logs on failure  
✅ Better health checking before restart
✅ Automatic fallback to host-based API
✅ Diagnostic tool reference

## Prevention

Before running `start-all.sh`:

```bash
# Pre-build API
cd /home/guda/GoCBC/api
npm install
npm run build

# Then start everything
cd /home/guda/GoCBC
./start-all.sh
```

## Check Container is Working

```bash
# Status
docker ps | grep cecbs-api

# Logs
docker logs cecbs-api --tail 30

# Health
curl http://localhost:3001/health

# Environment
docker exec cecbs-api env | grep -E "PORT|DATABASE|FABRIC"
```

## Success Looks Like

```
✓ API server is running on http://localhost:3001 (Docker)

$ curl http://localhost:3001/health
{"status":"healthy","timestamp":"2026-10-29T10:30:00.000Z"}
```

---

**Still stuck?** Run `./fix-api-container.sh` for step-by-step help!
