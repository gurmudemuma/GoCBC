# Quick Deployment Guide - Audit Trail v2.0

**Target**: Deploy cryptographic audit trail to CECBS blockchain  
**Time**: 30-60 minutes  
**Status**: Code compiled, ready to deploy

---

## Prerequisites Check

```powershell
# 1. Docker running?
docker ps

# 2. Blockchain network running?
docker ps | findstr orderer
docker ps | findstr peer0

# 3. Peer CLI available?
peer version

# 4. In project root?
cd C:\CEX
```

If blockchain not running:
```powershell
docker-compose -f docker-compose-fabric.yml up -d
```

---

## Option 1: Full Automated Deployment (RECOMMENDED)

Run the full deployment script:

```powershell
cd C:\CEX
.\scripts\deploy-audit-trail-v2.0.ps1
```

**What it does**:
1. Verifies prerequisites
2. Installs on all 6 peers (ECTA, NBE, Banks, Customs, ECX, Shipping)
3. Approves for all 6 organizations
4. Checks commit readiness
5. Commits to channel
6. Verifies deployment

**Time**: 10-15 minutes

**If it fails**, see troubleshooting section below.

---

## Option 2: Step-by-Step Manual Deployment

For more control or troubleshooting:

```powershell
cd C:\CEX
.\scripts\deploy-simple.ps1
```

This walks through each step with pauses.

### Then complete remaining orgs:

```powershell
# Set environment for each org and repeat:
# NBE
$env:CORE_PEER_ADDRESS = "peer0.nbe.cecbs.et:8051"
$env:CORE_PEER_LOCALMSPID = "NBEMSP"
$env:CORE_PEER_TLS_ROOTCERT_FILE = ".\blockchain\organizations\peerOrganizations\nbe.cecbs.et\peers\peer0.nbe.cecbs.et\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = ".\blockchain\organizations\peerOrganizations\nbe.cecbs.et\users\Admin@nbe.cecbs.et\msp"

# Install
peer lifecycle chaincode install .\chaincodes\coffee\coffee-v2.0-ccaas.tar.gz

# Approve (get PACKAGE_ID from chaincodes/coffee/package-id.txt)
$PACKAGE_ID = Get-Content .\chaincodes\coffee\package-id.txt
peer lifecycle chaincode approveformyorg `
  --channelID coffeechannel `
  --name coffee `
  --version 2.0 `
  --package-id $PACKAGE_ID `
  --sequence 2 `
  --tls `
  --cafile .\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem

# Repeat for Banks, Customs, ECX, Shipping
```

### Check commit readiness:

```powershell
peer lifecycle chaincode checkcommitreadiness `
  --channelID coffeechannel `
  --name coffee `
  --version 2.0 `
  --sequence 2 `
  --tls `
  --cafile .\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem `
  --output json
```

**Expected**: All 6 orgs show `true`

### Commit:

```powershell
# Run the full deploy script which will handle commit
.\scripts\deploy-audit-trail-v2.0.ps1 -SkipInstall -SkipApprove
```

---

## Option 3: Docker-based Deployment

If peer CLI not working in PowerShell:

```powershell
# Use ECTA peer container
docker exec -it peer0.ecta.cecbs.et bash

# Inside container:
cd /opt/gopath/src/github.com/hyperledger/fabric/peer
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp

# Copy package into container first (from host):
docker cp chaincodes/coffee/coffee-v2.0-ccaas.tar.gz peer0.ecta.cecbs.et:/tmp/

# Install
peer lifecycle chaincode install /tmp/coffee-v2.0-ccaas.tar.gz

# Approve
peer lifecycle chaincode approveformyorg \
  --channelID coffeechannel \
  --name coffee \
  --version 2.0 \
  --package-id <PACKAGE_ID> \
  --sequence 2 \
  --tls \
  --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Repeat for other peers
```

---

## Post-Deployment Steps

### 1. Verify Deployment

```powershell
.\scripts\verify-audit-deployment.ps1
```

This will:
- Check chaincode is deployed
- Test API endpoints
- Create test exporter
- Verify audit log created
- Check audit trail integrity

### 2. Restart API Server

```powershell
cd api

# Stop existing
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Start
npm start
```

Or with PM2:
```powershell
pm2 restart api
# or
pm2 restart all
```

### 3. Test Manually

```powershell
# Register exporter
curl -X POST http://localhost:3001/api/exporters/register `
  -H "Content-Type: application/json" `
  -d '{
    "exporterId": "TEST_001",
    "companyName": "Test Corp",
    "ectaLicenseNumber": "ECTA2026001",
    "exporterType": "company",
    "capitalRequirement": 500000,
    "professionalTaster": "John Doe",
    "tasterCertificate": "TASTER001",
    "laboratoryCertificateNumber": "LAB001",
    "licenseExpiryDate": "2027-12-31"
  }'

# Check audit log
curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_001

# Verify integrity
curl http://localhost:3001/api/audit/verify/EXPORTER/TEST_001
```

---

## Troubleshooting

### Error: "Package ID not found"

```powershell
# Query installed chaincodes
peer lifecycle chaincode queryinstalled

# Look for: Package ID: coffee_2.0:xxxxx
# Copy the full package ID and use it in approve command
```

### Error: "Endorsement policy not satisfied"

Not all orgs have approved. Check:
```powershell
peer lifecycle chaincode checkcommitreadiness `
  --channelID coffeechannel `
  --name coffee `
  --version 2.0 `
  --sequence 2
```

