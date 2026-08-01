# 🚀 START HERE - CECBS Quick Launch

<div align="center">

## Welcome to the Coffee Export Consortium Blockchain System!

**Choose your path below** ⬇️

</div>

---

## 👤 Who Are You?

<table>
<tr>
<td width="50%">

### 🎯 I'm New / Non-Technical

**Just want to start the system?**

#### Windows:
1. Double-click `START-SYSTEM.bat`
2. Wait 60 seconds
3. Open http://localhost:3000
4. Login: `ecta_admin` / `password123`

✅ **Done!**

#### PowerShell:
```powershell
.\start-all.ps1 -SkipBuild
```

📖 **Learn more:** [GETTING-STARTED.md](Docs/GETTING-STARTED.md)

</td>
<td width="50%">

### 💻 I'm a Developer

**Ready to code?**

```powershell
# Development mode (hot-reload)
.\dev-mode.ps1
```

This opens 4 terminals:
- API with hot-reload
- UI with hot-reload  
- Docker logs
- System monitor

📖 **Learn more:** [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)

</td>
</tr>
</table>

---

## ⚡ Quick Commands

```powershell
# Start system (60 seconds)
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Development mode
.\dev-mode.ps1

# Stop (keep data)
.\stop-all.ps1 -KeepData
```

---

## 📚 Documentation

<table>
<tr>
<td width="33%">

### 🎯 Getting Started
- [GETTING-STARTED.md](Docs/GETTING-STARTED.md)
  - First-time setup
  - Prerequisites
  - 5-minute quick start

</td>
<td width="33%">

### 📖 Complete Guides
- [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)
  - All script options
  - Troubleshooting
  - Best practices

</td>
<td width="33%">

### 🔍 Quick Reference
- [SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md)
  - Visual guides
  - Common scenarios
  - Decision trees

</td>
</tr>
</table>

---

## 🎬 First Time Setup

### Prerequisites (10 minutes)
1. **Docker Desktop** - https://www.docker.com/products/docker-desktop
2. **Node.js 18+** - https://nodejs.org/
3. **Go 1.20+** - https://go.dev/dl/

### Start the System (5-10 minutes first time)
```powershell
cd c:\goCBC
.\start-all.ps1
```

### Verify It's Working
```powershell
.\status.ps1
```

Should show all services as **Running** ✅

### Access the System
- **UI**: http://localhost:3000
- **API Docs**: http://localhost:3001/api-docs

**Login:** `ecta_admin` / `password123`

---

## 🎯 What Can I Do?

### I Want to...

<table>
<tr>
<td width="50%">

**Start the system**
```powershell
.\start-all.ps1 -SkipBuild
```

**Check if it's running**
```powershell
.\status.ps1
```

**Stop the system**
```powershell
.\stop-all.ps1 -KeepData
```

</td>
<td width="50%">

**Develop with hot-reload**
```powershell
.\dev-mode.ps1
```

**Restart everything**
```powershell
.\restart-all.ps1 -KeepData -SkipBuild
```

**View logs**
```powershell
docker logs coffee-chaincode -f
```

</td>
</tr>
</table>

---

## 🆘 Something Wrong?

### Quick Fixes

**System won't start?**
```powershell
# Check Docker is running
# Then try:
.\start-all.ps1 -SkipBuild
```

**Need to reset everything?**
```powershell
.\stop-all.ps1
docker system prune -f
.\start-all.ps1
```

**Check what's actually running?**
```powershell
.\status.ps1
docker ps
```

📖 **Full troubleshooting:** [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)

---

## 📊 What's Included?

### Scripts You Have

| Script | Use When | Time |
|--------|----------|------|
| `start-all.ps1` | First time or major changes | 5-10 min |
| `start-all.ps1 -SkipBuild` | Daily work | 60 sec |
| `dev-mode.ps1` | Active development | 90 sec |
| `status.ps1` | Check health | 1 sec |
| `stop-all.ps1 -KeepData` | End of day | 10 sec |
| `START-SYSTEM.bat` | Non-technical (double-click) | 60 sec |

