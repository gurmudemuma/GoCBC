# CECBS Startup Scripts - Complete Summary

## 🎉 What Has Been Created

I've created a comprehensive set of startup and management scripts for your CECBS system. Here's everything you now have:

---

## 📜 New Scripts Created

### PowerShell Scripts (.ps1)

1. **`start-all.ps1`** - Main startup script
   - Checks prerequisites
   - Builds chaincode and TypeScript
   - Starts all Docker containers
   - Starts API and UI servers
   - Tests connections
   - Options: `-SkipBuild`, `-DevMode`, `-SkipTests`

2. **`stop-all.ps1`** - Shutdown script
   - Stops Node.js processes
   - Stops Docker containers
   - Option: `-KeepData` to preserve databases

3. **`restart-all.ps1`** - Restart script
   - Combines stop and start
   - Options: `-KeepData`, `-SkipBuild`, `-DevMode`

4. **`status.ps1`** - Status checker
   - Shows all service status
   - Docker containers
   - Node processes
   - Overall system health

5. **`dev-mode.ps1`** - Development environment
   - Opens Windows Terminal with 4 tabs
   - API with hot-reload
   - UI with hot-reload
   - Docker logs viewer
   - System monitor

### Batch Files (.bat)

6. **`START-SYSTEM.bat`** - Double-click to start
   - For non-technical users
   - Runs `start-all.ps1 -SkipBuild`

7. **`STOP-SYSTEM.bat`** - Double-click to stop
   - For non-technical users
   - Runs `stop-all.ps1 -KeepData`

---

## 📚 New Documentation Created

### Essential Guides

1. **`GETTING-STARTED.md`** ⭐ START HERE
   - Complete beginner guide
   - 5-minute quick start
   - Prerequisites and installation
   - Common issues

2. **`README.md`** - Project overview (updated)
   - What is CECBS
   - Quick start options
   - Architecture
   - Features and tech stack

3. **`STARTUP-GUIDE.md`** 📖 COMPREHENSIVE GUIDE
   - Detailed startup instructions
   - All script options explained
   - Development workflows
   - Complete troubleshooting section
   - Best practices

4. **`SCRIPTS-OVERVIEW.md`** 🔧 VISUAL GUIDE
   - Visual decision trees
   - When to use each script
   - Timing references
   - Common scenarios
   - Flowcharts

5. **`DOCUMENTATION-INDEX.md`** 📑 MASTER INDEX
   - Complete documentation catalog
   - Organized by role and task
   - Quick reference
   - Learning path

6. **`Docs/QUICK-START.md`** - Updated with new scripts

---

## 🚀 How to Use (Quick Reference)

### Option 1: Simplest (Non-Technical)
```
Double-click: START-SYSTEM.bat
Wait 60 seconds
Open browser: http://localhost:3000
```

### Option 2: PowerShell (Recommended)
```powershell
# Daily quick start
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Stop (keep data)
.\stop-all.ps1 -KeepData
```

### Option 3: Development Mode
```powershell
# Opens 4 terminal tabs with hot-reload
.\dev-mode.ps1
```

---

## 🎯 What Each Script Does

### start-all.ps1
**Purpose:** Start the entire CECBS system

**Full Mode (no flags):**
- ✅ Checks Docker, Node.js, Go
- ✅ Builds Go chaincode
- ✅ Installs npm dependencies
- ✅ Builds TypeScript
- ✅ Starts Docker (Fabric network + databases)
- ✅ Starts API (port 3001)
- ✅ Starts UI (port 3000)
- ✅ Tests all connections
- ⏱️ Time: 5-10 minutes (first time)

**With -SkipBuild flag:**
- ⏩ Skips building steps
- ⏱️ Time: 60-90 seconds
- 💡 Use this for daily work!

**With -DevMode flag:**
- 🔥 Starts with hot-reload
- 💻 Best for active coding

**Usage:**
```powershell
# First time or after major changes
.\start-all.ps1

# Daily quick start
.\start-all.ps1 -SkipBuild

# Development with hot-reload
.\start-all.ps1 -DevMode

# Skip connection tests
.\start-all.ps1 -SkipBuild -SkipTests
```

---

### stop-all.ps1
**Purpose:** Stop all CECBS components

