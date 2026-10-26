# CECBS Startup Scripts Overview

Quick visual guide to all startup and management scripts.

---

## 🎯 Script Selection Guide

```
┌─────────────────────────────────────────────────────────────┐
│           What do you want to do?                           │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    ┌─────────┐      ┌──────────┐      ┌──────────┐
    │  START  │      │   STOP   │      │  STATUS  │
    └────┬────┘      └─────┬────┘      └─────┬────┘
         │                 │                  │
         │                 │                  │
    ┌────┴─────────────────┴──────────────────┴────┐
    │                                               │
    ▼                                               ▼
┌─────────┐                                   ┌─────────┐
│ Simple  │                                   │  Check  │
│  User?  │                                   │ Status? │
└────┬────┘                                   └────┬────┘
     │                                             │
     ├─ Yes → Double-click START-SYSTEM.bat       │
     │                                             └──→ status.ps1
     └─ No ──┐
             │
             ▼
      ┌──────────────┐
      │  Developer?  │
      └──────┬───────┘
             │
             ├─ Yes, want hot-reload → dev-mode.ps1
             │
             ├─ Yes, manual control  → start-all.ps1 -SkipBuild
             │
             └─ Production testing   → start-all.ps1
```

---

## 📜 All Scripts At a Glance

### 🟢 Starting Scripts

| Script | Best For | Speed | Auto-Build | Hot-Reload |
|--------|----------|-------|------------|------------|
| `START-SYSTEM.bat` | Non-technical users | ⚡⚡ Fast | ❌ No | ❌ No |
| `start-all.ps1` | Full initialization | 🐌 Slow | ✅ Yes | ❌ No |
| `start-all.ps1 -SkipBuild` | Daily development | ⚡⚡ Fast | ❌ No | ❌ No |
| `dev-mode.ps1` | Active development | ⚡⚡⚡ Fastest | ❌ No | ✅ Yes |

---

### 🔴 Stopping Scripts

| Script | Keeps Data? | Use When |
|--------|-------------|----------|
| `STOP-SYSTEM.bat` | ✅ Yes | Quick stop for non-technical users |
| `stop-all.ps1 -KeepData` | ✅ Yes | Daily development (recommended) |
| `stop-all.ps1` | ❌ No | Want clean slate / testing |

---

### 🔄 Management Scripts

| Script | Purpose | Options |
|--------|---------|---------|
| `restart-all.ps1` | Stop + Start | `-KeepData`, `-SkipBuild`, `-DevMode` |
| `status.ps1` | Check system health | None - just run it |

---

## 🎭 Detailed Script Comparison

### START-SYSTEM.bat
```
Double-click to start
├─ For: Non-technical users, demos
├─ Speed: ~60 seconds
├─ What it does:
│  └─ Runs start-all.ps1 -SkipBuild
└─ Best for: Quick start without terminal
```

### start-all.ps1 (Full)
```
.\start-all.ps1
├─ For: First-time setup, major updates
├─ Speed: ~5-10 minutes
├─ What it does:
│  ├─ Check prerequisites
│  ├─ Install npm dependencies
│  ├─ Build Go chaincode
│  ├─ Build TypeScript
│  ├─ Start Docker containers
│  ├─ Start API (production)
│  ├─ Start UI (production)
│  └─ Test connections
└─ Best for: Fresh installations, rebuilds
```

### start-all.ps1 -SkipBuild
```
.\start-all.ps1 -SkipBuild
├─ For: Daily development
├─ Speed: ~60 seconds
├─ What it does:
│  ├─ Skip building chaincode
│  ├─ Skip npm install
│  ├─ Skip TypeScript build
│  ├─ Start Docker containers
│  ├─ Start API (production)
│  ├─ Start UI (production)
│  └─ Test connections
└─ Best for: Daily usage, no code changes
```

### dev-mode.ps1
```
.\dev-mode.ps1
├─ For: Active development
├─ Speed: ~90 seconds
├─ What it does:
│  ├─ Start Docker containers
│  ├─ Open Windows Terminal with 4 tabs:
│  │  ├─ Tab 1: API dev server (hot-reload)
│  │  ├─ Tab 2: UI dev server (hot-reload)
│  │  ├─ Tab 3: Docker logs viewer
│  │  └─ Tab 4: System monitor
│  └─ All changes auto-reload
└─ Best for: Coding with instant feedback
```

