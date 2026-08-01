# CECBS Startup Scripts - Which One to Use?

## Choose Your Startup Method

### 🚀 Production Use (Recommended)

**Windows Users:**
```cmd
START-SYSTEM.bat
```
Double-click the file, or run in Command Prompt.

**PowerShell:**
```powershell
.\start-all.ps1 -SkipBuild
```

**Linux/macOS/Git Bash:**
```bash
./start-all.sh --skip-build
```

---

### 🔍 If Script Fails Immediately

**Try the Safe Wrapper:**
```bash
bash start-safe.sh
```

**Or the Minimal Version:**
```bash
bash start-minimal.sh
# Or even:
sh start-minimal.sh
```

**Or Debug Version:**
```bash
bash start-debug.sh
```

---

### 🛠️ Development Mode

For hot-reload during development:

```bash
./dev-mode.sh
```

Or manually in separate terminals:
```bash
# Terminal 1 - API
cd api
npm run dev

# Terminal 2 - UI
cd ui
npm run dev

# Terminal 3 - Containers (if not running)
docker-compose -f docker-compose-fabric.yml up
```

---

## Complete Script Reference

### Main Scripts

| Script | Platform | Use Case |
|--------|----------|----------|
| `START-SYSTEM.bat` | Windows | Double-click to start (easiest) |
| `STOP-SYSTEM.bat` | Windows | Double-click to stop |
| `start-all.sh` | Linux/macOS/Bash | Full-featured startup |
| `start-all.ps1` | Windows PowerShell | Full-featured startup |
| `stop-all.sh` | Linux/macOS/Bash | Safe shutdown |
| `stop-all.ps1` | Windows PowerShell | Safe shutdown |

### Alternative/Debug Scripts

| Script | Use Case |
|--------|----------|
| `start-safe.sh` | **Use if main script fails** - checks issues first |
| `start-minimal.sh` | **Most compatible** - works everywhere |
| `start-debug.sh` | Shows detailed execution for troubleshooting |
| `test-startup.sh` | Diagnose problems before starting |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `restart-all.sh` / `.ps1` | Quick restart |
| `status.sh` / `.ps1` | Check system status |
| `dev-mode.sh` / `.ps1` | Development with hot-reload |

---

## Startup Options

### Skip Build (Faster)
```bash
./start-all.sh --skip-build
```
Use when dependencies are already installed and code is already compiled.

### Development Mode
```bash
./start-all.sh --dev-mode
```
Starts with hot-reload enabled.

### Skip Tests
```bash
./start-all.sh --skip-tests
```
Skip connection tests after startup.

### Combine Options
```bash
./start-all.sh --skip-build --skip-tests
```

---

## Troubleshooting Decision Tree

```
Script fails?
├─ Exits immediately, no output?
│  ├─ Try: bash start-safe.sh
│  └─ Try: bash start-minimal.sh
│
├─ Works on one machine, fails on others?
│  ├─ Line endings issue
│  │  └─ Run: dos2unix start-all.sh
│  └─ Missing dependencies
│     └─ Run: bash test-startup.sh
│
├─ Hangs during startup?
│  ├─ Wait 2-3 minutes (first run is slow)
│  └─ Check logs: docker-compose logs -f
│
├─ "Command not found"?
│  └─ Missing tools
│     └─ Run: bash test-startup.sh
│
└─ Port already in use?
   └─ Run: ./stop-all.sh
```

---

## Platform-Specific Instructions

### Windows

**Option 1 - Double-click (Easiest):**
1. Double-click `START-SYSTEM.bat`
2. Wait for browser to open
3. Login with default credentials

**Option 2 - PowerShell:**
```powershell
.\start-all.ps1 -SkipBuild
```

**Option 3 - Git Bash:**
```bash
bash start-all.sh --skip-build
```

### Linux

```bash
# Make executable (first time only)
chmod +x *.sh

# Start system
./start-all.sh --skip-build
```

### macOS

```bash
# Make executable (first time only)
chmod +x *.sh

# Start system
./start-all.sh --skip-build
```

---

## Default Credentials

After startup, access http://localhost:3000 and login with:

| Role | Username | Password |
|------|----------|----------|
| ECTA Admin | `ecta_admin` | `password123` |
| NBE Officer | `nbe_admin` | `password123` |
| Bank Officer | `bank_admin` | `password123` |
| Customs Officer | `customs_admin` | `password123` |
| Exporter | `EXP1087072` | `password123` |

---

## Quick Links

- **Full Guide**: [Docs/STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Quick Start**: [Docs/GETTING-STARTED.md](Docs/GETTING-STARTED.md)
- **Scripts Overview**: [Docs/SCRIPTS-OVERVIEW.md](Docs/SCRIPTS-OVERVIEW.md)
