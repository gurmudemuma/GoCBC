# CECBS Quick Start Guide

## 🚀 Quick Start (3 Options)

### Option 1: Double-Click (Easiest)
1. Double-click `START-SYSTEM.bat` to start
2. Double-click `STOP-SYSTEM.bat` to stop

### Option 2: PowerShell (Recommended)
```powershell
# Start the system
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Stop the system
.\stop-all.ps1 -KeepData
```

### Option 3: Development Mode (For Developers)
```powershell
# Opens 4 terminal tabs with hot-reload
.\dev-mode.ps1
```

---

## 📋 First Time Setup

### Prerequisites
- **Docker Desktop** - Must be running
- **Node.js 18+** - https://nodejs.org/
- **Go 1.20+** - https://go.dev/dl/

### Initial Installation

```powershell
# 1. Open PowerShell in project directory
cd c:\goCBC

# 2. First-time full startup (takes 5-10 minutes)
.\start-all.ps1

# This will:
# ✓ Check prerequisites
# ✓ Install npm dependencies
# ✓ Build chaincode and TypeScript
# ✓ Start Fabric network
# ✓ Deploy smart contracts
# ✓ Start API and UI servers
```

---

## 🎯 Daily Usage

### Starting Your Day
```powershell
# Quick start (30-60 seconds)
.\start-all.ps1 -SkipBuild
```

### During Development
```powershell
# Option 1: Full dev environment
.\dev-mode.ps1

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

### Ending Your Day
```powershell
# Keep data for tomorrow
.\stop-all.ps1 -KeepData

# Or clean slate
.\stop-all.ps1
```

---

## 🔧 Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-all.ps1` | Start everything | `.\start-all.ps1 -SkipBuild` |
| `stop-all.ps1` | Stop everything | `.\stop-all.ps1 -KeepData` |
| `restart-all.ps1` | Restart system | `.\restart-all.ps1 -KeepData -SkipBuild` |
| `status.ps1` | Check status | `.\status.ps1` |
| `dev-mode.ps1` | Dev environment | `.\dev-mode.ps1` |
| `START-SYSTEM.bat` | Quick start | Double-click |
| `STOP-SYSTEM.bat` | Quick stop | Double-click |

**Detailed documentation:** See `STARTUP-GUIDE.md`

---

## 🌐 Access System

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs

## Default Logins

| Role | Username | Password |
|------|----------|----------|
| ECTA Admin | ecta_admin | password123 |
| NBE Officer | nbe_admin | password123 |
| Bank Officer | bank_admin | password123 |
| Customs Officer | customs_admin | password123 |
| Exporter | EXP1087072 | password123 |

## Testing Workflow

### 1. Create Contract (as Exporter)
- Login: EXP1087072 / password123
- Portal: Exporter → My Contracts → Register New Contract
- Fill buyer bank (international) and exporter bank (Ethiopian)
- Submit

### 2. Approve Contract (as ECTA)
- Login: ecta_admin / password123
- Portal: ECTA → Sales Contracts → Review
- Approve contract for export compliance
- *(Note: Banks do NOT approve contracts - only ECTA does)*

### 3. Issue LC (as Bank)
- Login: bank_admin / password123
- Portal: Banks → ECTA-Approved Contracts
- View ECTA-approved contracts
- Navigate to LC Management → Issue Letter of Credit
- Select contract → Banks should auto-fill
- Submit

### 4. Approve Quality (as ECTA)
- Portal: ECTA → Quality Control
- Perform inspection → Approve
- Issue Export Permit (separate button)

### 5. Customs Clearance (as Customs)
- Login: customs_admin / password123
- Portal: Customs → Declarations
- Start Inspection → Complete → Clear

### 6. Submit Documents (as Exporter)
- Portal: Exporter → Payments
- Submit Documents (B/L, Invoice, etc.)

### 7. Verify & Pay (as Bank)
- Portal: Banks → Payments
- Verify Documents → Initiate SWIFT

## Troubleshooting

### Blockchain not responding
```powershell
docker-compose -f docker-compose-fabric.yml restart
```

### Chaincode errors
```powershell
cd chaincodes\coffee
go build -o chaincode.exe
docker restart coffee-chaincode
```

### API errors
```powershell
cd api
npm install
npm start
```

### Database issues
```powershell
# Backup and reset
Copy-Item api\cecbs.db api\cecbs.db.backup
Remove-Item api\cecbs.db
# Restart API to recreate
```

## Check Status

```powershell
# Check Docker containers
docker ps

# Check chaincode logs
docker logs coffee-chaincode --tail 50

# Check peer logs
docker logs peer0.ecta.cecbs.et --tail 50
```

## Important Notes

- Always create NEW contracts to test bank auto-fill (old contracts don't have bank data)
- Check browser console for debugging logs
- **Contract approval is ECTA's responsibility ONLY** - Banks do NOT approve contracts
- Banks only issue LCs for ECTA-approved contracts
- Export permit issuance is separate from quality approval
- Customs has physical inspection step before clearance
- Banks must verify documents before SWIFT payment
