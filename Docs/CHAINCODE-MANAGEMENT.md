# Chaincode Management Guide

Complete guide for managing chaincode lifecycle in the CECBS system.

## Quick Reference

### One-Command Upgrade
```bash
# Complete upgrade (package, install, approve, commit, restart container)
./chaincode.sh upgrade 1.16 6
```

### Step-by-Step Deployment
```bash
# 1. Create package
./chaincode.sh package 1.16

# 2. Install on all peers
./chaincode.sh install 1.16

# 3. Approve for all organizations
./chaincode.sh approve 1.16 6

# 4. Commit to channel
./chaincode.sh commit 1.16 6

# 5. Restart container with new package ID
./chaincode.sh container-restart
```

## Available Scripts

### 1. `chaincode.sh` - Complete Management Tool
**Recommended for all operations**

Full-featured management tool with individual commands for each operation.

```bash
# Show all available commands
./chaincode.sh help

# Query current chaincode
./chaincode.sh query

# List installed chaincodes
./chaincode.sh list-installed ecta

# Check approval status
./chaincode.sh check-ready 1.16 6

# Test chaincode
./chaincode.sh test

# View container logs
./chaincode.sh container-logs 100
```

### 2. `deploy-chaincode.sh` - Verbose Full Deployment
Detailed deployment with step-by-step output.

```bash
./deploy-chaincode.sh [version] [sequence]
./deploy-chaincode.sh 1.16 6
```

### 3. `quick-deploy-chaincode.sh` - Minimal Output Deployment
Quick deployment with minimal console output.

```bash
./quick-deploy-chaincode.sh [version] [sequence]
./quick-deploy-chaincode.sh 1.16 6
```

## Command Details

### Package Command
Creates a CCAAS (Chaincode-as-a-Service) package with proper structure.

```bash
./chaincode.sh package 1.16
```

**What it does:**
- Updates `metadata.json` with version label
- Creates `code.tar.gz` with `connection.json`
- Packages into `coffee_1.16.tgz`
- Output: `chaincodes/coffee/coffee_1.16.tgz`

### Install Command
Installs chaincode package on all peer nodes.

```bash
./chaincode.sh install 1.16
```

**What it does:**
- Copies package to all 6 peers (ECTA, Banks, NBE, Customs, ECX, Shipping)
- Installs using peer lifecycle chaincode install
- Returns Package ID (needed for approve/commit)

**Organizations:**
- ECTA (Ethiopian Coffee & Tea Authority)
- Banks (Commercial Bank of Ethiopia)
- NBE (National Bank of Ethiopia)
- Customs (Ethiopian Customs)
- ECX (Ethiopian Commodity Exchange)
- Shipping (Shipping Lines)

### Approve Command
Approves chaincode definition for all organizations.

```bash
# Auto-detect package ID
./chaincode.sh approve 1.16 6

# With explicit package ID
./chaincode.sh approve 1.16 6 coffee_1.16:abc123...
```

**What it does:**
- Copies orderer TLS certificates to peers
- Approves chaincode for each organization
- Requires: version, sequence, package ID

**Sequence Numbers:**
- Must increment from previous deployment
- Current production: Sequence 5 (v1.15)
- Next deployment: Sequence 6 (v1.16)

### Commit Command
Commits approved chaincode definition to channel.

```bash
./chaincode.sh commit 1.16 6
```

**What it does:**
- Copies peer TLS certificates to primary peer
- Commits chaincode definition to `coffeechannel`
- Requires majority approval from organizations
- Makes chaincode active on the channel

**Requirements:**
- All organizations must have approved
- Endorsement policy must be satisfied
- Correct sequence number

### Upgrade Command
Complete end-to-end upgrade process.

```bash
./chaincode.sh upgrade 1.16 6
```

**What it does:**
1. Package chaincode (v1.16)
2. Install on all peers
3. Approve for all organizations (sequence 6)
4. Commit to channel
5. Update `docker-compose-fabric.yml` with package ID
6. Restart chaincode container

**When to use:**
- Production deployments
- Clean upgrades from previous versions
- When you want automated full process

### Query Command
Shows current committed chaincode details.

```bash
./chaincode.sh query
```

**Output:**
- Chaincode name
- Current version
- Sequence number
- Endorsement policy
- Validation plugin
- Organization approvals

### List Installed Command
Lists all installed chaincodes on a peer.

```bash
# Default: ECTA peer
./chaincode.sh list-installed

# Specific organization
./chaincode.sh list-installed banks
./chaincode.sh list-installed nbe
```

**Output:**
- Package ID
- Chaincode label
- Installation status

### Check Ready Command
Checks commit readiness (approval status).

```bash
./chaincode.sh check-ready 1.16 6
```

**Output:**
- JSON approval status for each organization
- Visual indicators (✓ approved / ✗ not approved)

**Use before committing to verify all approvals.**

