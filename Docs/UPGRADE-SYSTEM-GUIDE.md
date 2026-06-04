# CECBS Chaincode Upgrade System
**Professional Upgrade & Maintenance Guide**  
**Version:** 1.0  
**Created:** June 4, 2026

---

## Overview

This guide covers the professional upgrade system for CECBS chaincode deployments. The system provides automated, safe, and repeatable upgrades with full validation and rollback capabilities.

---

## Quick Start

### Upgrade to New Version

```powershell
# Basic upgrade
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5"

# Upgrade with options
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -SkipTests -SkipBackup

# Dry run (no changes made)
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -DryRun
```

### Clean Obsolete Files

```powershell
# Preview what will be removed
.\scripts\cleanup-codebase.ps1 -DryRun

# Perform cleanup
.\scripts\cleanup-codebase.ps1

# Force cleanup without confirmation
.\scripts\cleanup-codebase.ps1 -Force
```

---

## Upgrade System Architecture

### Workflow Stages

```
┌──────────────────────────────────────────────────┐
│  1. Pre-Upgrade Validation                       │
│     • Version validation                         │
│     • Source file checks                         │
│     • Infrastructure health                      │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  2. Backup                                        │
│     • Source code snapshot                       │
│     • Current package archive                    │
│     • Timestamped backup directory              │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  3. Build Process                                 │
│     • Compile Go code                            │
│     • Create Docker image                        │
│     • Generate external package                  │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  4. Deployment                                    │
│     • Install on all 6 peers                     │
│     • Approve for all organizations              │
│     • Commit to channel                          │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  5. Container Management                          │
│     • Stop old container                         │
│     • Start new with correct CCID                │
│     • Verify startup                             │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  6. Post-Upgrade Validation                       │
│     • Query tests                                │
│     • Version verification                       │
│     • Log creation                               │
└──────────────────────────────────────────────────┘
```

---

## Upgrade Script Features

### ✅ Automated Checks
- Version format validation
- Sequence number calculation
- Source file validation
- Docker health check
- Peer availability check
- Current version detection

### ✅ Safe Operations
- Automatic backups before upgrade
- Dry-run mode for testing
- Rollback-ready architecture
- Upgrade logging
- Error handling with clear messages

### ✅ Professional Output
- Color-coded progress indicators
- Step-by-step status updates
- Detailed error messages
- Summary report
- Upgrade log generation

---

## Preparing for an Upgrade

### 1. Update Chaincode Source

Edit the Go files in `chaincodes/coffee/`:
- `main.go` - Core ECTA functions
- `banking.go` - Banking/LC operations
- `forex.go` - Forex management
- `customs.go` - Customs declarations
- `payment.go` - Payment processing
- `ecx.go` - ECX operations

### 2. Test Locally

```powershell
# Compile and test
cd chaincodes/coffee
go build -o test.exe .
```

### 3. Update go.mod (if dependencies changed)

```bash
cd chaincodes/coffee
go mod tidy
```

### 4. Update Dockerfile (if needed)

The Dockerfile is at `chaincodes/coffee/Dockerfile`

---

## Upgrade Process Details

### Version Requirements

- **Format:** `X.Y` (e.g., `1.5`, `2.0`)
- **Rule:** New version must be > current version
- **Sequence:** Automatically incremented

### What Gets Upgraded

1. **Chaincode Binary**
   - Recompiled from latest source
   - Built for Linux (amd64)
   - Packaged in Docker image

2. **Docker Image**
   - Tagged with new version
   - Includes updated binary
   - Uses same base image (alpine:3.18)

3. **External Package**
   - CaaS package with new label
   - Connection.json preserved
   - Metadata updated

4. **Peer Installation**
   - Installed on all 6 peers simultaneously
   - Package ID generated
   - Verified on each peer

5. **Channel Commitment**
   - Approved by all 6 organizations
   - Sequence incremented
   - Committed with all peers endorsing

6. **Container**
   - New container with updated image
   - Correct CCID environment variable
   - Network connectivity verified

---

## Upgrade Parameters

### Required Parameters

```powershell
-NewVersion <string>
```
The new version number (e.g., "1.5")

### Optional Parameters

```powershell
-ChaincodePath <string>
```
Path to chaincode directory (default: `chaincodes/coffee`)

```powershell
-SkipTests
```
Skip post-upgrade validation tests

```powershell
-SkipBackup
```
Skip backup creation (not recommended for production)

```powershell
-DryRun
```
Simulate upgrade without making changes

---

## Upgrade Examples

### Standard Upgrade
```powershell
# Upgrade from v1.4 to v1.5
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5"
```

