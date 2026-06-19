# CECBS Quick Start Guide

## Fresh Installation

```powershell
# Run installation script (first time only)
.\install.ps1
```

This will:
- Check prerequisites (Docker, Node.js, Go)
- Install dependencies
- Build chaincode
- Start Fabric network
- Create channel
- Deploy chaincode

## Daily Usage

### Start System
```powershell
# Start all services
.\start-services.ps1
```

### Stop System
```powershell
# Stop all services
.\stop-services.ps1
```

### Deploy Updates
```powershell
# After making code changes
.\deploy.ps1

# With custom commit message
.\deploy.ps1 -CommitMessage "Added new feature"

# Skip tests for faster deployment
.\deploy.ps1 -SkipTests

# Skip backup
.\deploy.ps1 -SkipBackup
```

## Access System

- **UI**: http://localhost:3000
- **API**: http://localhost:3001

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

### 2. Issue LC (as Bank)
- Login: bank_admin / password123
- Portal: Banks → Issue Letter of Credit
- Select contract → Banks should auto-fill
- Submit

### 3. Approve Quality (as ECTA)
- Login: ecta_admin / password123
- Portal: ECTA → Quality Control
- Perform inspection → Approve
- Issue Export Permit (separate button)

### 4. Customs Clearance (as Customs)
- Login: customs_admin / password123
- Portal: Customs → Declarations
- Start Inspection → Complete → Clear

### 5. Submit Documents (as Exporter)
- Portal: Exporter → Payments
- Submit Documents (B/L, Invoice, etc.)

### 6. Verify & Pay (as Bank)
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
- Export permit issuance is separate from quality approval
- Customs has physical inspection step before clearance
- Banks must verify documents before SWIFT payment
