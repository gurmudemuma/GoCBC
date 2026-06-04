# CECBS Quick Reference Guide
**Version:** 1.4  
**Last Updated:** June 4, 2026

---

## 🚀 Quick Start Commands

### Start the System
```bash
# Start Fabric network
./scripts/start.sh

# Start API server
cd api && npm start

# Start UI
cd ui && npm run dev
```

### Stop the System
```bash
./scripts/stop.sh
```

---

## 📦 Chaincode Operations

### Current Version
- **Version:** 1.4
- **Sequence:** 5
- **Container:** coffee-chaincode:1.4
- **Port:** 9999

### Check Status
```powershell
# Container status
docker ps --filter name=coffee-chaincode

# Container logs
docker logs coffee-chaincode -f

# Query committed version
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel -n coffee
```

### Test Queries
```powershell
# Test from peer
docker exec peer0.ecta.cecbs.et peer chaincode query `
  -C coffeechannel -n coffee `
  -c '{"function":"QueryAllExporters","Args":[]}'

# Test API
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

### Upgrade to New Version
```powershell
# Modify chaincode in chaincodes/coffee/*.go
# Then run:
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5"

# Dry run first (recommended)
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -DryRun
```

---

## 🏢 Organizations & Ports

| Organization | Peer Port | MSP ID |
|--------------|-----------|--------|
| ECTA | 7051 | ECTAMSP |
| ECX | 8051 | ECXMSP |
| Banks | 9051 | BanksMSP |
| NBE | 10051 | NBEMSP |
| Customs | 11051 | CustomsMSP |
| Shipping | 12051 | ShippingMSP |

**Orderer:** 7050  
**Chaincode:** 9999  
**API:** 3001  
**UI:** 3000

---

## 🔧 Common Tasks

### Restart Chaincode Container
```powershell
docker stop coffee-chaincode
docker rm coffee-chaincode

docker run -d --name coffee-chaincode `
  --network cecbs-network `
  -p 9999:9999 `
  -e CORE_CHAINCODE_ID_NAME="coffee_1.4:<package-id>" `
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" `
  coffee-chaincode:1.4
```

### Rebuild Chaincode (No Upgrade)
```powershell
cd chaincodes/coffee
$env:GOOS="linux"; $env:GOARCH="amd64"; $env:CGO_ENABLED="0"
go build -v -o chaincode-linux .
docker build -t coffee-chaincode:1.4 .
```

### View Peer Logs
```bash
docker logs peer0.ecta.cecbs.et -f
docker logs peer0.ecx.cecbs.et -f
# ... etc
```

### Check API Health
```bash
curl http://localhost:3001/health
```

---

## 📁 Key Directories

```
CEX/
├── api/                    # API server
├── ui/                     # Frontend
├── blockchain/             # Network config
├── chaincodes/coffee/      # Smart contracts
├── scripts/                # Automation
│   ├── upgrade-chaincode-version.ps1  ⭐ UPGRADE
│   └── install-v1.4-now.ps1          Current deploy
├── Docs/                   # Documentation
│   ├── UPGRADE-SYSTEM-GUIDE.md       ⭐ UPGRADE GUIDE
│   └── ARCHITECTURE.md               System design
└── archive/                # Backups
```

---

## 📝 Chaincode Functions (v1.4)

### ECTA (main.go) - 8 functions
- RegisterExporter (9 params)
- UpdateExporterStatus
- SuspendExporter
- RevokeExporterLicense
- RegisterSalesContract
- ApproveSalesContract
- CreateShipment
- RecordBillOfLading

### Banking (banking.go) - 18 functions
- LC Management (8)
- Payment Settlement (10)

### Forex (forex.go) - 16 functions
- Forex Allocation (7)
- Exchange Rates (3)
- Retention Policy (2)
- Oversight (4)

### Customs (customs.go) - 8 functions
- Declaration management

### Payment (payment.go) - 11 functions
- SWIFT payment processing

### ECX (ecx.go) - 6 functions
- Lot management

**Total: 62+ functions**

---

## 🐛 Troubleshooting

### Chaincode Not Responding
```powershell
# 1. Check container
docker logs coffee-chaincode