**Without flags:**
- ⛔ Stops Node.js processes
- ⛔ Stops Docker containers
- 🗑️ **Deletes all data** (clean slate)

**With -KeepData flag:**
- ⛔ Stops everything
- ✅ **Keeps database data**
- 💡 Recommended for daily use!

**Usage:**
```powershell
# Stop and keep data (recommended)
.\stop-all.ps1 -KeepData

# Stop and clean everything
.\stop-all.ps1
```

---

### restart-all.ps1
**Purpose:** Convenience script (stop + start)

**Usage:**
```powershell
# Full restart
.\restart-all.ps1

# Quick restart with data
.\restart-all.ps1 -KeepData -SkipBuild

# Dev mode restart
.\restart-all.ps1 -DevMode -KeepData
```

---

### status.ps1
**Purpose:** Check what's running

**Shows:**
- ✅ Service status (UI, API, databases, blockchain)
- ✅ Docker containers and their state
- ✅ Node.js processes
- ✅ Background jobs
- ✅ Overall system health

**Usage:**
```powershell
# Just run it anytime
.\status.ps1
```

**Example Output:**
```
Service Status:
● Frontend UI (Next.js)        Running
● Backend API                  Running
● PostgreSQL                   Running
● Redis                        Running
● Coffee Chaincode             Running

Docker Containers:
● peer0.ecta.cecbs.et - Up 5 minutes
● coffee-chaincode - Up 5 minutes
● cecbs-postgres - Up 5 minutes
...

✓ System is fully operational
```

---

### dev-mode.ps1
**Purpose:** Open complete development environment

**Opens 4 Windows Terminal tabs:**
1. **API Dev Server** - `cd api && npm run dev`
2. **UI Dev Server** - `cd ui && npm run dev`
3. **Docker Logs** - `docker-compose logs -f`
4. **System Monitor** - Commands and status

**Benefits:**
- 🔥 Hot-reload on both API and UI
- 👀 Watch blockchain logs in real-time
- 💻 Easy status checking
- ⚡ Instant feedback on code changes

**Usage:**
```powershell
.\dev-mode.ps1
```

---

### START-SYSTEM.bat / STOP-SYSTEM.bat
**Purpose:** One-click start/stop for non-technical users

**Usage:**
- Double-click `START-SYSTEM.bat` to start
- Double-click `STOP-SYSTEM.bat` to stop

---

## 📊 Timing Reference

| Action | Time | When to Use |
|--------|------|-------------|
| First-time full setup | 5-10 min | Initial installation |
| Daily start (-SkipBuild) | 60-90 sec | Regular development |
| Development mode | 90 sec | Active coding |
| Status check | 1 sec | Anytime |
| Stop | 10 sec | End of day |
| Restart with data | 60 sec | After changes |

---

## 🎭 Common Scenarios

### Scenario 1: First Day
```powershell
# Full setup
.\start-all.ps1
# Wait 5-10 minutes
# Open http://localhost:3000
```

### Scenario 2: Daily Work
```powershell
# Morning
.\start-all.ps1 -SkipBuild  # 60 sec

# During day
.\status.ps1                # Check anytime

# Evening
.\stop-all.ps1 -KeepData    # Quick stop
```

### Scenario 3: Active Development
```powershell
# Start dev environment
.\dev-mode.ps1

# Edit code → See changes instantly
# Watch logs in Docker tab
# Check status in Monitor tab
```

### Scenario 4: Something's Wrong
```powershell
# Check what's running
.\status.ps1

# Clean restart
.\stop-all.ps1
.\start-all.ps1 -SkipBuild
```

### Scenario 5: Demo
```
Double-click: START-SYSTEM.bat
Wait 60 seconds
Open: http://localhost:3000
Login: ecta_admin / password123
```

---

## 🎨 Visual Flow

```
┌─────────────────────────────────────────┐
│    What do you want to do?              │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    ┌────────┐ ┌──────┐ ┌─────────┐
    │ START  │ │ STOP │ │ STATUS  │
    └───┬────┘ └──┬───┘ └────┬────┘
        │         │           │
        │         │           └──→ status.ps1
        │         │
        │         └──→ stop-all.ps1
        │              └─ -KeepData (recommended)
        │
        ├─ Non-technical? → START-SYSTEM.bat
        ├─ Quick start?   → start-all.ps1 -SkipBuild
        ├─ Development?   → dev-mode.ps1
        └─ First time?    → start-all.ps1
```

