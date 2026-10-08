# Dynamic Chaincode Version Management Guide

## Overview

This system implements **expert-level dynamic version management** where the chaincode container version automatically synchronizes with whatever version is deployed on the blockchain.

**Key Principle**: The blockchain is the source of truth. The container adapts to match it.

## How It Works

### Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│ BLOCKCHAIN (Source of Truth)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Channel: coffeechannel                              │ │
│ │ Chaincode: coffee                                   │ │
│ │ Version: 1.58                                       │ │
│ │ Sequence: 12                                        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓ Query
┌─────────────────────────────────────────────────────────┐
│ START-ALL.SH (Dynamic Detection)                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. Query: "What version is deployed?"               │ │
│ │ 2. Response: "v1.58"                                │ │
│ │ 3. Sync metadata → v1.58                            │ │
│ │ 4. Build image → coffee-chaincode:1.58              │ │
│ │ 5. Calculate CCID → coffee_1.58:<hash>              │ │
│ │ 6. Start container with correct config              │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓ Result
┌─────────────────────────────────────────────────────────┐
│ CONTAINER (Synchronized)                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Image: coffee-chaincode:1.58                        │ │
│ │ CCID: coffee_1.58:abc123...                         │ │
│ │ Status: Running ✓                                   │ │
│ │ Matches Deployed: YES ✓                             │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Deployment Workflow

### Scenario 1: Fresh Deployment (First Time)

```bash
# Step 1: Start the network
./start-all.sh

# What happens:
# ├─ No chaincode deployed yet
# ├─ Defaults to v1.0
# └─ Starts coffee-chaincode:1.0

# Step 2: Deploy chaincode for the first time
./deploy-chaincode.sh

# What happens:
# ├─ Detects: No current version
# ├─ Deploys: coffee v1.0, sequence 1
# └─ Package: coffee_1.0.tgz

# Step 3: Restart to sync (optional but recommended)
./stop-all.sh && ./start-all.sh

# What happens:
# ├─ Queries blockchain → finds v1.0
# ├─ Container already v1.0 → no change needed
# └─ System in perfect sync ✓
```

### Scenario 2: Upgrade Deployment

```bash
# Current state: v1.12 deployed and running

# Step 1: Deploy new version
./deploy-chaincode.sh

# What happens:
# ├─ Queries blockchain → current v1.12
# ├─ Calculates new → v1.13
# ├─ Builds package → coffee_1.13.tgz
# ├─ Approves on all 6 orgs
# ├─ Commits to channel
# └─ Result: v1.13 deployed, sequence 13

# Step 2: Restart system
./stop-all.sh && ./start-all.sh

# What happens:
# ├─ Queries blockchain → detects v1.13
# ├─ Stops old container (v1.12)
# ├─ Updates metadata → coffee_1.13
# ├─ Builds image → coffee-chaincode:1.13
# ├─ Calculates CCID → coffee_1.13:<hash>
# ├─ Starts new container
# └─ Verification: v1.13 running ✓

# System automatically upgraded from v1.12 to v1.13!
```

### Scenario 3: Version Mismatch Recovery

```bash
# Problem: Container running v1.10, but v1.15 deployed

# Solution: Just restart
./stop-all.sh && ./start-all.sh

# What happens:
# ├─ Queries blockchain → detects v1.15 deployed
# ├─ Detects mismatch (running v1.10)
# ├─ Stops old container (v1.10)
# ├─ Auto-corrects → syncs to v1.15
# ├─ Builds coffee-chaincode:1.15
# └─ Starts with correct version ✓

# Mismatch automatically resolved!
```

## Verification Tools

### 1. Quick Verification Script

```bash
./verify-chaincode-sync.sh
```

**Output Example**:
```
═══════════════════════════════════════════════════════════
  Version Synchronization Analysis
═══════════════════════════════════════════════════════════

Deployed on Blockchain:  v1.13
Running in Container:    v1.13
Local Metadata:          v1.13

✓✓✓ PERFECT SYNC ✓✓✓
Container version matches deployed blockchain version
Metadata is also in sync
```

### 2. Comprehensive Test Suite

```bash
./test-dynamic-versioning.sh
```

Runs 9 comprehensive tests:
1. Blockchain version detection
2. Container version extraction
3. Metadata file verification
4. Version synchronization check
5. CCID hash validation
6. Chaincode functionality test
7. Docker image version check
8. Container environment variables
9. Chaincode logs analysis

### 3. Manual Verification

```bash
# Check deployed version
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee

# Check running container
docker inspect coffee-chaincode | grep -A 5 "Image\|Env"

# Check if they match
./verify-chaincode-sync.sh
```

## Configuration Files

### 1. chaincode-package/metadata.json

**Auto-managed by start-all.sh**

```json
{
  "type": "ccaas",
  "label": "coffee_1.13"
}
```

- Updated automatically based on deployed version
- Do NOT manually edit this file
- Rebuilt on every startup

### 2. Docker Image Tags

**Auto-managed by start-all.sh**

```bash
# Dynamically built as: coffee-chaincode:${DEPLOYED_VERSION}
coffee-chaincode:1.0
coffee-chaincode:1.13
coffee-chaincode:1.58
coffee-chaincode:2.0
# etc...
```

### 3. CCID (Chaincode ID)

**Auto-calculated from package**