# 2. Verify CCID matches package ID
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled

# 3. Restart with correct CCID
# (see "Restart Chaincode Container" above)
```

### Peer Connection Issues
```bash
# Check peer status
docker ps | grep peer0

# Restart peer
docker restart peer0.ecta.cecbs.et
```

### API Errors
```bash
# Check API logs
cd api
tail -f logs/combined.log

# Restart API
npm start
```

### Query Timeouts
- Check chaincode container is running
- Verify peers are connected
- Check CCID matches package ID
- Restart chaincode container

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview |
| `QUICK-REFERENCE.md` | This file |
| `Docs/UPGRADE-SYSTEM-GUIDE.md` | Complete upgrade guide |
| `Docs/ARCHITECTURE.md` | System architecture |
| `Docs/CHAINCODE-V1.4-DEPLOYED-SUCCESS.md` | v1.4 deployment details |
| `Docs/API-DOCUMENTATION.md` | API reference |
| `Docs/CODEBASE-CLEANUP-REPORT.md` | Cleanup report |

---

## 🔐 Important Files

### Never Delete
- `chaincodes/coffee/*.go` - Source code
- `chaincodes/coffee/go.mod` - Dependencies
- `chaincodes/coffee/Dockerfile` - Container build
- `chaincodes/coffee/connection.json` - External config
- `scripts/upgrade-chaincode-version.ps1` - Upgrade system
- `docker-compose-fabric.yml` - Network config

### Safe to Regenerate
- `chaincodes/coffee/chaincode-linux` - Binary (rebuild)
- `chaincodes/coffee/*.tar.gz` - Packages (recreate)
- `chaincodes/coffee/vendor/` - Vendors (go mod vendor)

---

## 🎯 Next Steps Checklist

- [ ] Test all 6 portal UIs
- [ ] Verify all 62+ chaincode functions
- [ ] Monitor container logs for 24 hours
- [ ] Test backup and restore procedure
- [ ] Document custom business logic
- [ ] Set up monitoring/alerting
- [ ] Plan next feature upgrade

---

## 💡 Pro Tips

1. **Always dry-run upgrades first**
   ```powershell
   .\scripts\upgrade-chaincode-version.ps1 -NewVersion "X.Y" -DryRun
   ```

2. **Keep backups before major changes**
   - Automatic backups in `archive/chaincode-backups/`
   - Manual backup: copy entire `chaincodes/coffee/` directory

3. **Monitor logs regularly**
   ```bash
   docker logs coffee-chaincode -f
   ```

4. **Test queries after any change**
   ```bash
   docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"QueryAllExporters","Args":[]}'
   ```

5. **Use upgrade script for all version changes**
   - Handles all complexity automatically
   - Creates backups
   - Validates everything

---

## 🆘 Emergency Contacts

### System Issues
1. Check logs first
2. Consult documentation
3. Review troubleshooting section

### Upgrade Issues
- See `Docs/UPGRADE-SYSTEM-GUIDE.md` - Troubleshooting section
- Check upgrade log: `archive/chaincode-backups/upgrade-log.json`
- Review rollback procedure in upgrade guide

---

## ⚡ Power User Commands

### One-Line Status Check
```powershell
Write-Host "Chaincode: $(docker ps --filter name=coffee-chaincode --format '{{.Status}}')"; Write-Host "API: $(Test-NetConnection localhost -Port 3001 -InformationLevel Quiet)"; Write-Host "UI: $(Test-NetConnection localhost -Port 3000 -InformationLevel Quiet)"
```

### Bulk Peer Status
```bash
for org in ecta ecx banks nbe customs shipping; do
  echo "$org: $(docker ps --filter name=peer0.$org.cecbs.et --format '{{.Status}}')"
done
```

### Quick Package ID
```powershell
(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | Select-String "coffee_1.4").ToString().Split(':')[1].Trim().Split(',')[0]
```

---

**Quick Reference v1.0** | Last Updated: June 4, 2026
