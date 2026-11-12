# GoCBC Quick Reference Card

## 🚀 Start System
```bash
./start-all.sh                    # Full start
./start-all.sh --skip-blockchain  # Skip blockchain
```

## 🔍 Check Status
```bash
curl http://localhost:3001/health                                    # API health
docker ps | grep peer                                                # Blockchain
bash test/ui/PORTAL-TAB-DATA-VALIDATION.sh                         # Portal tabs
node test/integration/final-integration-check.js                    # Integration
```

## 🔧 Common Tasks

### Restart API
```bash
pkill -f "ts-node.*server.ts"
cd api && npm run dev
```

### Deploy Chaincode Update
```bash
# 1. Modify chaincodes/coffee/*.go
# 2. Force upgrade:
rm chaincodes/coffee/.last_deployed
./deploy-chaincode.sh
```

### Check Chaincode Version
```bash
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee
```

## 📊 Current Status
- **Portals:** 7 (100% operational)
- **Tabs:** 73 (100% passing)  
- **Endpoints:** 176 (100% integrated)
- **Chaincode:** v1.1, sequence 2
- **New Functions:** 3 (ClearBorderCrossing, DetainBorderCrossing, RecordBorderInspection)

## 📚 Documentation
- **COMPLETE-INTEGRATION-FINAL-REPORT.md** - Full integration details
- **START-ALL-VERIFICATION.md** - Startup script verification
- **SYSTEM-STATUS.md** - Current system status

## 🔑 Test Login
- Username: `admin`
- Password: `admin123`

## 🆘 Troubleshooting
```bash
# Port conflict
lsof -ti:3001 | xargs kill -9

# View logs
tail -f logs/api.log

# Restart blockchain
docker-compose -f docker-compose-fabric.yml restart
```

---
**Last Updated:** November 5, 2026 | **Status:** 🟢 OPERATIONAL
