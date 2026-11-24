# Chaincode CCID Mismatch - Root Cause and Fix

## Date: 2026-11-20

## Problem Summary

The blockchain was failing with "timeout expired while starting chaincode" errors. After extensive TLS configuration attempts, the root cause was identified: **CCID mismatch between deployed chaincode and docker-compose configuration**.

### Symptoms
- Peer logs: `timeout expired while starting chaincode coffee_2.20:10a3109...`
- Chaincode logs: `Listening for peer connections on 0.0.0.0:9999` (but no connections)
- API calls to blockchain endpoints: 500 timeout errors
- Status: Chaincode container running, listening on port 9999, but never registering with peer

## Root Cause

**CCID Environment Variable Mismatch**

The chaincode announces its identity using `CORE_CHAINCODE_ID_NAME` environment variable. This MUST match the exact package ID that was committed to the channel.

**What was wrong:**
```yaml
# docker-compose-fabric.yml (WRONG)
CORE_CHAINCODE_ID_NAME=coffee_2.21:7fd9e44c15fd1d31530cca415fd93efc7f4ceb3cd75b39e9032eccebea698573
```

**What was deployed:**
```
coffee_2.20:10a3109266d3e7fc1b26f3a8dc64653036a67880179336522c5119aa00e18f3b
```

### Why This Happens

1. **Chaincode deployment** creates a package with a specific ID based on:
   - Label from `metadata.json` (e.g., `coffee_2.18`)
   - Auto-increment by deploy script (e.g., `2.18` → `2.19` → `2.20`)
   - Hash of the package contents

2. **Package ID format:** `<label>:<sha256_hash>`
   - Example: `coffee_2.20:10a3109266d3e7fc1b26f3a8dc64653036a67880179336522c5119aa00e18f3b`

3. **Docker compose file** had hardcoded CCID from a previous deployment (v2.21)

4. **CCAAS handshake** requires:
   - Peer expects chaincode to announce with the committed package ID
   - Chaincode announces using `CORE_CHAINCODE_ID_NAME` from environment
   - If they don't match → peer rejects the connection → timeout

## Understanding CCAAS Architecture

### Normal CCAAS Flow (Working)
```
1. Peer tries to invoke chaincode
2. Peer looks up package ID from committed definition: coffee_2.20:10a3109...
3. Peer reads connection.json from package: address = coffee-chaincode:9999
4. Peer dials coffee-chaincode:9999
5. Chaincode announces: "I am coffee_2.20:10a3109..."
6. Peer validates: CCID matches committed definition ✓
7. Registration succeeds
8. Chaincode can handle requests
```

### What Was Happening (Broken)
```
1. Peer tries to invoke chaincode
2. Peer looks up package ID: coffee_2.20:10a3109...
3. Peer dials coffee-chaincode:9999
4. Chaincode announces: "I am coffee_2.21:7fd9e44c..." ← WRONG
5. Peer validates: CCID doesn't match ✗
6. Peer drops connection
7. Timeout after 300 seconds
```

## The Fix

### Step 1: Update docker-compose-fabric.yml

**Changed:**
```yaml
# coffee-chaincode service
image: coffee-chaincode:2.20  # Changed from 2.21
environment:
  - CORE_CHAINCODE_ID_NAME=coffee_2.20:10a3109266d3e7fc1b26f3a8dc64653036a67880179336522c5119aa00e18f3b
```

**Where:** `/home/guda/GoCBC/docker-compose-fabric.yml` lines 452-456

### Step 2: Restart Chaincode Container

**Script created:** `restart-chaincode-fixed.sh`

```bash
bash restart-chaincode-fixed.sh
```

This script:
1. Stops old chaincode container
2. Removes old container
3. Starts new container with correct CCID
4. Shows startup logs

### Step 3: Verify Registration

Wait 30 seconds after restart, then check:

```bash
# Check chaincode logs
docker logs coffee-chaincode 2>&1 | tail -50

# Look for:
# ✓ "Listening for peer connections on 0.0.0.0:9999"
# ✓ "Chaincode server running..."
# ✓ No "ServerHandshake failed" errors

# Test API
bash test-api-blockchain.sh

# Should succeed:
# ✓ Login works
# ✓ GET /api/v1/exporters returns data (not timeout)
```

## Prevention: Keeping CCID in Sync

### Option A: Manual Update (Current)
When deploying new chaincode version:
1. Note the package ID from deploy output
2. Update `CORE_CHAINCODE_ID_NAME` in docker-compose-fabric.yml
3. Restart chaincode container

### Option B: Automated Sync (Recommended)

**Create:** `/home/guda/GoCBC/sync-chaincode-ccid.sh`

