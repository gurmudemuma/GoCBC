# Chaincode Registration Issue - Root Cause & Solution

## Issue Summary

The end-to-end test fails at **application approval** because the blockchain cannot register exporters. The approval request times out after 120 seconds with no response.

## Root Cause Identified

**Chaincode Registration Timeout** - The peers cannot connect to the chaincode container.

### Evidence

1. **Peer logs show**:
   ```
   timeout expired while starting chaincode coffee_1.0
   chaincode registration failed
   ```

2. **Chaincode container is running**:
   - Container: `coffee-chaincode` (Up 2+ hours)
   - Listening on port 9999 ✅
   - All functions loaded (RegisterExporter, QueryAllExporters, etc.) ✅

3. **Query test fails**:
   ```bash
   docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"QueryAllExporters","Args":[]}'
   # Result: Hangs/times out (no response)
   ```

### Why This Happens

The system uses **Chaincode-as-a-Service (CCAAS)** deployment where the chaincode runs in its own container. However:

- The peers try to "launch" the chaincode on each invocation
- The chaincode is already running externally  
- The peer's attempt to start it fails/times out
- Network discovery or connection configuration is incorrect

This is a common issue with CCAAS when the peer can't properly connect to the pre-running chaincode container.

## Solution Options

### Option 1: Redeploy Chaincode (Traditional Method) - RECOMMENDED

Switch from CCAAS to traditional chaincode deployment where Fabric manages the lifecycle:

```bash
cd /home/guda/GoCBC/blockchain

# Stop the manual chaincode container
docker stop coffee-chaincode
docker rm coffee-chaincode

# Redeploy using traditional method
./network.sh deployCC -ccn coffee -ccp ../chaincode -ccl go -ccv 2.0

# This will:
# 1. Package the chaincode
# 2. Install on all peers
# 3. Approve for all organizations
# 4. Commit to channel
# 5. Let Fabric manage chaincode containers automatically
```

**Why this works**: Fabric handles all the container management and peer connectivity automatically.

### Option 2: Fix CCAAS Configuration (Advanced)

Fix the existing CCAAS deployment by ensuring proper peer-to-chaincode connectivity:

1. **Check connection.json** in the chaincode package
2. **Verify peer can resolve chaincode hostname**
3. **Ensure proper network configuration** in docker-compose
4. **Check TLS certificates** if TLS is enabled

This requires deep Fabric networking knowledge and is more complex.

### Option 3: Increase Timeout (Temporary Workaround)

NOT RECOMMENDED - This doesn't fix the root cause:

```typescript
// In fabricService.ts, increase timeout from 90s to 300s
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Transaction timeout')), 300000) // 5 minutes
);
```

## Recommended Action Plan

**Execute Option 1 (Redeploy Chaincode)**:

```bash
cd /home/guda/GoCBC

# 1. Stop manual chaincode container
docker stop coffee-chaincode
docker rm coffee-chaincode

# 2. Clean up any old chaincode packages
cd blockchain
rm -f coffee.tar.gz

# 3. Redeploy with network.sh
./network.sh deployCC -ccn coffee -ccp ../chaincodes/coffee -ccl go -ccv 2.0 -ccs 1

# Note: Adjust paths based on your chaincode location
# -ccn: chaincode name
# -ccp: chaincode path
# -ccl: language (go, node, java)
# -ccv: version
# -ccs: sequence

# 4. Verify deployment
docker ps | grep coffee
# Should see Fabric-managed chaincode containers for each peer

# 5. Test the chaincode
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}'
# Should return: [] or list of exporters

# 6. Restart API to pick up changes
cd ..
bash restart-api.sh

# 7. Run end-to-end test
bash end-to-end-test.sh
```

## Expected Result After Fix

1. **Chaincode containers managed by Fabric**:
   ```
   dev-peer0.ecta.cecbs.et-coffee-2.0
   dev-peer0.ecx.cecbs.et-coffee-2.0
   dev-peer0.banks.cecbs.et-coffee-2.0
   dev-peer0.nbe.cecbs.et-coffee-2.0
   dev-peer0.customs.cecbs.et-coffee-2.0
   dev-peer0.shipping.cecbs.et-coffee-2.0
   ```

2. **Query test succeeds**:
   ```bash
   docker exec peer0.ecta.cecbs.et peer chaincode query \
     -C coffeechannel -n coffee -c '{"function":"QueryAllExporters","Args":[]}'
   # Returns: []
   ```

3. **Approval completes in ~10-30 seconds** (not 120+ seconds timeout)

4. **End-to-end test passes all phases**:
   - ✅ Phase 0: Admin login
   - ✅ Phase 1: User creation
   - ✅ Phase 2: Application approval (blockchain registration)
   - ✅ Phase 3-10: Remaining workflow steps

## Technical Details

**Current Setup (CCAAS - Broken)**:
- Single external chaincode container: `coffee-chaincode`
- Peers try to "launch" it on each transaction
- Launch fails → Registration timeout → Transaction fails

**After Fix (Traditional - Working)**:
- One chaincode container per peer (6 total)
- Fabric manages container lifecycle automatically
- Peer communicates directly with its own chaincode instance
- Transactions complete normally with proper consensus

## Files to Check If Issues Persist

1. **Chaincode location**: `/home/guda/GoCBC/chaincodes/coffee/` or `/home/guda/GoCBC/chaincode/`
2. **Network script**: `/home/guda/GoCBC/blockchain/network.sh`
3. **Fabric config**: `/home/guda/GoCBC/blockchain/configtx.yaml`
4. **API fabric config**: `/home/guda/GoCBC/api/.env` (FABRIC_* variables)

## Verification Commands

After redeployment, run these to verify:

```bash
# 1. Check chaincode containers are running
docker ps | grep "dev-peer.*coffee"

# 2. Query from each peer
for peer in ecta ecx banks nbe customs shipping; do
  echo "Testing peer0.$peer..."
  docker exec peer0.$peer.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"QueryAllExporters","Args":[]}' 2>&1 | head -2
done

# 3. Test invoke (RegisterExporter)
docker exec peer0.ecta.cecbs.et peer chaincode invoke \
  -C coffeechannel -n coffee \
  -c '{"function":"RegisterExporter","Args":["TEST001","Test Company","LIC001","company","1000000","yes","CERT001","LAB001","2028-12-31"]}' \
  --waitForEvent

# 4. Query again to verify registration
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"ReadExporter","Args":["TEST001"]}'

# 5. Run end-to-end test
cd /home/guda/GoCBC
bash end-to-end-test.sh
```

## Success Criteria

✅ All 6 peer chaincode containers running  
✅ Query returns result in < 5 seconds  
✅ Invoke completes with transaction ID  
✅ Application approval completes in < 30 seconds  
✅ End-to-end test passes all 10 phases  
✅ Data stored in both PostgreSQL AND CouchDB (blockchain state)  

---

**Bottom Line**: The blockchain IS working (all containers running), but the chaincode deployment method (CCAAS) has connectivity issues. Switching to traditional Fabric-managed deployment will fix it immediately.