**What happens:**
1. Validates v1.5 > v1.4
2. Creates backup in `archive/chaincode-backups/`
3. Builds chaincode
4. Creates image `coffee-chaincode:1.5`
5. Installs on all peers
6. Approves and commits
7. Restarts container
8. Runs validation tests
9. Creates upgrade log

### Quick Upgrade (Skip Backup)
```powershell
# For development/testing only
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -SkipBackup
```

### Dry Run
```powershell
# See what would happen without making changes
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -DryRun
```

---

## Post-Upgrade Validation

### Automatic Tests

The script runs these tests automatically:

1. **Query Test**
   - Executes `QueryAllExporters`
   - Verifies response format
   - Ensures no errors

2. **Version Verification**
   - Queries committed chaincode
   - Confirms version and sequence
   - Validates all approvals

### Manual Verification

After upgrade, verify:

```powershell
# 1. Check container logs
docker logs coffee-chaincode

# 2. Test API endpoint
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/exporters"

# 3. Query from peer
docker exec peer0.ecta.cecbs.et peer chaincode query `
  -C coffeechannel -n coffee `
  -c '{"function":"QueryAllExporters","Args":[]}'

# 4. Check committed version
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted `
  -C coffeechannel -n coffee
```

---

## Rollback Procedure

### When to Rollback

- New version has critical bugs
- Performance degradation
- Data integrity issues
- Failed validation tests

### Rollback Steps

1. **Stop Current Container**
```powershell
docker stop coffee-chaincode
docker rm coffee-chaincode
```

2. **Find Previous Package ID**
```powershell
# Check backup directory
$backupDir = Get-ChildItem "archive/chaincode-backups" | Sort-Object -Descending | Select-Object -First 1
```

3. **Approve Previous Version**
```powershell
# Example: Rolling back to v1.4, sequence 6
$PKG_ID = "coffee_1.4:<hash_from_backup>"

# Approve for each org (see install-v1.4-now.ps1 for template)
```

4. **Commit Previous Version**
```powershell
# Commit with incremented sequence (e.g., 7)
```

5. **Restart with Old Image**
```powershell
docker run -d --name coffee-chaincode `
  --network cecbs-network `
  -p 9999:9999 `
  -e CORE_CHAINCODE_ID_NAME="$PKG_ID" `
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" `
  coffee-chaincode:1.4
```

---

## Codebase Cleanup

### Purpose

Remove obsolete files to maintain a clean, professional codebase:
- Old chaincode packages (v1.0, v1.1, v1.2, v1.3)
- Temporary/debug files
- Obsolete deployment scripts
- Outdated documentation

### Cleanup Script

```powershell
# Preview cleanup
.\scripts\cleanup-codebase.ps1 -DryRun

# Execute cleanup
.\scripts\cleanup-codebase.ps1
```

### What Gets Removed

#### Root Directory
- Old `.tar.gz` packages
- Debug HTML files
- Temporary text files
- Orphaned TLS certificates

#### Scripts Directory
- Old deployment scripts (v1.2, v1.3)
- Failed deployment attempts
- Test scripts for old versions
- Diagnostic scripts

#### Documentation
- Outdated deployment guides
- Old session summaries
- Obsolete status reports

#### Chaincode Directory
- Old package directories
- Extracted packages
- Obsolete binaries

### What's Preserved

✅ Current source code (`.go` files)  
✅ Active v1.4 package  
✅ Configuration files  
✅ Build artifacts  
✅ Essential scripts  
✅ Current documentation  
✅ Backup archives

---

## Best Practices

### Before Upgrading

1. ✅ **Test Locally**
   - Build and test new code
   - Verify all functions work
   - Check for compilation errors

2. ✅ **Create Manual Backup**
   - Even though script creates backup
   - Extra safety for production

3. ✅ **Document Changes**
   - List new features
   - Note breaking changes
   - Update API documentation

4. ✅ **Notify Stakeholders**
   - Schedule maintenance window
   - Communicate expected downtime
   - Prepare rollback plan

### During Upgrade

1. ✅ **Monitor Progress**
   - Watch script output
   - Check for errors
   - Verify each step completes

2. ✅ **Keep Terminal Open**
   - Don't close PowerShell window
   - Capture full output
   - Save logs if needed

### After Upgrading

1. ✅ **Verify All Portals**
   - ECTA Portal
   - NBE Portal
   - Banks Portal
   - Customs Portal
   - ECX Portal
   - Shipping Portal

2. ✅ **Monitor Logs**
   - Container logs
   - API logs
   - Peer logs

3. ✅ **Update Documentation**
   - Deployment guide
   - API changes
   - New features

4. ✅ **Create Release Notes**
   - Version number
   - Change summary
   - Known issues

---

## Troubleshooting

### Issue: Version Format Error

**Error:** "Invalid version format"

**Solution:**
```powershell
# Wrong
-NewVersion "v1.5"
-NewVersion "1.5.0"

