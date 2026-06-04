# Chaincode v1.4 Deployment Status
**Date:** June 4, 2026  
**Status:** Container Running - Peers Need Update  
**Action Required:** Install, approve, and commit on all peers

---

## ✅ Completed Steps

### 1. **Built Chaincode v1.4**
All 6 modules compiled successfully:
- `main.go` - ECTA, Contracts, Shipments
- `banking.go` - LC & Payments (18 functions)
- `forex.go` - NBE Forex Management (16 functions)
- `customs.go` - Customs Declarations (8 functions)
- `payment.go` - SWIFT Payment Processing (11 functions)
- `ecx.go` - ECX Lot Management (6 functions)

**Total:** 62+ functions across 6 organizations

### 2. **Docker Image Created**
- Image: `coffee-chaincode:1.4`
- Built for Linux (alpine:3.18)
- Compiled binary: `chaincode-linux`

### 3. **Container Started**
```
Container ID: e25483260ca7
Status: Up and running
Network: cecbs-network
Port: 9999 (exposed)
CCID: coffee_1.4:20260604144759
```

**Logs:**
```
2026/06/04 11:48:20 Starting Coffee Chaincode - CCID: coffee_1.4:20260604144759, Address: 0.0.0.0:9999
2026/06/04 11:48:27 Starting chaincode server on 0.0.0.0:9999
```

✅ Chaincode server is running and listening on port 9999

---

## ⚠️ Current Issue

**Problem:** Peers are still using old chaincode version (v1.2 or v1.3) and timing out on queries.

**Reason:** The new chaincode v1.4 container is running, but the Fabric network hasn't been updated to use it. The peers need to:
1. Install the v1.4 external chaincode package
2. Approve the new chaincode definition
3. Commit the new definition to the channel

**Evidence:**
- Chaincode container shows no query activity in logs
- API queries timeout after 30 seconds
- Peers still reference old chaincode version

---

## 🔧 Next Steps to Complete Deployment

### Option 1: Full Deployment (Recommended)

Run the complete deployment script that will:
1. Create external chaincode package
2. Install on all 6 peers
3. Approve for all 6 organizations
4. Commit to channel

```powershell
.\scripts\deploy-v1.4-complete.ps1
```

### Option 2: Manual Deployment

If the automated script fails, follow these manual steps:

#### Step 1: Create External Chaincode Package
```powershell
# Already created at: chaincodes/coffee/coffee-v14-external.tar.gz
# Or create manually:
cd chaincodes/coffee
mkdir -p package-v14/code

# Create connection.json
@{address="coffee-chaincode:9999"; dial_timeout="10s"; tls_required=$false} | ConvertTo-Json | Out-File package-v14/code/connection.json -Encoding ASCII

# Create metadata.json
@{type="external"; label="coffee_1.4"} | ConvertTo-Json | Out-File package-v14/metadata.json -Encoding ASCII

# Package
cd package-v14
tar -czf ../coffee-v14-external.tar.gz metadata.json code/
cd ../..
```

#### Step 2: Install on All Peers
```bash
# For each organization (ecta, ecx, banks, nbe, customs, shipping):
docker cp chaincodes/coffee/coffee-v14-external.tar.gz peer0.ecta.cecbs.et:/tmp/
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee-v14-external.tar.gz

# Get package ID from output
```

#### Step 3: Approve for Each Organization
```bash
export PACKAGE_ID="coffee_1.4:<hash_from_install>"

# For each org:
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version 1.4 \
  --package-id $PACKAGE_ID \
  --sequence 4 \
  --tls \
  --cafile /path/to/orderer/ca.crt
```

#### Step 4: Commit to Channel
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version 1.4 \
  --sequence 4 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /path/to/peer/ca.crt \
  [... repeat for all 6 peers ...]
  --tls \
  --cafile /path/to/orderer/ca.crt
```

---

## 📋 Verification Steps

After deployment, verify everything works:

### 1. Check Chaincode Container Logs
```powershell
docker logs coffee-chaincode -f
```
You should see incoming requests from peers.

### 2. Query Chaincode from Peer
```bash
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}'
```

### 3. Test API Endpoint
```powershell
curl http://localhost:3001/api/exporters
```

### 4. Check Committed Chaincode
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  -C coffeechannel \
  -n coffee
```

Should show version 1.4, sequence 4.

---

## 🎯 Expected Behavior After Deployment

### Working Queries
- ✅ `QueryAllExporters` - Returns all registered exporters
- ✅ `QueryAllContracts` - Returns all sales contracts
- ✅ `QueryAllAssets` - Returns all shipments
- ✅ `QueryAllContracts` - Returns LCs, forex, payments
- ✅ All v1.4 functions accessible

### Performance
- Query response time: < 2 seconds (was timing out at 30s)
- Chaincode container shows activity in logs
- No more REQUEST TIMEOUT errors

### API Functionality
All portal queries should work:
- ECTA Portal: Exporter management
- NBE Portal: Forex allocation, exchange rates
- Banks Portal: LC management, SWIFT payments
- Customs Portal: Export declarations
- ECX Portal: Lot management
- Shipping Portal: Bill of Lading tracking

---

## 🐛 Troubleshooting

### Issue: Package Install Fails
**Error:** "ACL check failed"
**Solution:** Ensure you're using Admin@org MSP credentials

### Issue: Approval Fails
**Error:** "Package ID not found"
**Solution:** Run `queryinstalled` to get correct package ID

### Issue: Commit Fails
**Error:** "Not enough endorsements"
**Solution:** Ensure all 6 orgs have approved

### Issue: Queries Still Timeout
**Possible Causes:**
1. Chaincode not committed (check with `querycommitted`)
2. Container not accessible from peers (check network)
3. Wrong CCID in container (restart with correct CCID)

---

## 📊 Current System State

### Containers
- ✅ `coffee-chaincode:1.4` - Running (port 9999)
- ✅ All 6 peer containers - Running
- ✅ Orderer container - Running
- ✅ API container - Running

### Chaincode Status
- **v1.2:** Previously active (9 params for RegisterExporter)
- **v1.3:** Container was running but not connected
- **v1.4:** Container running, awaiting peer installation ⚠️

### Network
- Network: `cecbs-network`
- Chaincode accessible at: `coffee-chaincode:9999`
- All peers on same network ✅

---

## 📚 Related Files

- **Chaincode Source:** `chaincodes/coffee/*.go`
- **Docker Image:** `coffee-chaincode:1.4`
- **Deployment Scripts:**
  - `scripts/deploy-v1.4-complete.ps1` - Full automated deployment
  - `scripts/upgrade-to-v1.4-simple.ps1` - Container rebuild only
- **Documentation:**
  - `Docs/CHAINCODE-V1.4-IMPLEMENTATION-COMPLETE.md` - Implementation details
  - `Docs/CHAINCODE-V1.3-STATUS.md` - Previous version status

---

## 🎉 Summary

**Current State:**
- Chaincode v1.4 **built** ✅
- Docker image **created** ✅
- Container **running** ✅
- External chaincode **NOT installed** on peers ❌
- Queries **timing out** ❌

**Required Action:**
Run `.\scripts\deploy-v1.4-complete.ps1` to install, approve, and commit v1.4 to all peers.

**After Deployment:**
- All 62+ v1.4 functions will be available
- Query timeouts will be resolved
- Full CECBS functionality across all 6 organizations

---

**Deployment Date:** June 4, 2026  
**Version:** 1.4  
**Status:** Pending Peer Installation