### Test Command
Tests chaincode invocation with a query.

```bash
./chaincode.sh test
```

**What it does:**
- Runs `QueryAllExporters` query
- Verifies chaincode is responding
- Shows query results

### Container Restart Command
Updates and restarts the chaincode container.

```bash
./chaincode.sh container-restart
```

**What it does:**
1. Queries latest installed package ID
2. Updates `docker-compose-fabric.yml`
3. Stops old container
4. Starts new container with correct package ID
5. Shows startup logs

**When to use:**
- After committing new chaincode version
- When container has wrong package ID
- Container troubleshooting

### Container Logs Command
Shows chaincode container logs.

```bash
# Last 50 lines (default)
./chaincode.sh container-logs

# Specific number of lines
./chaincode.sh container-logs 100
```

## Common Workflows

### Scenario 1: Fresh Deployment (New Version)

```bash
# Step 1: Make code changes in chaincodes/coffee/

# Step 2: Deploy new version
./chaincode.sh upgrade 1.16 6

# Step 3: Verify deployment
./chaincode.sh query
./chaincode.sh test
```

### Scenario 2: Troubleshooting Deployment

```bash
# Check current status
./chaincode.sh query

# Check what's installed
./chaincode.sh list-installed ecta

# Check approval status
./chaincode.sh check-ready 1.16 6

# View container logs
./chaincode.sh container-logs 100

# Test invocation
./chaincode.sh test
```

### Scenario 3: Container Issues

```bash
# Check container status
docker ps | grep coffee-chaincode

# Check logs
./chaincode.sh container-logs

# Restart with correct package ID
./chaincode.sh container-restart

# Verify
docker logs coffee-chaincode --tail 20
```

### Scenario 4: Rollback (Emergency)

```bash
# Query current version
./chaincode.sh query

# If v1.16 is problematic, rollback to v1.15
# Note: Cannot decrease sequence, must use higher sequence

# Option 1: Reinstall previous version with new sequence
./chaincode.sh install 1.15
./chaincode.sh approve 1.15 7  # Next sequence
./chaincode.sh commit 1.15 7
./chaincode.sh container-restart

# Option 2: Deploy hotfix version
./chaincode.sh upgrade 1.15.1 7
```

## Architecture: CCAAS (Chaincode-as-a-Service)

### How It Works

1. **Chaincode Container:**
   - Runs independently: `coffee-chaincode:9999`
   - Contains Go chaincode compiled as binary
   - Started via `docker-compose-fabric.yml`

2. **Connection:**
   - `connection.json` tells peers where to connect
   - Address: `coffee-chaincode:9999`
   - Peers connect to container (not spawn chaincode)

3. **Package Structure:**
   ```
   coffee_1.15.tgz
   ├── code.tar.gz
   │   └── connection.json
   └── metadata.json
   ```

4. **Package ID:**
   - Format: `coffee_1.15:64-char-hash`
   - Hash of package contents
   - Must match `CORE_CHAINCODE_ID_NAME` in container

### Key Files

| File | Purpose |
|------|---------|
| `chaincodes/coffee/main.go` | Chaincode entry point |
| `chaincodes/coffee/connection.json` | CCAAS connection config |
| `chaincodes/coffee/metadata.json` | Package metadata |
| `chaincodes/coffee/Dockerfile` | Container build config |
| `docker-compose-fabric.yml` | Container orchestration |

## Sequence Number Guide

The sequence number tracks chaincode definition versions on the channel.

### Rules:
- **Must increment:** Each commit needs sequence++
- **Cannot skip:** Must be consecutive (5 → 6 → 7)
- **Cannot decrease:** No rollback by sequence
- **Version independent:** Different from chaincode version

### History:
```
Sequence 1: Initial deployment
Sequence 2: Unknown update
Sequence 3: Unknown update
Sequence 4: v1.13 (before document integration)
Sequence 5: v1.15 (with document integration) ← CURRENT
Sequence 6: v1.16 (next deployment)
```

### Finding Current Sequence:
```bash
./chaincode.sh query
# Look for: "Sequence: 5"
# Next deployment: Sequence 6
```

## Package ID Guide

### What is Package ID?
Unique identifier for installed chaincode package.

**Format:** `coffee_1.15:64-character-hex-hash`

**Example:**
```
coffee_1.15:39d37dfb7c9ac63dca40f3292a8856c1c84388a1ec280e1299953f716ac240f5
```

### Why It Matters:
1. **Peer Installation:** Tracks installed packages
2. **Approval:** Links definition to package
3. **Container:** Must match `CORE_CHAINCODE_ID_NAME`

### How to Get Package ID:

```bash
# Option 1: From install output
./chaincode.sh install 1.16
# Output: Package ID: coffee_1.16:abc123...

# Option 2: Query installed
./chaincode.sh list-installed ecta

# Option 3: Auto-detected by approve
./chaincode.sh approve 1.16 6
# Automatically finds package ID
```

