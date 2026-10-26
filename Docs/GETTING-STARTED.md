# Getting Started with CECBS

**Welcome!** This guide will get you up and running with the Coffee Export Consortium Blockchain System in under 5 minutes.

---

## ⚡ Super Quick Start (60 seconds)

Already have Docker, Node.js, and Go installed? Run this:

```powershell
.\start-all.ps1 -SkipBuild
```

Wait 60 seconds, then open: **http://localhost:3000**

Login: `ecta_admin` / `password123`

**Done!** 🎉

---

## 📋 Complete First-Time Setup

### Step 1: Install Prerequisites (10 minutes)

Download and install these (if not already installed):

1. **Docker Desktop** ⭐ Required
   - Download: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop
   - Wait for Docker to be ready (green icon in system tray)

2. **Node.js 18+** ⭐ Required
   - Download: https://nodejs.org/
   - Choose LTS version
   - Verify: Open PowerShell and run `node --version`

3. **Go 1.20+** ⭐ Required
   - Download: https://go.dev/dl/
   - Install with default options
   - Verify: Run `go version`

### Step 2: Start the System (5 minutes)

```powershell
# Open PowerShell in the project directory
cd c:\goCBC

# Start everything (first time takes 5-10 minutes)
.\start-all.ps1
```

**What's happening?**
- ✅ Checking prerequisites
- ✅ Downloading Docker images
- ✅ Installing dependencies
- ✅ Building code
- ✅ Starting blockchain network
- ✅ Starting API and UI

### Step 3: Verify It's Working

```powershell
# Check status
.\status.ps1
```

You should see all services showing as "Running" in green.

### Step 4: Access the System

Open your browser:
- **Main UI**: http://localhost:3000
- **API Docs**: http://localhost:3001/api-docs

Login with:
- Username: `ecta_admin`
- Password: `password123`

**Success!** You're now running CECBS locally. 🎉

---

## 🎮 Daily Usage

### Starting Your Work Day

```powershell
# Quick start (60 seconds)
.\start-all.ps1 -SkipBuild
```

### During Development

```powershell
# Option 1: Development mode (recommended)
.\dev-mode.ps1
# Opens 4 terminal tabs with hot-reload

# Option 2: Manual control
# Terminal 1: Infrastructure
.\start-all.ps1 -SkipBuild

# Terminal 2: API with hot-reload
cd api
npm run dev

# Terminal 3: UI with hot-reload
cd ui
npm run dev
```

### Checking System Status

```powershell
# Quick status check
.\status.ps1
```

### Ending Your Work Day

```powershell
# Stop everything (keeps your data for tomorrow)
.\stop-all.ps1 -KeepData
```

---

## 📚 Available Scripts

| What I Want | Command | Time |
|-------------|---------|------|
| Start system (first time) | `.\start-all.ps1` | 5-10 min |
| Start system (daily) | `.\start-all.ps1 -SkipBuild` | 60 sec |
| Start for development | `.\dev-mode.ps1` | 90 sec |
| Check if running | `.\status.ps1` | 1 sec |
| Stop system (keep data) | `.\stop-all.ps1 -KeepData` | 10 sec |
| Stop system (clean slate) | `.\stop-all.ps1` | 10 sec |
| Restart | `.\restart-all.ps1 -KeepData -SkipBuild` | 60 sec |

**For non-technical users:**
- Double-click `START-SYSTEM.bat` to start
- Double-click `STOP-SYSTEM.bat` to stop

---

## 🎯 What to Do Next

### 1. Explore the System

Login and explore different portals:
- **ECTA Portal** - ecta_admin / password123
- **Banks Portal** - bank_admin / password123
- **Customs Portal** - customs_admin / password123
- **Exporter Portal** - EXP1087072 / password123

### 2. Test a Complete Workflow

Follow the complete workflow:
1. Exporter registers a contract
2. ECTA approves the contract
3. Bank issues Letter of Credit
4. ECTA performs quality inspection
5. Customs clears the shipment
6. Bank processes payment

📖 **Detailed steps:** See [COMPLETE-WORKFLOW-SEQUENCE.md](COMPLETE-WORKFLOW-SEQUENCE.md)

### 3. Read the Documentation

- **[STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)** - Comprehensive guide with troubleshooting
- **[SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md)** - Visual guide to all scripts
- **[Docs/QUICK-START.md](Docs/QUICK-START.md)** - Quick reference
- **[README.md](README.md)** - Project overview

### 4. Start Developing

If you're a developer:

```powershell
# Start development environment
.\dev-mode.ps1
```

This opens 4 terminal tabs:
1. **API Dev Server** - Backend with hot-reload
2. **UI Dev Server** - Frontend with hot-reload
3. **Docker Logs** - Container log viewer
4. **System Monitor** - Status and controls

Make changes to code and see them instantly in the browser!

---

## 🐛 Common Issues & Solutions

### "Docker daemon not running"

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (green icon)
3. Try again: `.\start-all.ps1`

### "Port 3000 already in use"

**Solution:**
```powershell
# Stop everything first
.\stop-all.ps1

# Then start again
.\start-all.ps1 -SkipBuild
```

### "System is slow"

**Solution:**
1. Open Docker Desktop → Settings → Resources
2. Increase CPU to 4 cores
3. Increase Memory to 8GB
4. Restart: `.\restart-all.ps1 -KeepData -SkipBuild`

### "Chaincode errors"

**Solution:**
```powershell
# Rebuild chaincode
cd chaincodes\coffee
go build -o chaincode.exe
docker restart coffee-chaincode
```

### "I'm completely stuck"

**Solution - Nuclear option (resets everything):**
```powershell
# Stop everything
.\stop-all.ps1

# Clean Docker
docker system prune -a --volumes -f

# Fresh start
.\start-all.ps1
```

📖 **More solutions:** See [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)

---

## 🎓 Learning Path

### Week 1: Get Comfortable
- ✅ Install and start the system
- ✅ Explore all portals
- ✅ Complete one full workflow
- ✅ Practice starting/stopping

### Week 2: Understand the Architecture
- ✅ Read [CONSORTIUM-BLOCKCHAIN-VALUE-PROPOSITION.md](Docs/CONSORTIUM-BLOCKCHAIN-VALUE-PROPOSITION.md)
- ✅ Review the system architecture in [README.md](README.md)
- ✅ Explore the API documentation at http://localhost:3001/api-docs
- ✅ Watch Docker container logs

### Week 3: Start Developing
- ✅ Use `dev-mode.ps1` for hot-reload
- ✅ Make small changes to UI components
- ✅ Test API endpoints
- ✅ Read the codebase structure

### Week 4: Deep Dive
- ✅ Understand Hyperledger Fabric concepts
- ✅ Review chaincode (smart contracts)
- ✅ Customize workflows
- ✅ Add new features

---

## 📞 Getting Help

### Quick Help
```powershell
# Check what's running
.\status.ps1

# View logs
docker-compose -f docker-compose-fabric.yml logs -f

# View specific container logs
docker logs coffee-chaincode --tail 100 -f
```

### Documentation
- [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) - Complete guide
- [SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md) - Script reference
- [Docs/QUICK-START.md](Docs/QUICK-START.md) - Quick start
- [README.md](README.md) - Project overview

### Community
- Check GitHub Issues
- Read existing documentation
- Ask in your team Slack/Teams

---

## ✅ Success Checklist

Before you start development, make sure:

- [ ] Docker Desktop is installed and running
- [ ] Node.js 18+ is installed
- [ ] Go 1.20+ is installed
- [ ] System starts successfully with `.\start-all.ps1`
- [ ] All services show "Running" in `.\status.ps1`
- [ ] Can access http://localhost:3000
- [ ] Can login with test credentials
- [ ] Can complete one full workflow
- [ ] Understand how to start/stop the system
- [ ] Bookmarked key documentation files

---

## 🎉 You're Ready!

Congratulations! You now have:
- ✅ A fully functional CECBS system
- ✅ All the scripts you need to manage it
- ✅ Documentation to help you
- ✅ Knowledge to start developing

**Most Common Commands:**
```powershell
# Daily start
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Development mode
.\dev-mode.ps1

# Daily stop
.\stop-all.ps1 -KeepData
```

**Access Points:**
- UI: http://localhost:3000
- API: http://localhost:3001
- Docs: http://localhost:3001/api-docs

**Default Login:**
- Username: `ecta_admin`
- Password: `password123`

---

## 🚀 Next Steps

1. **Explore** - Click around and see what's there
2. **Test** - Run a complete workflow
3. **Learn** - Read the documentation
4. **Develop** - Start making changes
5. **Contribute** - Add new features!

---

<div align="center">

**Happy Coding!** 🎉

[Main README](README.md) • [Startup Guide](Docs/STARTUP-GUIDE.md) • [Scripts Overview](SCRIPTS-OVERVIEW.md)

☕ Made for Ethiopian Coffee Exports 🇪🇹

</div>