# Correct
-NewVersion "1.5"
```

### Issue: Build Fails

**Error:** "Go build failed"

**Check:**
1. All `.go` files in `chaincodes/coffee`
2. `go.mod` is valid
3. Dependencies are available
4. No syntax errors

**Fix:**
```bash
cd chaincodes/coffee
go mod tidy
go build -v .
```

### Issue: Docker Build Fails

**Error:** "Docker build failed"

**Check:**
1. Docker is running
2. Dockerfile exists
3. `chaincode-linux` binary exists

**Fix:**
```powershell
docker system prune
cd chaincodes/coffee
docker build -t test .
```

### Issue: Peer Installation Fails

**Error:** "Failed on [org]"

**Check:**
1. All peers are running
2. MSP paths are correct
3. Package file exists

**Verify:**
```powershell
docker ps | Select-String "peer0"
Test-Path "chaincodes/coffee/coffee-v15-ccaas.tar.gz"
```

### Issue: Container Won't Start

**Error:** "Container failed to start"

**Check logs:**
```powershell
docker logs coffee-chaincode
```

**Common causes:**
- Missing CORE_CHAINCODE_ID_NAME
- Port 9999 already in use
- Network not accessible

**Fix:**
```powershell
docker stop coffee-chaincode
docker rm coffee-chaincode
# Run upgrade script again
```

### Issue: Query Test Fails

**Error:** "Query test failed"

**Wait and retry:**
```powershell
Start-Sleep -Seconds 10
docker exec peer0.ecta.cecbs.et peer chaincode query `
  -C coffeechannel -n coffee `
  -c '{"function":"QueryAllExporters","Args":[]}'
```

**If still fails:**
- Check container logs
- Verify CCID matches package ID
- Restart container

---

## Upgrade Log

The upgrade script creates a log at:
```
archive/chaincode-backups/upgrade-log.json
```

**Format:**
```json
[
  {
    "timestamp": "2026-06-04 13:30:00",
    "fromVersion": "1.4",
    "toVersion": "1.5",
    "fromSequence": 5,
    "toSequence": 6,
    "packageId": "coffee_1.5:abc123...",
    "status": "success"
  }
]
```

---

## File Structure After Cleanup

```
CEX/
├── api/                          # API server
├── ui/                           # Frontend
├── blockchain/                   # Network config
├── chaincodes/
│   └── coffee/
│       ├── main.go               # ✅ Current source
│       ├── banking.go
│       ├── forex.go
│       ├── customs.go
│       ├── payment.go
│       ├── ecx.go
│       ├── go.mod
│       ├── Dockerfile
│       ├── connection.json
│       ├── chaincode-linux       # ✅ Current binary
│       ├── coffee-v14-ccaas.tar.gz  # ✅ Current package
│       ├── package-v14/          # ✅ Package artifacts
│       └── vendor/
├── scripts/
│   ├── upgrade-chaincode-version.ps1  # ✅ Upgrade system
│   ├── cleanup-codebase.ps1           # ✅ Cleanup tool
│   ├── install-v1.4-now.ps1           # ✅ Current deployment
│   ├── start.sh                       # ✅ Network start
│   ├── stop.sh                        # ✅ Network stop
│   └── init-db.sql                    # ✅ Database init
├── Docs/
│   ├── ARCHITECTURE.md                # ✅ System overview
│   ├── UPGRADE-SYSTEM-GUIDE.md        # ✅ This file
│   ├── CHAINCODE-V1.4-DEPLOYED-SUCCESS.md
│   └── API-DOCUMENTATION.md
├── archive/
│   └── chaincode-backups/             # ✅ Version backups
├── docker-compose-fabric.yml
├── .gitignore
└── README.md
```

---

## Security Considerations

### Package Integrity

- Packages are built from source
- No external downloads
- Deterministic builds
- Hash verification via package ID

### Access Control

- Admin MSP required for all operations
- TLS enabled on all communications
- Proper certificate validation
- No hardcoded credentials

### Audit Trail

- All upgrades logged
- Timestamps recorded
- Version history preserved
- Rollback capability maintained

---

## Support & Contact

### For Technical Issues

1. Check this guide first
2. Review error messages
3. Check container/peer logs
4. Consult ARCHITECTURE.md

### For Escalation

- Document the issue
- Include error messages
- Capture relevant logs
- Note steps to reproduce

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-04 | Initial release |

---

**End of Upgrade System Guide**