### Container Package ID:

The chaincode container must have the correct package ID:

```yaml
# docker-compose-fabric.yml
environment:
  - CORE_CHAINCODE_ID_NAME=coffee_1.15:39d37dfb...
```

**Update methods:**
```bash
# Automatic (recommended)
./chaincode.sh container-restart

# Manual
sed -i "s/CORE_CHAINCODE_ID_NAME=.*/CORE_CHAINCODE_ID_NAME=coffee_1.16:abc123.../" docker-compose-fabric.yml
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode
```

## Troubleshooting

### Issue 1: "sequence 5 is larger than requested sequence 4"

**Cause:** Trying to use old sequence number

**Solution:**
```bash
# Check current sequence
./chaincode.sh query

# Use next sequence number
./chaincode.sh approve 1.16 6  # Not 5
```

### Issue 2: "could not launch chaincode coffee_1.13"

**Cause:** Container has wrong package ID

**Solution:**
```bash
./chaincode.sh container-restart
```

### Issue 3: "ENDORSEMENT_POLICY_FAILURE"

**Cause:** Not enough peer approvals or wrong peer set

**Solution:**
```bash
# Check approval status
./chaincode.sh check-ready 1.16 6

# Ensure all 6 peers in commit
./chaincode.sh commit 1.16 6
```

### Issue 4: Install fails with "already installed"

**Cause:** Package already exists (not an error)

**Solution:**
- Continue to approve step
- Package ID will be detected

### Issue 5: Container not connecting

**Symptoms:**
- Container running but no logs
- Peer errors: "connection refused"

**Diagnosis:**
```bash
# Check container
docker ps | grep coffee-chaincode
docker logs coffee-chaincode

# Check package ID match
./chaincode.sh query
docker exec coffee-chaincode env | grep CORE_CHAINCODE_ID
```

**Solution:**
```bash
./chaincode.sh container-restart
```

### Issue 6: "Certificate signed by unknown authority"

**Cause:** Missing TLS certificates

**Solution:**
```bash
# TLS certs are auto-copied in approve/commit commands
./chaincode.sh approve 1.16 6
./chaincode.sh commit 1.16 6
```

## Best Practices

### 1. Version Numbering
- Use semantic versioning: `MAJOR.MINOR`
- Increment MINOR for updates: 1.15 → 1.16
- Increment MAJOR for breaking changes: 1.16 → 2.0

### 2. Testing Before Deployment
```bash
# Build and test locally first
cd chaincodes/coffee
go build
go test ./...

# Then deploy
cd ../..
./chaincode.sh upgrade 1.16 6
```

### 3. Backup Before Upgrade
```bash
# Backup current docker-compose
cp docker-compose-fabric.yml docker-compose-fabric.yml.backup

# Document current state
./chaincode.sh query > chaincode-state-before-upgrade.txt
```

### 4. Verify After Deployment
```bash
# Query status
./chaincode.sh query

# Test invocation
./chaincode.sh test

# Check container
./chaincode.sh container-logs 50

# Test via API
curl http://localhost:3001/api/v1/contracts

# Test via UI
# Open browser: http://localhost:3000
```

### 5. Monitor Logs
```bash
# Chaincode container
docker logs -f coffee-chaincode

# API server logs
# Check running terminal

# Peer logs
docker logs peer0.ecta.cecbs.et --tail 100
```

## Quick Troubleshooting Checklist

When deployment fails, check in this order:

1. ✅ **Package created?**
   ```bash
   ls -lh chaincodes/coffee/coffee_*.tgz
   ```

2. ✅ **Installed on all peers?**
   ```bash
   ./chaincode.sh list-installed ecta
   ```

3. ✅ **All orgs approved?**
   ```bash
   ./chaincode.sh check-ready 1.16 6
   ```

4. ✅ **Committed to channel?**
   ```bash
   ./chaincode.sh query
   ```

5. ✅ **Container running with correct package ID?**
   ```bash
   docker ps | grep coffee-chaincode
   docker exec coffee-chaincode env | grep CORE_CHAINCODE_ID_NAME
   ```

6. ✅ **Peers connecting to container?**
   ```bash
   docker logs coffee-chaincode --tail 50
   ```

7. ✅ **API can query chaincode?**
   ```bash
   ./chaincode.sh test
   ```

## Additional Resources

- **Chaincode Source:** `chaincodes/coffee/`
- **Docker Compose:** `docker-compose-fabric.yml`
- **API Integration:** `api/src/services/fabricService.ts`
- **Hyperledger Fabric Docs:** https://hyperledger-fabric.readthedocs.io/

## Support

For issues or questions:
1. Check logs: `./chaincode.sh container-logs 100`
2. Verify status: `./chaincode.sh query`
3. Test invocation: `./chaincode.sh test`
4. Review this guide's troubleshooting section
