# Deploy Blockchain Audit Logs - Quick Guide

## Prerequisites
✅ All audit logs implemented (18/18 operations)  
✅ Chaincode builds successfully  
✅ Blockchain network running  
✅ All 7 organizations' peers online

## Step 1: Verify Current Status

```bash
cd chaincodes/coffee

# Verify build
go build
echo "Exit code: $?"

# Check current version
ls -la coffee_*.tgz | tail -3
```

Expected: Exit code 0, last version is coffee_1.59.tgz

---

## Step 2: Start Blockchain Network (if not running)

```bash
cd /c/goCBC

# Start Fabric network
docker-compose -f docker-compose-fabric.yml up -d

# Wait for network to stabilize (30 seconds)
sleep 30

# Verify all peers are running
docker ps | grep peer0
```

Expected: 7 peers running (exporters, banks, nbe, customs, shipping, ecx, ecta)

---

## Step 3: Deploy New Chaincode

```bash
cd /c/goCBC

# Run deployment script
bash deploy-chaincode.sh

# This script will:
# 1. Package chaincode as coffee_1.79.tgz
# 2. Install on all 7 organization peers
# 3. Approve for all organizations
# 4. Commit to channel
# 5. Initialize new version
```

**Expected Duration:** 2-3 minutes

**Expected Output:**
```
Packaging chaincode...
Installing chaincode on peer0.exporters...
Installing chaincode on peer0.banks...
Installing chaincode on peer0.nbe...
Installing chaincode on peer0.customs...
Installing chaincode on peer0.shipping...
Installing chaincode on peer0.ecx...
Installing chaincode on peer0.ecta...
Approving chaincode for ExportersMSP...
Approving chaincode for BanksMSP...
...
Committing chaincode to channel...
Chaincode deployed successfully!
```

---

## Step 4: Verify Deployment

```bash
# Check chaincode is instantiated
docker exec cli peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee

# Expected: Version 1.79, Sequence 79
```

---

## Step 5: Test Audit Logs

### Test 1: Exporter Requests Forex
```bash
# Via API
curl -X POST http://localhost:5000/api/forex/request \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP-001",
    "contractId": "CONTRACT-001",
    "amountUSD": "50000",
    "purpose": "Coffee export payment"
  }'

# Check audit log
curl http://localhost:5000/api/audit/FOREX_REQUEST/FOREX-REQ-XXX
```

**Expected Response:**
```json
{
  "auditId": "AUDIT-XXX",
  "action": "REQUEST",
  "entityType": "FOREX_REQUEST",
  "creatorMSPID": "ExportersMSP",
  "creatorCert": "-----BEGIN CERTIFICATE-----\nMIIC...",
  "creatorCommonName": "exporter@exporters.cecbs.et",
  "timestamp": "2025-01-08T..."
}
```

### Test 2: Bank Updates LC Status
```bash
curl -X POST http://localhost:5000/api/banking/lc/LC-001/status \
  -H "Content-Type: application/json" \
  -d '{"newStatus": "APPROVED"}'

# Check audit log
curl http://localhost:5000/api/audit/LC/LC-001
```

**Expected:** `creatorMSPID: "BanksMSP"`

### Test 3: NBE Sets Exchange Rate
```bash
curl -X POST http://localhost:5000/api/forex/exchange-rate \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "buyingRate": "56.50",
    "sellingRate": "57.50"
  }'

# Check audit log
curl http://localhost:5000/api/audit/EXCHANGE_RATE/RATE-XXX
```

**Expected:** `creatorMSPID: "NBEMSP"`

---

## Step 6: Verify Multi-Organization Capture

```bash
# Query all audit logs
curl http://localhost:5000/api/audit/all?limit=50

# Verify you see logs from all organizations:
# - ExportersMSP
# - BanksMSP
# - NBEMSP
# - CustomsMSP
# - ShippingMSP
# - ECXMSP
# - ECTAMSP
```

---

## Step 7: Check UI Display