---

## 📖 Documentation Structure

```
CECBS Documentation
│
├─ GETTING-STARTED.md ⭐ START HERE
│  └─ Complete beginner guide
│
├─ README.md
│  └─ Project overview & quick start
│
├─ STARTUP-GUIDE.md 📚 COMPREHENSIVE
│  ├─ All script options
│  ├─ Development workflows
│  └─ Complete troubleshooting
│
├─ SCRIPTS-OVERVIEW.md 🔧 VISUAL GUIDE
│  ├─ Decision trees
│  ├─ When to use what
│  └─ Common scenarios
│
├─ DOCUMENTATION-INDEX.md 📑 MASTER INDEX
│  └─ Complete catalog of all docs
│
└─ Docs/QUICK-START.md
   └─ Quick reference card
```

---

## ✅ What You Can Do Now

### Immediately
- ✅ Start the system with one command
- ✅ Check status anytime
- ✅ Stop gracefully with data preservation
- ✅ Double-click start for non-technical users

### For Development
- ✅ Hot-reload on API and UI changes
- ✅ Multi-terminal dev environment
- ✅ Watch logs in real-time
- ✅ Instant feedback loop

### For Production
- ✅ Consistent startup process
- ✅ Proper shutdown procedures
- ✅ Health monitoring
- ✅ Troubleshooting guides

---

## 🎯 Key Features

### Comprehensive
- ✅ All common use cases covered
- ✅ Options for every scenario
- ✅ Multiple user levels (beginner to advanced)

### User-Friendly
- ✅ Color-coded output
- ✅ Progress indicators
- ✅ Clear success/error messages
- ✅ Helpful summaries

### Robust
- ✅ Prerequisite checking
- ✅ Error handling
- ✅ Graceful degradation
- ✅ Detailed logging

### Flexible
- ✅ Multiple startup modes
- ✅ Configurable options
- ✅ Skip steps when appropriate
- ✅ Data preservation options

---

## 🚀 Next Steps

### For You
1. **Try it out:**
   ```powershell
   .\start-all.ps1 -SkipBuild
   ```

2. **Check status:**
   ```powershell
   .\status.ps1
   ```

3. **Explore the system:**
   - Open http://localhost:3000
   - Login with test credentials
   - Try a complete workflow

4. **Read documentation:**
   - Start with [GETTING-STARTED.md](Docs/GETTING-STARTED.md)
   - Reference [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) as needed

### For Your Team
1. **Share documentation:**
   - Point them to [GETTING-STARTED.md](Docs/GETTING-STARTED.md)
   - Show them `START-SYSTEM.bat` for non-technical users

2. **Onboarding:**
   - Follow the learning path in [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md)
   - Practice workflows from [COMPLETE-WORKFLOW-SEQUENCE.md](COMPLETE-WORKFLOW-SEQUENCE.md)

3. **Development:**
   - Use `dev-mode.ps1` for daily coding
   - Reference [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) for advanced usage

---

## 📞 Getting Help

### Quick Help
```powershell
# Check what's running
.\status.ps1

# View logs
docker-compose -f docker-compose-fabric.yml logs -f
```

### Documentation
- [GETTING-STARTED.md](Docs/GETTING-STARTED.md) - Basics
- [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) - Complete guide
- [SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md) - Script reference
- [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) - Full index

### Troubleshooting
See [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)

---

## 🎉 Success!

You now have a complete, professional startup system for CECBS with:

✅ **7 scripts** for all scenarios  
✅ **6 comprehensive guides** covering everything  
✅ **Multiple usage modes** from beginner to advanced  
✅ **Complete troubleshooting** documentation  
✅ **Development workflows** with hot-reload  
✅ **Production-ready** startup procedures

**Your single command to start everything:**
```powershell
.\start-all.ps1 -SkipBuild
```

**Your single command to check status:**
```powershell
.\status.ps1
```

**Your single command for development:**
```powershell
.\dev-mode.ps1
```

---

<div align="center">

## 🚀 Ready to Go!

**Start here:** [GETTING-STARTED.md](Docs/GETTING-STARTED.md)

```powershell
.\start-all.ps1 -SkipBuild
```

☕ **Happy coding with CECBS!** 🇪🇹

</div>