### stop-all.ps1
```
.\stop-all.ps1 [-KeepData]
├─ What it stops:
│  ├─ Node.js processes (API & UI)
│  ├─ PowerShell background jobs
│  └─ Docker containers
├─ With -KeepData:
│  └─ Keeps database volumes
└─ Without -KeepData:
   └─ Deletes all data (clean slate)
```

### status.ps1
```
.\status.ps1
├─ Shows:
│  ├─ Service status (running/stopped)
│  ├─ Docker containers
│  ├─ Node.js processes
│  ├─ Background jobs
│  └─ Overall health status
└─ Use: Anytime to check system state
```

---

## 🎯 Common Scenarios

### Scenario 1: First Day on Project
```powershell
# Full setup
.\start-all.ps1

# Wait 5-10 minutes
# Open http://localhost:3000
```

### Scenario 2: Start of Work Day
```powershell
# Quick start
.\start-all.ps1 -SkipBuild

# Wait 60 seconds
# Open http://localhost:3000
```

### Scenario 3: Coding Session
```powershell
# Development mode
.\dev-mode.ps1

# Edit code in IDE
# Changes appear instantly in browser
```

### Scenario 4: End of Work Day
```powershell
# Stop but keep data
.\stop-all.ps1 -KeepData
```

### Scenario 5: Something's Wrong
```powershell
# Check what's running
.\status.ps1

# Clean restart
.\stop-all.ps1
.\start-all.ps1 -SkipBuild
```

### Scenario 6: Updated Chaincode
```powershell
# Rebuild chaincode
cd chaincodes\coffee
go build -o chaincode.exe

# Restart just chaincode
docker restart coffee-chaincode

# Or full restart
cd ..\..
.\restart-all.ps1 -KeepData -SkipBuild
```

### Scenario 7: Updated API Code
```powershell
# Option 1: Hot-reload (dev mode)
cd api
npm run dev
# Changes auto-reload

# Option 2: Production rebuild
cd api
npm run build
npm start
```

### Scenario 8: Demo to Stakeholders
```powershell
# Use simple batch file
# Double-click: START-SYSTEM.bat

# Show: http://localhost:3000

# After demo: STOP-SYSTEM.bat
```

### Scenario 9: Testing Changes
```powershell
# Start system
.\start-all.ps1 -SkipBuild

# Run tests
cd api
npm test

# Check status
cd ..
.\status.ps1
```

### Scenario 10: Clean Slate
```powershell
# Remove all data
.\stop-all.ps1

# Full rebuild
.\start-all.ps1
```

---

## 🔍 Script Options Reference

### start-all.ps1 Options

```powershell
# No options - full build and start
.\start-all.ps1

# Skip building (faster)
.\start-all.ps1 -SkipBuild

# Development mode with hot-reload
.\start-all.ps1 -DevMode

# Skip connection tests
.\start-all.ps1 -SkipTests

# Combine options
.\start-all.ps1 -SkipBuild -SkipTests
```

### stop-all.ps1 Options

```powershell
# Stop and remove volumes (clean slate)
.\stop-all.ps1

# Stop but keep data (recommended)
.\stop-all.ps1 -KeepData
```

### restart-all.ps1 Options

```powershell
# Full restart (removes data)
.\restart-all.ps1

# Quick restart (keeps data)
.\restart-all.ps1 -KeepData -SkipBuild

# Development mode restart
.\restart-all.ps1 -DevMode -KeepData
```

---

## ⏱️ Timing Reference

### Startup Times

| Scenario | Time | Notes |
|----------|------|-------|
| First-time full setup | 5-10 min | Downloads Docker images, installs deps |
| Daily start with -SkipBuild | 60-90 sec | Infrastructure only |
| Development mode | 90 sec | + time to open terminals |
| Restart with -KeepData | 60 sec | Faster, keeps database |
| Restart without data | 2-3 min | Rebuilds database |

### Component Startup Order

```
Time    Component                Status
0s      ├─ Checking prerequisites... ✓
5s      ├─ Building chaincode...     ✓
15s     ├─ Installing dependencies... ✓
30s     ├─ Building TypeScript...    ✓
35s     ├─ Starting Docker...
40s     │  ├─ Orderer              ✓
45s     │  ├─ Peers                ✓
50s     │  ├─ CouchDB              ✓
50s     │  ├─ PostgreSQL           ✓
50s     │  ├─ Redis                ✓
55s     │  └─ Chaincode            ✓
60s     ├─ Starting API...           ✓
70s     ├─ Starting UI...            ✓
75s     └─ Testing connections...    ✓
```

