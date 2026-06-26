# Deploy Audit Trail System - NOW

## One Command Deployment

```powershell
cd C:\CEX
.\DEPLOY.ps1
```

That's it! The script will:
1. ✅ Deploy chaincode v2.1 to all 6 organizations
2. ✅ Restart API server with audit endpoints
3. ✅ Verify deployment automatically
4. ✅ Run test suite

---

## What Gets Deployed

### Blockchain (Chaincode v2.1)
- Complete cryptographic audit trail system
- 15 functions with audit logging:
  - RegisterExporter, ApproveSalesContract, SuspendExporter, RevokeExporterLicense
  - RequestLC, ApproveLC, IssueLC
  - InitiatePayment, SubmitPaymentDocuments, VerifyPaymentDocuments, SettlePayment
  - PerformInspection, ApproveInspection, IssueExportPermit
  - ClearDeclaration

### API Server
- 8 audit REST endpoints
- Certificate-based identity tracking
- Compliance metadata queries

### UI
- AuditTrailViewer component
- Integrated into ExporterPortal
- Timeline, table, and crypto views

---

## Prerequisites

Before running `.\DEPLOY.ps1`:

1. **Docker running**
   ```powershell
   docker ps
   ```

2. **Blockchain network running**
   ```powershell
   docker ps | findstr orderer
   docker ps | findstr peer0
   ```
   If not running:
   ```powershell
   docker-compose -f docker-compose-fabric.yml up -d
   ```

3. **Peer CLI available**
   ```powershell
   peer version
   ```

---

## After Deployment

### Test the System

1. **Check API**
   ```powershell
   curl http://localhost:3001/health
   ```

2. **Register Test Exporter**
   ```powershell
   curl -X POST http://localhost:3001/api/exporters/register `
     -H "Content-Type: application/json" `
     -d '{
       "exporterId": "TEST_AUDIT_001",
       "companyName": "Audit Test Corporation",
       "ectaLicenseNumber": "ECTA2026001",
       "exporterType": "company",
       "capitalRequirement": 500000,
       "professionalTaster": "John Doe",
       "tasterCertificate": "TASTER001",
       "laboratoryCertificateNumber": "LAB001",
       "licenseExpiryDate": "2027-12-31"
     }'
   ```

3. **Check Audit Log**
   ```powershell
   curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_AUDIT_001
   ```

4. **Verify Integrity**
   ```powershell
   curl http://localhost:3001/api/audit/verify/EXPORTER/TEST_AUDIT_001
   ```

### Test in UI

1. Open browser: `http://localhost:3000`
2. Login as exporter
3. Navigate to Exporter Portal
4. Click **"Audit Trail"** button on profile card
5. View your complete audit history

---

## Troubleshooting

### If deployment fails:

**Error: "Package not found"**
```powershell
cd chaincodes\coffee
tar czf coffee-v2.1-complete.tar.gz *.go go.mod go.sum connection.json
```

**Error: "Peer not responding"**
```powershell
docker restart peer0.ecta.cecbs.et
docker restart orderer.cecbs.et
```

**Error: "API not starting"**
```powershell
cd api
npm install
npm start
```

**Error: "Endorsement policy not satisfied"**
- Not all organizations approved
- Run deployment again - it will retry

### Check logs:

```powershell
# API logs
cat api\logs\error.log
cat api\logs\combined.log

# Chaincode logs
docker logs peer0.ecta.cecbs.et --tail 100

# Orderer logs
docker logs orderer.cecbs.et --tail 100
```

---

## Manual Deployment (if script fails)

If `.\DEPLOY.ps1` fails, run each step manually:

### Step 1: Deploy Chaincode
```powershell
.\scripts\deploy-audit-trail-v2.0.ps1
```

### Step 2: Restart API
```powershell
cd api
npm start
# Or with PM2:
pm2 restart api
```

### Step 3: Verify
```powershell
.\scripts\verify-audit-deployment.ps1
```

---

## What You Get

### Cryptographic Audit Trail Features

1. **WHO did it?**
   - MSP ID (organization)
   - X.509 certificate details
   - Certificate hash for identity tracking
   - User email and role

2. **WHAT was done?**
   - Action type (CREATE, APPROVE, SUSPEND, etc.)
   - Entity type (EXPORTER, CONTRACT, LC, PAYMENT, etc.)
   - Status before and after
   - Field-level changes

3. **WHEN did it happen?**
   - Blockchain transaction timestamp
   - Transaction ID
   - Channel ID

4. **WHY was it done?**
   - Reason field
   - Compliance notes

5. **HOW was it changed?**
   - SHA-256 data hashing
   - Hash chain for tamper detection
   - Field change tracking

6. **Compliance tracking**
   - ECTA compliance
   - NBE compliance
   - UCP 600 documentary credit
   - EUDR deforestation
   - ICO standards

### API Endpoints Available

```
GET  /api/audit/:logId
     → Get specific audit log

GET  /api/audit/entity/:entityType/:entityId
     → Get all logs for entity

GET  /api/audit/actor/:certHash
     → Get all actions by identity

GET  /api/audit/timerange?startTime=...&endTime=...
     → Query by date range

GET  /api/audit/verify/:entityType/:entityId
     → Verify audit trail integrity

GET  /api/audit/compliance/ecta/:entityId
     → ECTA compliance logs

GET  /api/audit/compliance/nbe/:entityId
     → NBE compliance logs

GET  /api/audit/compliance/ucp600/:entityId
     → UCP 600 compliance logs
```

---

## Success Criteria

Deployment successful when you see:

```
========================================
DEPLOYMENT COMPLETE!
========================================

SUMMARY:
  ✅ Chaincode v2.1 deployed to blockchain
  ✅ API server restarted with audit routes
  ✅ Verification tests completed
```

---

## Time Estimate

- **Automated deployment**: 15-20 minutes
- **Manual deployment**: 30-45 minutes
- **Verification**: 5 minutes

**Total**: ~20-25 minutes for full deployment

---

## Support

If you encounter issues:

1. Check `api/logs/error.log`
2. Check `docker logs peer0.ecta.cecbs.et`
3. Verify blockchain network is running
4. Ensure all prerequisites are met

---

**Ready? Run this:**

```powershell
cd C:\CEX
.\DEPLOY.ps1
```

**Then test:**

```powershell
curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_001
```

**Done!** 🎉