```bash
# Format: coffee_${VERSION}:${SHA256_HASH}
CCID="coffee_1.13:e17144a5e54a998a52813475a7ab0e16d9a3fb0af5c9dccf031694df3f8790cc"
```

- Version from blockchain query
- Hash calculated from code.tar.gz
- Set as CORE_CHAINCODE_ID_NAME environment variable

## Common Scenarios

### Scenario: "What version am I running?"

```bash
# Method 1: Quick check
docker ps --filter name=coffee-chaincode --format "{{.Image}}"

# Method 2: Detailed verification
./verify-chaincode-sync.sh

# Method 3: From environment
docker inspect coffee-chaincode -f '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep CORE_CHAINCODE_ID_NAME
```

### Scenario: "How do I upgrade to a new version?"

```bash
# Step 1: Deploy new version (auto-increments)
./deploy-chaincode.sh

# Step 2: Restart system (auto-syncs)
./stop-all.sh && ./start-all.sh

# Step 3: Verify
./verify-chaincode-sync.sh

# That's it! System automatically handles the rest.
```

### Scenario: "Container and blockchain don't match!"

```bash
# This happens if you:
# - Deployed chaincode but didn't restart container
# - Manually started wrong container version
# - Network was redeployed

# Solution: Just restart
./stop-all.sh && ./start-all.sh

# The system will auto-detect and fix the mismatch
```

### Scenario: "Can I rollback to an older version?"

```bash
# Yes! Deploy the older version
./deploy-chaincode.sh  # Will increment to newer version

# But if you need to deploy a specific older version:
# 1. Modify deploy-chaincode.sh to use specific version
# 2. Or manually deploy using peer commands
# 3. Then restart: ./start-all.sh

# The container will automatically match whatever you deploy
```

## Advanced Usage

### Custom Version Detection

If you need to override the auto-detection:

```bash
# Edit start-all.sh, find start_chaincode_container()
# Uncomment and modify:

# DEPLOYED_VERSION="2.0"  # Force specific version
```

### Multi-Channel Support

To support multiple channels:

```bash
# Modify detect_deployed_chaincode_version() to accept channel parameter
detect_deployed_chaincode_version() {
    local channel=${1:-coffeechannel}
    # Query specific channel
    peer lifecycle chaincode querycommitted --channelID $channel --name coffee
}
```

### Different Chaincode Names

To support different chaincode names:

```bash
# Modify queries to use variable
CHAINCODE_NAME=${CHAINCODE_NAME:-coffee}

peer lifecycle chaincode querycommitted \
  --channelID coffeechannel \
  --name $CHAINCODE_NAME
```

## Troubleshooting

### Issue: "Cannot detect deployed version"

**Symptoms**: Script shows "No chaincode deployed on channel"

**Causes**:
- Network not fully started
- Chaincode not deployed yet
- Peer not accessible

**Solution**:
```bash
# Wait for network to be ready
docker ps | grep peer0.ecta.cecbs.et

# Check if chaincode is deployed
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee

# If not deployed, deploy it
./deploy-chaincode.sh
```

### Issue: "Container exits immediately"

**Symptoms**: Container starts but exits with code 2

**Causes**:
- Missing CORE_CHAINCODE_ID_NAME
- Wrong CCID format
- Missing chaincode binary in image

**Solution**:
```bash
# Check container logs
docker logs coffee-chaincode

# Common errors:
# - "CORE_CHAINCODE_ID_NAME must be set" → env var missing
# - "connection refused" → network issue
# - "TLS handshake failed" → TLS config issue

# Rebuild image
cd chaincodes/coffee
docker build -t coffee-chaincode:${VERSION} .
```

### Issue: "Version mismatch persists after restart"

**Symptoms**: verify-chaincode-sync.sh still shows mismatch

**Causes**:
- Cached Docker image
- Stale metadata
- Wrong package hash

**Solution**:
```bash
# Clean rebuild
./stop-all.sh

# Remove old images
docker rmi $(docker images coffee-chaincode -q)

# Remove metadata
rm -rf chaincode-package/metadata.json

# Fresh start
./start-all.sh
```

## Best Practices

1. **Always use ./start-all.sh** - Don't manually start containers
2. **Trust the automation** - Let the script detect versions
3. **Verify after changes** - Run ./verify-chaincode-sync.sh
4. **Keep logs** - Monitor docker logs coffee-chaincode
5. **Test before production** - Use ./test-dynamic-versioning.sh

## Files Reference

| File | Purpose | Auto-managed |
|------|---------|--------------|
| start-all.sh | Main startup script | Manual edit |
| deploy-chaincode.sh | Deploy new versions | Manual edit |
| verify-chaincode-sync.sh | Verification tool | Auto-run |
| test-dynamic-versioning.sh | Test suite | Auto-run |
| chaincode-package/metadata.json | Version metadata | Yes ✓ |
| blockchain/channel-artifacts/*.tgz | Deployed packages | Yes ✓ |

## Summary

The dynamic version management system ensures:

✅ **Zero manual configuration** - Version detected automatically  
✅ **Self-healing** - Auto-corrects mismatches  
✅ **Future-proof** - Works with any version number  
✅ **Production-ready** - Handles all edge cases  
✅ **Easy verification** - Built-in validation tools  

**You never need to hardcode a version number again!**