### Documentation You Have

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](Docs/GETTING-STARTED.md) | Complete beginner guide |
| [README.md](README.md) | Project overview |
| [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) | Comprehensive reference |
| [SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md) | Visual script guide |
| [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) | Master index |

---

## 🎓 Learning Path

### Day 1: Get It Running
1. Install prerequisites
2. Run `.\start-all.ps1`
3. Open http://localhost:3000
4. Login and explore

### Day 2: Understand It
1. Read [GETTING-STARTED.md](Docs/GETTING-STARTED.md)
2. Try different portals
3. Test a complete workflow
4. Practice start/stop

### Week 1: Use It Daily
1. Use `.\start-all.ps1 -SkipBuild` daily
2. Check `.\status.ps1` often
3. Read [COMPLETE-WORKFLOW-SEQUENCE.md](COMPLETE-WORKFLOW-SEQUENCE.md)
4. Test different workflows

### Week 2+: Develop
1. Use `.\dev-mode.ps1` for coding
2. Read [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)
3. Explore the codebase
4. Make changes and test

---

## 🌟 Key Takeaways

### For Everyone
✅ **One command** starts everything  
✅ **One command** checks status  
✅ **One command** stops safely  
✅ **Complete documentation** available  

### For Developers
✅ **Hot-reload** development mode  
✅ **Multi-terminal** environment  
✅ **Instant feedback** on changes  
✅ **Production-ready** builds  

### For Operators
✅ **Consistent** startup process  
✅ **Health monitoring** built-in  
✅ **Graceful** shutdown  
✅ **Data preservation** options  

---

## 🎯 Your Action Plan

### Right Now (5 minutes)
1. Ensure Docker Desktop is running
2. Open PowerShell in project directory
3. Run: `.\start-all.ps1 -SkipBuild`
4. Run: `.\status.ps1`
5. Open: http://localhost:3000

### Today (30 minutes)
1. Read [GETTING-STARTED.md](Docs/GETTING-STARTED.md)
2. Explore the UI
3. Try logging in with different roles
4. Test one complete workflow

### This Week
1. Read [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)
2. Try `.\dev-mode.ps1`
3. Make a small change
4. See it update instantly

---

## 📞 Need Help?

### Quick Help
```powershell
.\status.ps1  # What's running?
```

### Documentation
- 🎯 [GETTING-STARTED.md](Docs/GETTING-STARTED.md) - Start here
- 📚 [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) - Complete guide
- 🔧 [SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md) - Script reference
- 📑 [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) - All docs

### Common Questions

**"How do I start it?"**
→ `.\start-all.ps1 -SkipBuild`

**"How do I know if it's working?"**
→ `.\status.ps1` or check http://localhost:3000

**"How do I stop it?"**
→ `.\stop-all.ps1 -KeepData`

**"I want to code with hot-reload"**
→ `.\dev-mode.ps1`

**"Something's broken"**
→ See [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)

---

<div align="center">

## 🚀 You're Ready!

### Quick Start Command

```powershell
.\start-all.ps1 -SkipBuild
```

### Then Open

**http://localhost:3000**

### Default Login

**Username:** `ecta_admin`  
**Password:** `password123`

---

## Choose Your Next Step

<table>
<tr>
<td align="center" width="33%">

### 📖 Learn More
[GETTING-STARTED.md](Docs/GETTING-STARTED.md)

Complete guide for beginners

</td>
<td align="center" width="33%">

### 💻 Start Coding
[STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)

Development workflows

</td>
<td align="center" width="33%">

### 🔍 Explore Scripts
[SCRIPTS-OVERVIEW.md](SCRIPTS-OVERVIEW.md)

Visual script guide

</td>
</tr>
</table>

---

### ☕ Made for Ethiopian Coffee Exports 🇪🇹

**CECBS - Coffee Export Consortium Blockchain System**

Powered by Hyperledger Fabric • Built with Node.js & Next.js

---

**Questions?** Check [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md)  
**Issues?** See [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)  
**Ready?** Run `.\start-all.ps1 -SkipBuild` 🚀

</div>
