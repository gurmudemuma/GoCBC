# 📢 For Team: How to Start CECBS System

## TL;DR - Just Want to Start the System?

### Windows
Double-click: **`START-SYSTEM.bat`**

### Linux/macOS
```bash
chmod +x *.sh
./start-all.sh --skip-build
```

### If That Fails
```bash
bash start-safe.sh
```

---

## Update from Git

```bash
git pull origin features
```

You'll get:
- ✅ 12 cross-platform startup scripts
- ✅ Fixed portability issues
- ✅ Comprehensive documentation
- ✅ Multiple fallback options

---

## What Changed?

### Problem We Had
The startup script worked on some machines but **failed immediately on others** with no error message.

### What We Fixed
1. ✅ Script now works on **all platforms** (Windows, Linux, macOS)
2. ✅ Better error messages (no more silent failures)
3. ✅ Multiple startup options if one doesn't work
4. ✅ Complete troubleshooting guide

---

## Available Scripts - Choose One

### Option 1: Simple (Recommended)

**Windows:**
- `START-SYSTEM.bat` - Double-click this file

**Linux/macOS:**
```bash
./start-all.sh --skip-build
```

### Option 2: Safe Mode (If Option 1 Fails)

```bash
bash start-safe.sh
```

This checks for common issues first.

### Option 3: Minimal Mode (Works Everywhere)

```bash
sh start-minimal.sh
```

This works on **any** Unix-like system, even with old shells.

### Option 4: PowerShell (Windows)

```powershell
.\start-all.ps1 -SkipBuild
```

---

## First Time Setup

### 1. Install Prerequisites

**All Platforms:**
- Docker Desktop (https://docker.com)
- Node.js v18+ (https://nodejs.org)

**Linux Only:**
```bash
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and back in
```

### 2. Clone & Start

```bash
git clone <repository-url>
cd goCBC
```

**Windows:**
```cmd
START-SYSTEM.bat
```

**Linux/macOS:**
```bash
chmod +x *.sh
./start-all.sh --skip-build
```

### 3. Access System

Wait 1-2 minutes, then open:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs

### 4. Login

| Role | Username | Password |
|------|----------|----------|
| ECTA Admin | `ecta_admin` | `password123` |
| Bank Officer | `bank_admin` | `password123` |
| Exporter | `EXP1087072` | `password123` |

---

## Common Issues & Solutions

### "Script shows nothing and exits"

**Try:**
```bash
bash start-safe.sh
```

### "Permission denied"

**Linux/macOS:**
```bash
chmod +x *.sh
```

### "Port already in use"

**Stop old processes:**
```bash
./stop-all.sh
# Or:
docker-compose -f docker-compose-fabric.yml down -v
```

### "Docker daemon not running"

**Windows/macOS:**
- Start Docker Desktop

**Linux:**
```bash
sudo systemctl start docker
```

### "Works on one machine but not another"

**Line ending issue - fix with:**
```bash
dos2unix start-all.sh
# Or:
sed -i 's/\r$//' start-all.sh
```

Or just use:
```bash
sh start-minimal.sh
```

---

## Diagnostic Tools

### Check System Status
```bash
./status.sh
```

### Test Before Starting
```bash
bash test-startup.sh
```

### See Detailed Logs
```bash
bash start-debug.sh
```

### View Running Containers
```bash
docker ps
```

### View Logs
```bash
# All containers
docker-compose -f docker-compose-fabric.yml logs -f

# Specific container
docker logs cecbs-postgres

# API/UI logs (if started with script)
tail -f /tmp/cecbs-api.log
tail -f /tmp/cecbs-ui.log
```

---

## Development Mode

For development with hot-reload:

### Option 1: Dev Mode Script
```bash
./dev-mode.sh
```

### Option 2: Manual (3 terminals)

**Terminal 1 - Docker:**
```bash
docker-compose -f docker-compose-fabric.yml up
```

**Terminal 2 - API:**
```bash
cd api
npm run dev
```

**Terminal 3 - UI:**
```bash
cd ui
npm run dev
```

---

## Stopping the System

### Quick Stop
```bash
./stop-all.sh
```

### Stop Everything (including data)
```bash
./stop-all.sh --force
```

### Manual Stop
```bash
# Stop containers
docker-compose -f docker-compose-fabric.yml down -v

# Kill Node processes
pkill -9 node
```

---

## Documentation

All documentation is in the `Docs/` folder:

- **START-HERE.md** - Beautiful landing page
- **GETTING-STARTED.md** - Complete beginner guide
- **STARTUP-GUIDE.md** - Comprehensive reference
- **TROUBLESHOOTING.md** - Problem solving
- **STARTUP-OPTIONS.md** - Script selection guide

Quick links:
```bash
cat Docs/GETTING-STARTED.md
cat TROUBLESHOOTING.md
cat STARTUP-OPTIONS.md
```

---

## For System Administrators

### System Requirements
- **RAM:** 8GB minimum, 16GB recommended
- **Disk:** 20GB free space
- **CPU:** 4 cores recommended
- **Docker:** 4GB RAM allocation minimum

### Ports Used
- 3000 - Frontend UI
- 3001 - Backend API
- 5432 - PostgreSQL
- 6379 - Redis
- 7050 - Hyperledger Orderer
- 7051, 8051, 9051, 10051, 11051, 12051 - Hyperledger Peers
- 9999 - Coffee Chaincode
- 5984, 6984, 7984, 8984, 9984, 10984 - CouchDB instances

### Docker Resources

Check Docker resource allocation:
- Docker Desktop → Settings → Resources
- Recommended: 4GB RAM, 2 CPUs minimum

---

## Quick Reference Card

### Start System
```bash
# Windows (double-click)
START-SYSTEM.bat

# Linux/macOS
./start-all.sh --skip-build

# If that fails
bash start-safe.sh

# If still fails
sh start-minimal.sh
```

### Stop System
```bash
./stop-all.sh
```

### Check Status
```bash
./status.sh
# Or:
docker ps
```

### Restart System
```bash
./restart-all.sh
```

### View Logs
```bash
docker-compose -f docker-compose-fabric.yml logs -f
```

### Access Points
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

---

## Getting Help

1. **Check documentation:**
   ```bash
   cat TROUBLESHOOTING.md
   ```

2. **Run diagnostic:**
   ```bash
   bash test-startup.sh
   ```

3. **See detailed execution:**
   ```bash
   bash start-debug.sh
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Full reset (if all else fails):**
   ```bash
   ./stop-all.sh --force
   docker system prune -a --volumes  # CAUTION: removes all data
   ./start-all.sh
   ```

---

## Contact

If you encounter issues not covered in the documentation:
1. Save diagnostic output: `bash test-startup.sh > diagnostic.txt`
2. Save error logs: `bash start-debug.sh > error.txt 2>&1`
3. Share these files with the team

---

**Welcome to CECBS!** 🎉☕🚢⛓️