1. Open browser: http://localhost:3000
2. Login as any user
3. Navigate to a shipment or contract
4. Scroll to "Blockchain Signatures" section
5. Verify you see:
   - Issuer organization (e.g., "ExportersMSP CA")
   - Subject DN
   - Serial number
   - Validity period
   - Signature algorithm

---

## Rollback Plan (if needed)

If deployment fails or issues arise:

```bash
# Revert to previous version
cd /c/goCBC

# Edit deploy-chaincode.sh and change version to 1.59
sed -i 's/VERSION=1.79/VERSION=1.59/g' deploy-chaincode.sh

# Redeploy
bash deploy-chaincode.sh
```

---

## Troubleshooting

### Issue: Peer command not found
**Solution:** 
```bash
# Add Fabric binaries to PATH
export PATH=/c/goCBC/bin:$PATH
```

### Issue: Chaincode already exists
**Solution:** 
```bash
# Increment version in deploy-chaincode.sh
VERSION=1.80
```

### Issue: Endorsement policy failure
**Solution:** 
```bash
# Check all organization peers are online
docker ps | grep peer0

# Restart failed peers
docker restart peer0.organizationname.cecbs.et
```

### Issue: Audit logs not showing
**Solution:** 
```bash
# Check chaincode logs
docker logs peer0.exporters.cecbs.et 2>&1 | grep CreateAuditLog

# Verify API is querying blockchain
curl http://localhost:5000/api/audit/SHIPMENT/SHIP-001
```

---

## Success Criteria

- [ ] Chaincode version 1.79 deployed successfully
- [ ] All 7 organization peers have new chaincode
- [ ] Audit logs captured from ExportersMSP
- [ ] Audit logs captured from BanksMSP
- [ ] Audit logs captured from NBEMSP
- [ ] Audit logs captured from CustomsMSP
- [ ] Audit logs captured from ShippingMSP
- [ ] Audit logs captured from ECXMSP
- [ ] Audit logs captured from ECTAMSP
- [ ] X.509 certificates visible in audit logs
- [ ] UI displays blockchain signatures
- [ ] API queries blockchain (PRIMARY) not CouchDB

---

## Post-Deployment Monitoring

### Monitor Chaincode Logs
```bash
# Watch for audit log creation
docker logs -f peer0.exporters.cecbs.et 2>&1 | grep "Audit log created"
```

### Monitor API Logs
```bash
# Watch API queries
cd api
npm run dev
# Look for: "Querying blockchain audit logs for ENTITY_TYPE"
```

### Monitor UI
Open browser console and watch for:
- Blockchain signature API calls
- Identity parsing
- Certificate display

---

## Deployment Timeline

1. **Verify Status** - 2 minutes
2. **Start Network** - 1 minute (if needed)
3. **Deploy Chaincode** - 3 minutes
4. **Verify Deployment** - 1 minute
5. **Test Audit Logs** - 5 minutes
6. **Verify UI** - 2 minutes

**Total:** ~15 minutes

---

## Support

If you encounter issues during deployment:

1. Check `deploy-chaincode.sh` logs
2. Check Docker container logs: `docker logs peer0.exporters.cecbs.et`
3. Verify network connectivity: `docker network ls`
4. Check chaincode package: `tar -tzf chaincodes/coffee/coffee_1.79.tgz`
5. Verify Fabric binaries: `peer version`

---

## Next Steps After Deployment

1. **Test Complete Workflow**
   ```bash
   cd tests
   node test-complete-workflow.js
   ```

2. **Generate Compliance Report**
   - Query audit logs for last 30 days
   - Group by compliance domain (ECTA, NBE, UCP600, EUDR, ICO)
   - Export to PDF

3. **Train Users**
   - Show how to view blockchain signatures
   - Explain X.509 certificate verification
   - Demonstrate non-repudiation proof

4. **Monitor Performance**
   - Query latency for audit logs
   - Storage growth rate
   - API response times

---

**Ready to deploy? Run:** `bash deploy-chaincode.sh`
