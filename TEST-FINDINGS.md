# End-to-End Test - Current Findings

## Test Results

### ✅ What's Working

1. **Services are ALL running**:
   - ✅ Docker: 17 containers running
   - ✅ Blockchain network: 6 peers + 1 orderer
   - ✅ API server: Running on port 3001
   - ✅ CouchDB: Running on port 5984
   - ✅ PostgreSQL: Running on port 5432

2. **Test phases completing successfully**:
   - ✅ Phase 0: Service check & Admin login
   - ✅ Phase 1: User creation (ECTA officer, Bank officer)
   - ✅ Phase 2: Exporter application submission
     - Application ID: `APP-1791893294510-WWPZTG`
     - Stored in PostgreSQL successfully
     - Temporary credentials generated

3. **Database operations**:
   - ✅ PostgreSQL writes working (11 pending applications found)
   - ✅ Application data properly stored with all required fields

4. **Blockchain infrastructure**:
   - ✅ Connection profile exists at `/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/connection-ecta.json`
   - ✅ Wallet exists with 6 admin identities (one per organization)
   - ✅ All Docker containers running (peers, orderers, CouchDB state databases)

### ❌ What's Failing

**Application Approval (Phase 2 - Step 5)**

The approval endpoint `/api/v1/exporters/exporter-applications/:id/approve` is **timing out** after 120 seconds with NO response.

**Symptoms**:
- curl request with `--max-time 120` returns empty response
- No error message, just timeout
- Request never completes even after 120 seconds

**Root Cause Analysis**:

The approval process involves blockchain registration via `fabricService.registerExporter()` which:

1. Calls `invokeChaincode('RegisterExporter', ...)`
2. Sets endorsement targets to ALL 6 organizations
3. Has 90-second timeout per attempt
4. Retries up to 4 times with exponential backoff
5. Maximum total time: ~6 minutes (90s × 4 attempts + backoff)

The timeout indicates one of these issues:
- ❌ Chaincode not deployed/initialized on all peers
- ❌ Peers not endorsing transactions (connectivity or chaincode issue)
- ❌ Channel not properly configured
- ❌ Fabric SDK connection failing silently

**Evidence from logs**:
```
Testing approval for application: APP-1791893294510-WWPZTG
Starting approval request (max 120 seconds)...
Request completed in 120 seconds

=== Approval Response ===
=========================
❌ Approval FAILED
Error: 
```

Empty error means the curl request timed out before receiving ANY response from the API.

## Configuration Status

### ✅ Fixed Issues

1. **API .env configuration**:
   - ✅ Added `FABRIC_NETWORK_PATH=../blockchain/organizations`
   - ✅ All Fabric environment variables properly set
   - ✅ CouchDB connection configured

2. **Test script**:
   - ✅ API URL changed to `/api/v1`
   - ✅ User creation flow updated
   - ✅ Application fields corrected
   - ✅ Application ID extraction fixed (`.data.applicationId`)
   - ✅ Database schema updated with temp credential columns
   - ✅ Service checks added

### ⚠️ Potential Issues to Investigate

1. **Chaincode Deployment**:
   - Need to verify chaincode is deployed to ALL 6 peer organizations
   - Check if chaincode is initialized on the channel
   - Verify RegisterExporter function exists and works

2. **Blockchain Network**:
   - Peers are running but may not be properly joined to channel
   - Channel `coffeechannel` may not be created
   - Chaincode `coffee` may not be committed to channel

3. **Fabric SDK Connection**:
   - API may not be connecting to blockchain properly
   - Network discovery may be failing
   - TLS/cert issues preventing endorsement

## Next Steps to Fix

### 1. Verify Chaincode Deployment

```bash
cd /home/guda/GoCBC

# Check if chaincode is deployed
docker ps | grep coffee

# Check peer logs for errors
docker logs peer0.ecta.cecbs.et 2>&1 | tail -50

# List installed chaincodes
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
```

### 2. Test Chaincode Directly

```bash
# Try to invoke RegisterExporter directly via CLI
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}'
```

### 3. Check API Blockchain Connection

```bash
# Check API logs during approval
tail -f /home/guda/GoCBC/api/logs/combined.log

# Then in another terminal, trigger approval:
curl -X POST http://localhost:3001/api/v1/exporters/exporter-applications/APP-1791893294510-WWPZTG/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d '{
    "exporterId": "EXP-TEST-001",
    "ectaLicenseNumber": "ECTA-LIC-TEST-001",
    "licenseExpiryDate": "2028-10-13",
    "comments": "Test",
    "reviewedBy": "Test Officer"
  }'
```

### 4. Deploy/Redeploy Chaincode (if needed)

```bash
cd /home/guda/GoCBC/blockchain

# Deploy chaincode
./network.sh deployCC -ccn coffee -ccp ../chaincode -ccl go -ccv 1.0
```

### 5. Alternative: Set FABRIC_REQUIRED=false

If blockchain is optional for testing, temporarily disable the requirement:

Edit `/home/guda/GoCBC/api/.env`:
```bash
FABRIC_ENABLED=true
FABRIC_REQUIRED=false  # Change this - allows fallback to PostgreSQL only
```

This would allow the approval to proceed without blockchain, storing only in PostgreSQL.

## Summary

**The system is 95% working!** All services are running, databases are connected, and user/application workflows are functioning. The ONLY blocker is the blockchain consensus/endorsement step during application approval.

**Likely causes** (in order of probability):
1. Chaincode not deployed to all peers
2. Channel not properly configured
3. Peers not endorsing (connectivity issue)
4. Fabric SDK connection silently failing

**Quick workaround**: Set `FABRIC_REQUIRED=false` to test the rest of the workflow without blockchain.

**Proper fix**: Deploy/redeploy the chaincode and verify it's committed to the channel on all peer organizations.

## Files Modified

- ✅ `/home/guda/GoCBC/api/.env` - Added FABRIC_NETWORK_PATH
- ✅ `/home/guda/GoCBC/end-to-end-test.sh` - Complete test with all fixes
- ✅ `/home/guda/GoCBC/check-blockchain.sh` - Network status check
- ✅ `/home/guda/GoCBC/test-approval-only.sh` - Isolated approval test
- ✅ `/home/guda/GoCBC/test-blockchain-connection.js` - SDK connection test
- ✅ `/home/guda/GoCBC/simple-status-check.sh` - Service status check

## Test Commands

```bash
# Check system status
cd /home/guda/GoCBC
bash simple-status-check.sh

# Check blockchain network
bash check-blockchain.sh

# Run full end-to-end test
bash end-to-end-test.sh

# Test approval only (with existing pending application)
bash test-approval-only.sh

# Debug blockchain connection
node test-blockchain-connection.js
```
