# 📋 Quick Reference Card - Coffee Chaincode v1.3

**Status:** 🟢 OPERATIONAL | **Date:** June 2, 2026 | **Version:** 1.3

---

## 🎯 What's New in v1.3

✅ **9-Parameter RegisterExporter** (was 7)  
✅ **Exporter Type:** private/company/individual  
✅ **Lab Certificate:** ECTA-approved certificate tracking  
✅ **Capital Validation:** Automated by exporter type  
✅ **License Management:** suspend/activate/revoke

---

## 🔢 9 Parameters (In Order)

1. `exporterId` - Unique exporter ID
2. `companyName` - Company or individual name
3. `ectaLicenseNumber` - ECTA-issued license
4. **`exporterType`** ⭐ - private/company/individual
5. `capitalRequirement` - Capital in ETB
6. `professionalTaster` - yes/no
7. `tasterCertificate` - Taster cert number
8. **`laboratoryCertificateNumber`** ⭐ - Lab cert
9. `licenseExpiryDate` - YYYY-MM-DD

---

## 💰 Capital Requirements (2026)

| Type | Minimum |
|------|---------|
| **Company** | 5,000,000 ETB |
| **Private** | 500,000 ETB |
| **Individual** | No minimum |

---

## 🚀 Quick Commands

### Check Status
```bash
# Chaincode container
docker ps --filter name=coffee-chaincode

# API server
curl http://localhost:3001/health

# All peers
docker ps --filter name=peer0

# Run full test
.\scripts\test-v1.3-deployment.ps1
```

### View Logs
```bash
# Chaincode logs
docker logs coffee-chaincode -f

# API logs (in npm terminal)
cd api && npm run dev
```

### Query Exporter
```bash
# Via API
curl http://localhost:3001/api/exporters/EXP-2026-001

# Direct blockchain
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"ReadExporter","Args":["EXP-2026-001"]}'
```

---

## 🔧 Troubleshooting

### Container Not Running
```bash
docker start coffee-chaincode
```

### API Not Responding
```bash
cd api
npm run dev
```

### Peers Disconnected
```bash
docker restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et
```

### Test Deployment
```bash
.\scripts\test-v1.3-deployment.ps1
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| **Registration** | http://localhost:3000/register-exporter |
| **Login** | http://localhost:3000/login |
| **ECTA Portal** | http://localhost:3000/portals/ecta |
| **API Health** | http://localhost:3001/health |
| **API Docs** | http://localhost:3001/api-docs |

---

## 👤 Test Credentials

| Role | Username | Password |
|------|----------|----------|
| **ECTA Admin** | ecta_admin | ecta123 |
| **ECX Admin** | ecx_admin | ecx123 |
| **NBE Admin** | nbe_admin | nbe123 |

---

## 📊 System Health Check

```bash
# 1. Chaincode running?
docker ps --filter name=coffee-chaincode
# Expected: Up X minutes

# 2. API healthy?
curl http://localhost:3001/health
# Expected: {"status":"healthy"}

# 3. All tests pass?
.\scripts\test-v1.3-deployment.ps1
# Expected: ✅ 5/5 tests passed
```

---

## 🧪 Quick Test (2 minutes)

1. **Register:** http://localhost:3000/register-exporter
   - Type: "company"
   - Lab: "ECTA-LAB-TEST"
   - Capital: "5000000"

2. **Login:** ecta_admin / ecta123

3. **Approve:** 
   - ID: "EXP-TEST"
   - License: "LIC-TEST"

4. **Verify:**
   ```bash
   curl http://localhost:3001/api/exporters/EXP-TEST
   ```
   - Look for: `ExporterType` and `LaboratoryCertificateNumber`

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **EXECUTIVE-SUMMARY.md** | High-level overview |
| **QUICK-START-TESTING.md** | 5-min test guide |
| **READY-FOR-TESTING.md** | Full test workflow |
| **DEPLOYMENT-OPTION2-COMPLETE.md** | Deployment details |
| **ALIGNMENT-COMPLETE.md** | Technical specs |

---

## ⚠️ Important Notes

- **Old exporters:** Still work (7 params backward compatible)
- **New exporters:** Use 9 params automatically
- **Environment vars required:**
  - `CORE_CHAINCODE_ID_NAME=coffee:1.3`
  - `CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999`
- **Peer restart needed:** When chaincode container restarts

---

## 📞 Emergency Contacts

**Container Issues:**
```bash
docker stop coffee-chaincode
docker rm coffee-chaincode
.\scripts\deploy-v1.3-option2.ps1
```

**API Issues:**
```bash
# Kill and restart
Get-Process node | Stop-Process -Force
cd api && npm run dev
```

**Full System Restart:**
```bash
docker-compose -f docker-compose-fabric.yml restart
docker start coffee-chaincode
cd api && npm run dev
```

---

## ✅ Pre-Flight Checklist

Before going live:

- [ ] Run `.\scripts\test-v1.3-deployment.ps1` ✅
- [ ] Verify all 5 tests pass ✅
- [ ] Check API health endpoint ✅
- [ ] Test one full registration workflow ✅
- [ ] Verify blockchain storage ✅
- [ ] Brief ECTA admins on new fields ⏳
- [ ] Monitor first 5 real registrations ⏳

---

## 🎯 Success Criteria

✅ Container running  
✅ All peers connected  
✅ API healthy  
✅ 9 parameters aligned  
✅ Database has 2026 columns  
✅ Frontend collects 2026 fields  
✅ Tests passing  

**Status:** 🟢 READY FOR PRODUCTION

---

**Version:** 1.3  
**Deployed:** June 2, 2026  
**Status:** Production Ready  
**Next Review:** July 2, 2026

---

*Keep this card handy for daily operations*
