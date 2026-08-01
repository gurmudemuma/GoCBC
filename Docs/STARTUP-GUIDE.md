# CECBS System Startup Guide

Complete guide for starting, stopping, and managing the Coffee Export Consortium Blockchain System (CECBS).

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [First Time Setup](#first-time-setup)
- [Daily Usage](#daily-usage)
- [Development Mode](#development-mode)
- [Troubleshooting](#troubleshooting)
- [System Architecture](#system-architecture)

---

## 🚀 Quick Start

### First Time Setup

```powershell
# 1. Install prerequisites (Docker Desktop, Node.js 18+, Go 1.20+)
# 2. Clone the repository
# 3. Run the startup script
.\start-all.ps1
```

That's it! The script will:
- ✅ Check all prerequisites
- ✅ Install dependencies (npm packages)
- ✅ Build chaincode and TypeScript
- ✅ Start Hyperledger Fabric network
- ✅ Start PostgreSQL, Redis, Kafka
- ✅ Deploy coffee chaincode
- ✅ Start backend API
- ✅ Start frontend UI

### Daily Usage

```powershell
# Start the system
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Stop the system
.\stop-all.ps1

# Restart
.\restart-all.ps1 -KeepData -SkipBuild
```

---

## 📜 Available Scripts

### 🟢 `start-all.ps1` - Start Everything

Starts all CECBS components in the correct order.

**Basic Usage:**
```powershell
.\start-all.ps1
```

**Options:**
```powershell
# Skip building (faster, use when nothing changed)
.\start-all.ps1 -SkipBuild

# Development mode with hot-reload
.\start-all.ps1 -DevMode

# Skip connection tests
.\start-all.ps1 -SkipTests

# Combine options
.\start-all.ps1 -SkipBuild -SkipTests
```

**What It Does:**
1. ✅ Checks prerequisites (Docker, Node.js, Go)
2. ✅ Builds Go chaincode
3. ✅ Installs npm dependencies (api + ui)
4. ✅ Builds TypeScript to JavaScript
5. ✅ Starts Docker containers (Fabric network, databases)
6. ✅ Waits for services to be ready
7. ✅ Starts API server (port 3001)
8. ✅ Starts UI server (port 3000)
9. ✅ Tests connections
10. ✅ Shows summary with credentials

---

### 🔴 `stop-all.ps1` - Stop Everything

Stops all CECBS components.

**Basic Usage:**
```powershell
.\stop-all.ps1
```

**Options:**
```powershell
# Keep data volumes (don't delete database data)
.\stop-all.ps1 -KeepData
```

**What It Does:**
1. ✅ Stops Node.js processes (API & UI)
2. ✅ Stops PowerShell background jobs
3. ✅ Stops Docker containers
4. ✅ Optionally removes volumes

---

### 🔄 `restart-all.ps1` - Restart Everything

Convenience script that stops and then starts the system.

**Basic Usage:**
```powershell
.\restart-all.ps1
```

**Options:**
```powershell
# Quick restart (keep data, skip build)
.\restart-all.ps1 -KeepData -SkipBuild

# Development mode restart
.\restart-all.ps1 -DevMode -KeepData
```

---

### 📊 `status.ps1` - Check System Status

Displays current status of all components.

**Usage:**
```powershell
.\status.ps1
```

**Shows:**
- ✅ Service status (UI, API, databases, blockchain)
- ✅ Docker containers
- ✅ Node.js processes
- ✅ Background jobs
- ✅ Overall system health

---

## 🎯 First Time Setup

### Prerequisites

1. **Docker Desktop** (required)
   - Download: https://www.docker.com/products/docker-desktop
   - Must be running before starting CECBS

2. **Node.js 18+** (required)
   - Download: https://nodejs.org/
   - Check version: `node --version`

3. **Go 1.20+** (required for chaincode)
   - Download: https://go.dev/dl/
   - Check version: `go version`

4. **Git** (optional, for version control)
   - Download: https://git-scm.com/

### Initial Setup Steps

```powershell
# 1. Open PowerShell as Administrator
# Navigate to project directory
cd c:\goCBC

# 2. Start the system for the first time
.\start-all.ps1

# This will take 5-10 minutes on first run because it:
# - Downloads Docker images
# - Installs npm packages
# - Builds chaincode
# - Generates crypto material
# - Creates blockchain channel
# - Deploys chaincode
```

### Verify Installation

After startup completes:

1. **Check Status:**
   ```powershell
   .\status.ps1
   ```

2. **Open Browser:**
   - UI: http://localhost:3000
   - API Docs: http://localhost:3001/api-docs

3. **Test Login:**
   - Username: `ecta_admin`
   - Password: `password123`

---

## 💻 Daily Usage

### Starting Your Workday

```powershell
# Quick start (assumes you've built everything before)
.\start-all.ps1 -SkipBuild

# Wait 30-60 seconds for all services to be ready
# Check status
.\status.ps1

# Open browser to http://localhost:3000
```

### During Development

**Option 1: Production Mode (Background)**
```powershell
# Start everything in background
.\start-all.ps1 -SkipBuild

# View API logs
docker-compose -f docker-compose-fabric.yml logs -f

# Or check specific container
docker logs coffee-chaincode --tail 50 -f
```

**Option 2: Development Mode (Hot-Reload)**
```powershell
# Terminal 1: Start blockchain and databases
.\start-all.ps1 -SkipBuild

# Then manually stop API/UI and run in dev mode:

# Terminal 2: API with hot-reload
cd api
npm run dev

# Terminal 3: UI with hot-reload
cd ui
npm run dev
```

### Making Changes

**If you changed chaincode (Go):**
```powershell
# Rebuild and redeploy
cd chaincodes\coffee
go build -o chaincode.exe
docker restart coffee-chaincode

# Or full restart
.\restart-all.ps1
```

**If you changed API (TypeScript):**
```powershell
# Development mode (auto-reloads)
cd api
npm run dev

# Or rebuild for production
cd api
npm run build
npm start
```

**If you changed UI (React/Next.js):**
```powershell
# Development mode (auto-reloads)
cd ui
npm run dev

# Or rebuild for production
cd ui
npm run build
npm start
```

### Ending Your Workday

```powershell
# Keep data for tomorrow
.\stop-all.ps1 -KeepData

# Or clean slate (removes all data)
.\stop-all.ps1
```

---

## 🛠️ Development Mode

### What is Development Mode?

Development mode enables hot-reloading, so your changes are reflected immediately without restarting.

### Using Development Mode

**Method 1: Start All in Dev Mode**
```powershell
.\start-all.ps1 -DevMode

# You'll be prompted to choose:
# 1) API only (with hot-reload)
# 2) UI only (with hot-reload)
# 3) Both (manual - recommended)
```

**Method 2: Manual (Recommended)**
```powershell
# Terminal 1: Start blockchain infrastructure
.\start-all.ps1 -SkipBuild

# Then press Ctrl+C when API/UI start to stop just those

# Terminal 2: API dev server
cd api
npm run dev
# API runs on http://localhost:3001 with hot-reload

# Terminal 3: UI dev server
cd ui
npm run dev
# UI runs on http://localhost:3000 with hot-reload
```

### Benefits of Dev Mode

- ✅ **Instant feedback** - See changes immediately
- ✅ **Better debugging** - Source maps and detailed errors
- ✅ **Faster iteration** - No need to rebuild
- ✅ **TypeScript checking** - Real-time type errors

### When to Use Production Mode

Use production mode (`.\start-all.ps1` without `-DevMode`) when:
- Testing production builds
- Performance testing
- Demo to stakeholders
- Running automated tests

---

## 🔧 Troubleshooting

### System Won't Start

**Issue: Docker daemon not running**
```
Error: Cannot connect to Docker daemon
```

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (green icon in system tray)
3. Try again: `.\start-all.ps1`

---

**Issue: Port already in use**
```
Error: Port 3000 is already in use
```

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <process_id> /F

# Or stop everything first
.\stop-all.ps1
```

---

**Issue: Chaincode build fails**
```
Error: chaincode build failed
```

**Solution:**
```powershell
# Check Go installation
go version

# Clean and rebuild
cd chaincodes\coffee
go clean
go mod tidy
go build -o chaincode.exe
```

---

**Issue: npm install fails**
```
Error: Failed to install dependencies
```

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
cd api
Remove-Item -Recurse -Force node_modules
npm install

cd ..\ui
Remove-Item -Recurse -Force node_modules
npm install
```

---

### System is Slow or Unresponsive

**Check Resource Usage:**
```powershell
# Check Docker containers
docker stats

# Check Node processes
Get-Process node | Select-Object Id, CPU, WorkingSet, ProcessName
```

**Solutions:**

1. **Increase Docker Resources:**
   - Docker Desktop → Settings → Resources
   - Increase CPU and Memory limits

2. **Restart Everything:**
   ```powershell
   .\restart-all.ps1 -KeepData
   ```

3. **Clean Restart (removes all data):**
   ```powershell
   .\stop-all.ps1
   docker system prune -a --volumes -f
   .\start-all.ps1
   ```

---

### Database Issues

**Issue: Database not responding**

**Solution:**
```powershell
# Check if PostgreSQL is running
.\status.ps1

# Restart just the database
docker restart cecbs-postgres

# Or reset database (WARNING: deletes data)
.\stop-all.ps1
docker volume rm gocbc_postgres-data
.\start-all.ps1
```

---

### Blockchain Network Issues

**Issue: Chaincode not responding**

**Solution:**
```powershell
# Check chaincode logs
docker logs coffee-chaincode --tail 100

# Restart chaincode
docker restart coffee-chaincode

# Check peer logs
docker logs peer0.ecta.cecbs.et --tail 100

# Full network restart
docker-compose -f docker-compose-fabric.yml restart
```

---

**Issue: Channel not found**

**Solution:**
```powershell
# Stop everything
.\stop-all.ps1

# Clean blockchain artifacts
Remove-Item -Recurse -Force blockchain\organizations
Remove-Item -Recurse -Force blockchain\channel-artifacts

# Restart (will regenerate everything)
.\start-all.ps1
```

---

### API/UI Issues

**Issue: API returns 404 or 500 errors**

**Solution:**
```powershell
# Check API logs
cd api
npm run dev
# Watch console for errors

# Check .env configuration
code api\.env
# Ensure all variables are set correctly
```

---

**Issue: UI won't load**

**Solution:**
```powershell
# Check if API is running
.\status.ps1

# Check UI logs
cd ui
npm run dev
# Watch console for errors

# Clear Next.js cache
cd ui
Remove-Item -Recurse -Force .next
npm run build
npm run dev
```

---

### Getting Help

If issues persist:

1. **Check Full Status:**
   ```powershell
   .\status.ps1
   docker-compose -f docker-compose-fabric.yml logs --tail 100
   ```

2. **Collect Logs:**
   ```powershell
   # Save all logs
   docker-compose -f docker-compose-fabric.yml logs > logs.txt
   ```

3. **Check System Status Script:**
   ```powershell
   .\scripts\check-system-status.ps1
   ```

4. **View Documentation:**
   - `Docs\QUICK-START.md`
   - `Docs\CONSORTIUM-BLOCKCHAIN-VALUE-PROPOSITION.md`

---

## 🏗️ System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CECBS System                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │  Frontend UI │ ◄────── │  Backend API │                │
│  │  (Next.js)   │         │  (Node.js)   │                │
│  │  Port 3000   │         │  Port 3001   │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                         │
│         ┌─────────────────────────┼────────────────┐       │
│         │                         │                 │       │
│         ▼                         ▼                 ▼       │
│  ┌─────────────┐        ┌──────────────┐   ┌────────────┐ │
│  │ PostgreSQL  │        │ Fabric       │   │   Redis    │ │
│  │ (Database)  │        │ Network      │   │  (Cache)   │ │
│  │ Port 5432   │        │              │   │ Port 6379  │ │
│  └─────────────┘        └──────┬───────┘   └────────────┘ │
│                                 │                           │
│                   ┌─────────────┼─────────────┐            │
│                   │             │             │            │
│                   ▼             ▼             ▼            │
│           ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│           │ Orderer  │  │  Peers   │  │ CouchDB  │       │
│           │ (7050)   │  │ (7051+)  │  │ (5984+)  │       │
│           └──────────┘  └────┬─────┘  └──────────┘       │
│                              │                            │
│                              ▼                            │
│                     ┌──────────────────┐                 │
│                     │ Coffee Chaincode │                 │
│                     │   (Port 9999)    │                 │
│                     └──────────────────┘                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Ports Reference

| Service | Port | Purpose |
|---------|------|---------|
| Frontend UI | 3000 | Web interface |
| Backend API | 3001 | REST API |
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Caching & sessions |
| Orderer | 7050 | Blockchain ordering |
| Peer ECTA | 7051 | Main peer node |
| Peer ECX | 8051 | ECX peer node |
| Peer Banks | 9051 | Banks peer node |
| Peer NBE | 10051 | NBE peer node |
| Peer Customs | 11051 | Customs peer node |
| Peer Shipping | 12051 | Shipping peer node |
| Coffee Chaincode | 9999 | Smart contract service |
| CouchDB ECTA | 5984 | State database |
| CouchDB ECX | 6984 | State database |
| Kafka | 9092 | Event streaming |
| Zookeeper | 2181 | Kafka coordination |

### Startup Sequence

1. **Docker Infrastructure** (30-40s)
   - Orderer
   - Peers (ECTA, ECX, Banks, NBE, Customs, Shipping)
   - CouchDB instances
   - PostgreSQL
   - Redis
   - Kafka & Zookeeper

2. **Chaincode Deployment** (10-20s)
   - Coffee chaincode container
   - Chaincode installation on all peers
   - Initialization

3. **Backend API** (5-10s)
   - Database migrations
   - Redis connection
   - Fabric SDK initialization
   - Express server start

4. **Frontend UI** (5-10s)
   - Next.js build (if needed)
   - Static file serving
   - Server-side rendering ready

**Total Startup Time:**
- First time: 5-10 minutes (includes downloads)
- With `-SkipBuild`: 1-2 minutes
- Restart with data: 30-60 seconds

---

## 📚 Additional Resources

### Documentation Files

- `Docs/QUICK-START.md` - Quick start guide
- `COMPLETE-WORKFLOW-SEQUENCE.md` - End-to-end workflow
- `WORKFLOW-VERIFICATION.md` - Testing workflows
- `IMPLEMENTATION-ROADMAP.md` - Feature roadmap
- `EMAIL-NOTIFICATIONS-SETUP.md` - Email configuration

### Default Credentials

| Role | Username | Password |
|------|----------|----------|
| ECTA Admin | ecta_admin | password123 |
| NBE Officer | nbe_admin | password123 |
| Bank Officer | bank_admin | password123 |
| Customs Officer | customs_admin | password123 |
| Exporter | EXP1087072 | password123 |

### Useful Commands

```powershell
# View all Docker containers
docker ps -a

# View logs for specific container
docker logs <container_name> --tail 100 -f

# View chaincode logs
docker logs coffee-chaincode -f

# Execute commands in container
docker exec -it peer0.ecta.cecbs.et bash

# View database
docker exec -it cecbs-postgres psql -U cecbs -d cecbs

# View Redis data
docker exec -it cecbs-redis redis-cli -a redis123

# Restart specific service
docker restart coffee-chaincode

# Clean everything (WARNING: deletes all data)
docker-compose -f docker-compose-fabric.yml down -v
docker system prune -a --volumes -f
```

---

## ✅ Best Practices

### Daily Development

1. **Start with quick mode:**
   ```powershell
   .\start-all.ps1 -SkipBuild
   ```

2. **Use dev mode for coding:**
   ```powershell
   cd api && npm run dev  # Terminal 1
   cd ui && npm run dev   # Terminal 2
   ```

3. **Keep data when stopping:**
   ```powershell
   .\stop-all.ps1 -KeepData
   ```

### Before Committing Code

1. **Build everything:**
   ```powershell
   .\start-all.ps1  # Full build
   ```

2. **Run tests:**
   ```powershell
   cd api && npm test
   cd ui && npm test
   ```

3. **Check for errors:**
   ```powershell
   .\status.ps1
   ```

### Production Deployment

See `nginx-configs/deploy-cecbs-nginx.sh` for production deployment guide.

---

## 🎉 Success!

You now have everything you need to start, stop, and manage the CECBS system!

**Quick Reference:**
- Start: `.\start-all.ps1 -SkipBuild`
- Status: `.\status.ps1`
- Stop: `.\stop-all.ps1 -KeepData`
- Restart: `.\restart-all.ps1 -KeepData -SkipBuild`

**Need Help?**
- Check logs: `docker-compose -f docker-compose-fabric.yml logs -f`
- View status: `.\status.ps1`
- Read docs: `Docs\QUICK-START.md`

Happy coding! 🚀
