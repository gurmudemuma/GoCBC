# Simplified Chaincode Deployment

## Changes Made (2026-11-20)

The deployment script has been simplified to use a **fixed "coffee" label without version numbering**.

### What Changed

1. **Label**: Always uses `"coffee"` (not `"coffee_1.0"` or `"coffee_2.3"`)
2. **Version**: Always deploys as version `1`
3. **Sequence**: Always deploys as sequence `1`
4. **No Auto-Increment**: Script no longer auto-upgrades versions
5. **Clean First**: Script requires manual cleanup before redeploying

### How to Deploy

#### Fresh Deployment (First Time)
```bash
./deploy-chaincode.sh
```

#### Redeployment (After Changes)
You MUST clean the blockchain first:

```bash
# Option 1: Use start-all.sh with --clean flag
./start-all.sh --clean

# Option 2: Manual cleanup
docker compose -f docker-compose-fabric.yml down -v
./start-all.sh
```

Then run:
```bash
./deploy-chaincode.sh
```

### What Happens

1. Script checks if chaincode already exists
2. If exists: **STOPS** and tells you to clean first
3. If not exists: Deploys fresh with label "coffee", version 1, sequence 1
4. No version confusion, no auto-increment surprises

### Files Modified

- `deploy-chaincode.sh` - Simplified version logic
- `chaincodes/coffee/metadata.json` - Already set to `{"label":"coffee","type":"ccaas"}`

### Benefits

- ✅ No version number confusion
- ✅ Predictable deployment behavior
- ✅ Clean slate every time
- ✅ Simple "coffee" label matches user expectation
- ✅ No mysterious v1.2, v2.24, etc.

### Notes

- The script still validates everything (TLS, DNS, TCP connectivity)
- The script still rebuilds the chaincode server image
- The script still commits to all 6 organizations
- Only the versioning logic changed - everything else works the same