Install and approve on missing orgs.

### Error: "Chaincode already committed"

Already deployed! Check version:
```powershell
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee
```

If v2.0 is there, you're done. Skip to verification.

### Error: "Peer CLI not found"

Install Fabric binaries:
```powershell
# Download from: https://github.com/hyperledger/fabric/releases
# Extract to: C:\fabric\bin
# Add to PATH: $env:Path += ";C:\fabric\bin"
```

Or use Docker exec method (Option 3 above).

### Error: "Cannot connect to peer"

Check peer is running:
```powershell
docker ps | findstr peer0.ecta
docker logs peer0.ecta.cecbs.et --tail 50
```

Restart peer if needed:
```powershell
docker restart peer0.ecta.cecbs.et
```

### Error: "TLS certificate not found"

Check paths in environment variables:
```powershell
# Should point to actual files:
Test-Path $env:CORE_PEER_TLS_ROOTCERT_FILE
Test-Path $env:CORE_PEER_MSPCONFIGPATH

# If false, fix paths in script
```

### API endpoint returns 404

API server not restarted:
```powershell
cd api
npm start
```

Check routes loaded:
```powershell
# In api/src/server.ts, verify:
import auditRoutes from './routes/audit';
app.use('/api/audit', auditRoutes);
```

---

## Verification Checklist

After deployment, verify:

- [ ] Chaincode v2.0 shows in `peer lifecycle chaincode querycommitted`
- [ ] API server responds to `http://localhost:3001/health`
- [ ] Audit endpoint exists: `curl http://localhost:3001/api/audit/TEST_123` (should return error, not 404 route)
- [ ] Can register exporter
- [ ] Audit log appears: `curl http://localhost:3001/api/audit/entity/EXPORTER/...`
- [ ] Audit log has:
  - `actionType`: "CREATE"
  - `signature.caller.mspId`: Set (e.g., "ECTAMSP")
  - `signature.caller.certificateHash`: Set (SHA-256 hash)
  - `complianceData`: All fields present
  - `changes`: Array of field changes
- [ ] Integrity verification works: `curl http://localhost:3001/api/audit/verify/...`
- [ ] Returns: `{"valid": true, "message": "..."}`

---

## Success Indicators

**Deployment successful when**:
1. ✅ `peer lifecycle chaincode querycommitted` shows v2.0, sequence 2
2. ✅ All 6 orgs appear in commitment
3. ✅ API audit endpoints respond (not 404)
4. ✅ Test exporter registration creates audit log
5. ✅ Audit log contains cryptographic signature
6. ✅ Integrity verification returns `valid: true`

**You'll see**:
```json
{
  "logId": "AUDIT_EXPORTER_TEST_001_txid123",
  "actionType": "CREATE",
  "entityType": "EXPORTER",
  "entityId": "TEST_001",
  "signature": {
    "caller": {
      "mspId": "ECTAMSP",
      "certificateHash": "a1b2c3d4...",
      ...
    },
    "transactionId": "abcdef123456...",
    ...
  },
  "statusBefore": "",
  "statusAfter": "ACTIVE",
  "complianceData": {
    "ectaCompliance": true,
    "nbeCompliance": false,
    ...
  },
  ...
}
```

---

## Next Steps After Successful Deployment

1. **Add remaining audit logging** (9 functions still need it)
   - See `DEPLOYMENT-CHECKLIST.md` Phase 5
   
2. **Integrate UI component**
   - Add `AuditTrailViewer` to portals
   - See `DEPLOYMENT-CHECKLIST.md` Phase 4

3. **Comprehensive testing**
   - Full workflow with audit verification
   - See `DEPLOYMENT-CHECKLIST.md` Phase 6

4. **Production hardening**
   - Role-based access control
   - Audit log retention policy
   - Performance optimization

---

## Quick Command Reference

```powershell
# Check deployment status
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee

# Check installed packages
peer lifecycle chaincode queryinstalled

# View peer logs
docker logs peer0.ecta.cecbs.et --tail 100 -f

# Restart peer
docker restart peer0.ecta.cecbs.et

# Test API
curl http://localhost:3001/health
curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_001

# Check API logs
cat api\logs\error.log
cat api\logs\combined.log
```

---

## Help & Support

**Files**:
- Full checklist: `DEPLOYMENT-CHECKLIST.md`
- Implementation summary: `AUDIT-IMPLEMENTATION-SUMMARY.md`
- Detailed status: `AUDIT-TRAIL-DEPLOYMENT-STATUS.md`

**Scripts**:
- `scripts/deploy-audit-trail-v2.0.ps1` - Full automated deployment
- `scripts/deploy-simple.ps1` - Step-by-step with pauses
- `scripts/verify-audit-deployment.ps1` - Post-deployment verification

**Issues**:
- Check `api/logs/error.log`
- Check `docker logs peer0.ecta.cecbs.et`
- Check chaincode logs: `docker logs <chaincode-container>`

---

**Time Estimate**:
- Automated deploy: 10-15 min
- Manual deploy: 30-45 min
- Verification: 5-10 min
- **Total**: 30-60 min

**Current Status**: Ready to deploy. Package created, code compiled.

**One Command to Deploy**:
```powershell
cd C:\CEX
.\scripts\deploy-audit-trail-v2.0.ps1
```

Then verify:
```powershell
.\scripts\verify-audit-deployment.ps1
```

**Done!** 🎉
