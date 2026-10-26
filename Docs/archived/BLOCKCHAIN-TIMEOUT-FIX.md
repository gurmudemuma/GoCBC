# Blockchain Timeout Issue - Diagnosis & Fix

## Current Issue
The Shipping Portal (and all portals) are experiencing timeouts when querying the blockchain:

```
error: [Endorser]: sendProposal[peer0.ecta.cecbs.et] - peer0.ecta.cecbs.et timed out after: 30000
Failed to invoke chaincode: timeout expired while starting chaincode coffee_1.28
```

## Root Cause
The peer is trying to launch chaincode with hash `a94b75399ec6574957be7b04f89264294f1a52e9517a9b0b1ec375595762cd06` but the running chaincode container has hash `47ebc7daa1439cda9b6b12d0e82080f8dfc4474662c573a4273e665a4f6e2cc1`.

This typically happens when:
1. Chaincode was redeployed but peers weren't restarted
2. Chaincode package hash mismatch between what's approved and what's running
3. Network connectivity issues between peers and chaincode container

## Immediate Actions Taken
1. ✅ Restarted all peer containers
2. ✅ Verified chaincode container is running
3. ⏳ Peers need time to reconnect and sync

## Solutions to Try

### Solution 1: Restart Entire Blockchain Network (Recommended)
```bash
cd c:\goCBC
docker-compose down
docker-compose up -d
# Wait 30 seconds
bash network-up.sh  # Or your network startup script
```

### Solution 2: Redeploy Chaincode
```bash
cd c:\goCBC
bash deploy-chaincode.sh
# Or
bash chaincode.sh
```

### Solution 3: Clear Peer Data and Restart
```bash
# Stop network
docker-compose down

# Remove peer data (CAUTION: This clears blockchain data)
docker volume rm $(docker volume ls -q | grep peer)

# Restart network
docker-compose up -d

# Redeploy chaincode
bash deploy-chaincode.sh
```

### Solution 4: Check Chaincode Connection
```bash
# Check if chaincode can connect to peers
docker exec coffee-chaincode cat /etc/hosts

# Check peer can reach chaincode
docker exec peer0.ecta.cecbs.et ping -c 3 coffee-chaincode
```

## Testing After Fix

### Test 1: Direct Peer Query
```bash
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllAssets","Args":[]}'
```

### Test 2: API Query
```bash
curl -X GET http://localhost:3001/api/v1/shipments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: UI Test
1. Open Shipping Portal
2. Check browser console for logs
3. Should see: `[SHIPPING] Total shipments: X`
4. Should NOT see timeout errors

## Expected Results After Fix

### In Browser Console:
```
[SHIPPING] Total shipments: 3
[SHIPPING] All shipment statuses: [
  { id: "SHP001", status: "CREATED" },
  { id: "SHP002", status: "CUSTOMS_DECLARED" },
  { id: "SHP003", status: "CUSTOMS_CLEARED" }
]
[SHIPPING] Ready for shipping: 1
```

### In UI:
- If no CUSTOMS_CLEARED shipments: Yellow warning alert
- If CUSTOMS_CLEARED shipments exist: Green success alert + shipments in table

## Prevention

To avoid this issue in the future:
1. Always restart peers after redeploying chaincode
2. Use consistent deployment scripts
3. Add health checks to verify chaincode connectivity
4. Monitor peer logs for "timeout" errors

## Current Status
- ✅ Shipping Portal UI fix implemented
- ✅ Enhanced logging added
- ⏳ Blockchain connectivity issue needs resolution
- ⏳ Waiting for peers to sync after restart

## Next Steps
1. Wait 2-3 minutes for peers to fully initialize
2. Test API endpoint: `GET /api/v1/shipments`
3. If still timing out, try Solution 1 (full network restart)
4. If Solution 1 fails, try Solution 2 (redeploy chaincode)

---
**Date**: 2026-07-08  
**Status**: ⏳ In Progress
