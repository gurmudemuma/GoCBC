# 🚨 BLOCKCHAIN TIMEOUT ISSUE - CHAINCODE NOT DEPLOYED

## Problem Summary

The 120-second timeout on exporter approval is caused by **chaincode not being deployed** on the Hyperledger Fabric network.

## Root Cause Analysis

✅ **Network Status**: HEALTHY
- All 6 peer nodes running (ECTA, NBE, ECX, Banks, Customs, Shipping)
- Orderer node running
- Network connectivity established
- All peers accessible on their ports

❌ **Chaincode Status**: NOT DEPLOYED
- No chaincode containers running (`dev-peer*` containers missing)
- API successfully connects to network but chaincode invocation fails
- Error: "Endorsement has failed" - indicates chaincode not instantiated

## Evidence from Logs

```
Error: No valid responses from any peers. Errors:
    peer=undefined, status=grpc, message=Endorsement has failed
```

```bash
$ docker ps --filter "name=dev-peer"
NAMES     STATUS
# Empty - no chaincode containers
```

## Impact

All blockchain operations timeout after 120 seconds:
- ❌ Exporter approval (Register Exporter)
- ❌ Contract registration
- ❌ Shipment creation
- ❌ Quality approvals
- ❌ Document anchoring

## Solution Options

### Option 1: Deploy Chaincode Manually (Hyperledger Fabric 2.x)

If you have the chaincode deployment scripts:

```bash
# 1. Package chaincode
cd chaincodes/coffee
peer lifecycle chaincode package coffee.tar.gz --path . --lang golang --label coffee_1.0

# 2. Install on all peers
export CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051
peer lifecycle chaincode install coffee.tar.gz

export CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051
peer lifecycle chaincode install coffee.tar.gz

# ... repeat for all 6 peers

# 3. Approve chaincode for each org
peer lifecycle chaincode approveformyorg \
  --channelID cecbs-channel \
  --name coffee \
  --version 1.0 \
  --package-id <PACKAGE_ID> \
  --sequence 1

# 4. Commit chaincode
peer lifecycle chaincode commit \
  --channelID cecbs-channel \
  --name coffee \
  --version 1.0 \
  --sequence 1
```

### Option 2: Use Existing Deployment Script

If you have a `deploy-chaincode.sh` or similar script:

```bash
bash deploy-chaincode.sh
```

### Option 3: Restart Network with Chaincode Deployment

If your `docker-compose-fabric.yml` or startup script includes chaincode deployment:

```bash
# Stop network
docker-compose -f docker-compose-fabric.yml down

# Remove volumes (optional, if you want clean slate)
docker volume rm gocbc_orderer.cecbs.et

# Start with chaincode deployment
bash start-blockchain-with-chaincode.sh
```

### Option 4: Temporary Workaround - Skip Blockchain (Development Only)

For testing UI without blockchain, modify `api/src/routes/exporters.ts`:

```typescript
// TEMPORARY: Comment out blockchain call for testing
const result = {
  success: true,
  txId: 'MOCK-TX-' + Date.now(),
  message: 'Blockchain skipped for testing'
};

// const result = await fabricService.registerExporter(...);
```

⚠️ **This is NOT recommended for production** - only use for UI testing.

## Verification

After deploying chaincode, verify it's running:

```bash
# Check chaincode containers
docker ps --filter "name=dev-peer"

# Should see containers like:
# dev-peer0.ecta.cecbs.et-coffee_1.0-xxxxx
# dev-peer0.nbe.cecbs.et-coffee_1.0-xxxxx
# ... (6 total, one per peer)
```

Test blockchain connectivity:

```bash
cd api
node -e "
const { FabricService } = require('./dist/services/fabricService');
const fabric = FabricService.getInstance();
fabric.testConnection().then(result => {
  console.log('Blockchain test:', result);
  process.exit(result.success ? 0 : 1);
});
"
```

## Expected Behavior After Fix

Once chaincode is deployed:
1. Exporter approval should complete in **5-15 seconds**
2. No more 120-second timeouts
3. Blockchain transaction IDs returned in responses
4. Chaincode containers visible in `docker ps`

## Next Steps

1. ✅ **Fix Applied**: Increased timeout to 120 seconds (done)
2. ❌ **Pending**: Deploy chaincode to blockchain network
3. ⏳ **Then**: Test exporter approval workflow

---

## Quick Reference

**Check if chaincode is deployed:**
```bash
docker ps --filter "name=dev-peer" --format "table {{.Names}}\t{{.Status}}"
```

**Check API logs for blockchain errors:**
```bash
tail -f c:/goCBC/logs/api.log | grep -i "chaincode\|endorsement"
```

**Blockchain network status:**
```bash
docker ps --filter "name=peer\|orderer" --format "table {{.Names}}\t{{.Status}}"
```