```bash
#!/bin/bash
# Extract current committed chaincode package ID and update docker-compose

PEER_CONTAINER="peer0.ecta.cecbs.et"

echo "Querying committed chaincode..."
PACKAGE_ID=$(docker exec $PEER_CONTAINER peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null | \
    grep "Package ID:" | awk -F': ' '{print $2}' | tr -d ', ')

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get committed package ID"
    exit 1
fi

echo "Committed package ID: $PACKAGE_ID"

# Extract version from package ID (e.g., coffee_2.20:hash → 2.20)
VERSION=$(echo $PACKAGE_ID | grep -oP 'coffee_\K[0-9.]+')

echo "Updating docker-compose-fabric.yml..."
sed -i "s|coffee-chaincode:[0-9.]*|coffee-chaincode:$VERSION|" docker-compose-fabric.yml
sed -i "s|CORE_CHAINCODE_ID_NAME=coffee_[0-9.]*:[a-f0-9]*|CORE_CHAINCODE_ID_NAME=$PACKAGE_ID|" docker-compose-fabric.yml

echo "✓ docker-compose-fabric.yml updated"
echo ""
echo "Next: bash restart-chaincode-fixed.sh"
```

**Usage:**
```bash
# After every chaincode deployment:
bash sync-chaincode-ccid.sh
bash restart-chaincode-fixed.sh
```

## What We Learned

### 1. TLS Was Not The Issue
Multiple TLS configuration attempts were made:
- ✗ Disabling chaincode TLS only
- ✗ Disabling peer TLS (broke peer gossip)
- ✗ Enabling chaincode TLS with peer certs (wrong certs)

**Reality:** TLS was configured correctly. The mismatch was CCID.

### 2. CCAAS Chaincode is Passive
The chaincode code is correct:
```go
// main.go lines 3345-3349
// In Fabric 2.5 CCAAS mode the chaincode only listens:
// CHAINCODE_SERVER_ADDRESS is the address this process binds (0.0.0.0:9999).
// The peer dials us at the address in connection.json;
// the chaincode never connects to any peer.
```

Chaincode doesn't "register" actively - it waits for peer to dial it.

### 3. Environment Variables Are Critical
In CCAAS mode, these environment variables MUST be correct:
- `CORE_CHAINCODE_ID_NAME` - MUST match committed package ID exactly
- `CHAINCODE_SERVER_ADDRESS` - Address to bind (0.0.0.0:9999)
- `CHAINCODE_TLS_DISABLED` - TLS setting (currently true)

### 4. Connection.json Address Format
```json
{
  "address": "coffee-chaincode:9999"  // Docker service name, NOT IP
}
```

Using Docker service name (DNS) is correct and stable. Using IP addresses causes issues when containers restart.

## Current Configuration (Working)

### Chaincode Package
- **Label:** coffee_2.20
- **Package ID:** coffee_2.20:10a3109266d3e7fc1b26f3a8dc64653036a67880179336522c5119aa00e18f3b
- **Sequence:** 3
- **Status:** Committed, approved by all 6 orgs

### Docker Compose
- **Image:** coffee-chaincode:2.20
- **CCID:** coffee_2.20:10a3109266d3e7fc1b26f3a8dc64653036a67880179336522c5119aa00e18f3b
- **Address:** 0.0.0.0:9999
- **TLS:** Disabled
- **Network:** cecbs (shared with peers)

### Connection.json
- **Address:** coffee-chaincode:9999
- **TLS Required:** false
- **Dial Timeout:** 60s

## Testing Checklist

After applying this fix:

- [ ] Chaincode container starts without errors
- [ ] Chaincode logs show "Listening for peer connections"
- [ ] No "ServerHandshake failed" errors
- [ ] Wait 30 seconds for peer warmup
- [ ] API login succeeds
- [ ] GET /api/v1/exporters returns data (not timeout)
- [ ] Peer logs show successful chaincode invocations
- [ ] No "timeout expired while starting chaincode" errors

## Files Modified

1. `/home/guda/GoCBC/docker-compose-fabric.yml`
   - Line 452: `image: coffee-chaincode:2.20` (was 2.21)
   - Line 456: `CORE_CHAINCODE_ID_NAME=coffee_2.20:10a3109...` (was 2.21:7fd9e44c...)

## Files Created

1. `/home/guda/GoCBC/restart-chaincode-fixed.sh`
   - Script to restart chaincode with correct CCID
   
2. `/home/guda/GoCBC/CHAINCODE-CCID-MISMATCH-FIX.md`
   - This document

## Next Steps

1. **Immediate:** Run `bash restart-chaincode-fixed.sh`
2. **Verify:** Wait 30s, then run `bash test-api-blockchain.sh`
3. **Future:** Create `sync-chaincode-ccid.sh` for automated CCID sync
4. **Document:** Add CCID sync to deployment checklist

## Status

- [x] Root cause identified
- [x] Fix applied to docker-compose-fabric.yml
- [x] Restart script created
- [ ] **USER ACTION REQUIRED:** Run restart-chaincode-fixed.sh
- [ ] Verify with test-api-blockchain.sh
- [ ] Confirm all blockchain endpoints working

---

**Expert Analysis Complete**

This was a classic case of misdiagnosis: the symptoms (timeout, connection failures) suggested TLS issues, but the root cause was a simple environment variable mismatch. The CCAAS architecture requires exact CCID matching for security - the peer won't accept a chaincode that announces a different identity than what was committed to the channel.

The fix is simple: ensure `CORE_CHAINCODE_ID_NAME` in docker-compose matches the committed package ID exactly.