---

## 🎨 Visual Script Flow

### start-all.ps1 Flow

```
START
  │
  ├─ Check Docker running? ──NO──> ERROR & EXIT
  │                         YES
  ├─ Check Node.js? ─────────NO──> ERROR & EXIT
  │                         YES
  ├─ Check Go? ──────────────NO──> WARNING (skip chaincode)
  │                         YES
  ├─ SkipBuild flag? ───────YES──> Skip to Docker
  │                         NO
  ├─ Build Chaincode
  ├─ Install npm deps
  ├─ Build TypeScript
  │
  ├─ Start Docker Compose
  │   ├─ Orderer
  │   ├─ Peers × 6
  │   ├─ CouchDB × 6
  │   ├─ PostgreSQL
  │   ├─ Redis
  │   ├─ Kafka
  │   └─ Chaincode
  │
  ├─ DevMode flag? ─────────YES──> Prompt user choice
  │                         NO
  ├─ Start API (background)
  ├─ Start UI (background)
  │
  ├─ SkipTests flag? ───────YES──> Skip tests
  │                         NO
  ├─ Test connections
  │
  └─ Show Summary ──> DONE
```

### dev-mode.ps1 Flow

```
START
  │
  ├─ Windows Terminal installed? ──NO──> Fallback instructions
  │                                YES
  ├─ Start infrastructure (background)
  │   └─ Wait for readiness
  │
  ├─ Open Windows Terminal with tabs:
  │   ├─ Tab 1: cd api && npm run dev
  │   ├─ Tab 2: cd ui && npm run dev
  │   ├─ Tab 3: docker logs -f
  │   └─ Tab 4: status monitor
  │
  └─ Show success message ──> DONE
```

---

## 💡 Pro Tips

### Speed Optimization

1. **Use -SkipBuild for daily work:**
   ```powershell
   .\start-all.ps1 -SkipBuild  # 60s instead of 5 min
   ```

2. **Keep data when stopping:**
   ```powershell
   .\stop-all.ps1 -KeepData  # Faster next start
   ```

3. **Use dev-mode for coding:**
   ```powershell
   .\dev-mode.ps1  # Instant feedback on changes
   ```

### Resource Management

1. **Close Docker when not using:**
   - Saves RAM and CPU
   - Stop system first: `.\stop-all.ps1 -KeepData`

2. **Monitor resources:**
   ```powershell
   docker stats  # Watch resource usage
   ```

3. **Clean up periodically:**
   ```powershell
   docker system prune -a --volumes  # Free disk space
   ```

### Troubleshooting

1. **Always check status first:**
   ```powershell
   .\status.ps1
   ```

2. **View logs for errors:**
   ```powershell
   docker-compose -f docker-compose-fabric.yml logs -f
   ```

3. **Clean restart if stuck:**
   ```powershell
   .\stop-all.ps1
   docker system prune -f
   .\start-all.ps1
   ```

---

## 📖 Related Documentation

- **[STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)** - Complete startup & troubleshooting
- **[Docs/QUICK-START.md](Docs/QUICK-START.md)** - Quick reference guide
- **[README.md](README.md)** - Project overview
- **[COMPLETE-WORKFLOW-SEQUENCE.md](COMPLETE-WORKFLOW-SEQUENCE.md)** - Testing workflows

---

## 🎯 Quick Decision Tree

```
Need to start system?
├─ First time? ────────────> start-all.ps1
├─ Daily work? ────────────> start-all.ps1 -SkipBuild
├─ Active coding? ─────────> dev-mode.ps1
└─ Demo/non-technical? ────> START-SYSTEM.bat

Need to stop?
├─ Keep data? ─────────────> stop-all.ps1 -KeepData
└─ Clean slate? ───────────> stop-all.ps1

Something wrong?
├─ Check status ───────────> status.ps1
├─ View logs ──────────────> docker logs <container>
└─ Full restart ───────────> restart-all.ps1 -KeepData
```

---

<div align="center">

**Choose the right tool for the job** 🛠️

[Main README](README.md) • [Startup Guide](Docs/STARTUP-GUIDE.md) • [Quick Start](Docs/QUICK-START.md)

</div>
