# Fixed Deployment Guide - Simple "coffee" Label

## What Was Fixed

✅ **Removed version auto-increment** - No more coffee_2.24, coffee_1.2, etc.  
✅ **Simple "coffee" label** - Just "coffee", no version suffix  
✅ **Fixed version "1", sequence "1"** - Always deploys as v1 seq1  
✅ **Requires clean before redeploy** - Prevents confusion from multiple versions  

## Files Modified

1. **`deploy-chaincode.sh`** - Updated to use simple labeling
2. **`deploy-chaincode-simple.sh`** - NEW simplified version (faster, clearer output)
3. **`chaincodes/coffee/metadata.json`** - Already set to `{"label":"coffee","type":"ccaas"}`

## How to Deploy

### Step 1: Clean Everything
```bash
# Kill any running API/UI
lsof -ti:3001 | xargs -r kill -9
lsof -ti:3000 | xargs -r kill -9

# Wipe blockchain completely
docker compose -f docker-compose-fabric.yml down -v

# Or use the --clean flag
./start-all.sh --clean
```

### Step 2: Start Blockchain
```bash
./start-all.sh
```

Wait until you see:
- ✓ All 6 peers running
- ✓ Orderer running  
- ✓ Channel created
- ✓ Peers joined channel

### Step 3: Deploy Chaincode

**Option A: Use the simplified script (recommended)**
```bash
./deploy-chaincode-simple.sh
```

**Option B: Use the original script**
```bash
./deploy-chaincode.sh
```

Both scripts now:
- Check if chaincode already exists (stops if yes)
- Package with "coffee" label
- Install on all 6 peers
- Get package ID
- Update docker-compose
- Rebuild chaincode server
- Approve for all 6 orgs
- Commit to channel
- Verify deployment

### Step 4: Verify
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee
```

Should show:
```
Version: 1, Sequence: 1, Endorsement Plugin: escc, Validation Plugin: vscc
```

## Troubleshooting

### "Chaincode already deployed"
```bash
./start-all.sh --clean
```

### "Port 3001 already in use"
```bash
lsof -ti:3001 | xargs -r kill -9
docker compose -f docker-compose-fabric.yml up -d cecbs-api
```

### Deployment hangs
- Press Ctrl+C
- Check: `docker logs coffee-chaincode --tail 50`
- Check: `docker logs peer0.ecta.cecbs.et --tail 50`
- Verify package ID in docker-compose matches installed package

### See what's installed
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
```

### Check commit status
```bash
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel
```

## Key Benefits

1. **No Version Confusion** - Always "coffee" version 1
2. **Predictable** - Same deployment every time
3. **Clean Slate** - Forces proper cleanup before redeploy
4. **Simple** - No auto-increment magic
5. **Clear Errors** - Script stops early if already deployed

## What Changed Internally

### Before (Complex)
- Parsed metadata.json for version number
- Auto-incremented: coffee_2.3 → coffee_2.4
- Could have multiple versions deployed simultaneously
- Hard to track which version was which

### After (Simple)
- Fixed label: "coffee"
- Fixed version: "1"
- Fixed sequence: "1"
- Must clean before redeploying
- One version at a time

## Package Structure

The package still contains:
- `metadata.json` - `{"label":"coffee","type":"ccaas"}`
- `code.tar.gz` containing:
  - `connection.json` - Server address (coffee-chaincode:9999)
  - `META-INF/statedb/couchdb/indexes/` - CouchDB indexes

## Docker Compose Updates

The script automatically updates:
```yaml
coffee-chaincode:
  image: coffee-chaincode:1  # Was coffee-chaincode:2.24
  environment:
    - CORE_CHAINCODE_ID_NAME=coffee:hash...  # Updated with new package ID
```

## Next Steps After Deployment

1. Verify chaincode is committed
2. Test a simple query: `docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"Args":["ping"]}'`
3. Start API: `cd api && npm run dev`
4. Start UI: `cd ui && npm run dev`
5. Test exporter registration form

## Summary

✅ Simplified deployment  
✅ No version confusion  
✅ Clean before deploy  
✅ Always "coffee" v1 seq1  
✅ Ready to use  
