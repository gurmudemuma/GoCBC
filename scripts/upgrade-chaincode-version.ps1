# CECBS Chaincode Upgrade Script
# Professional upgrade system for deploying new chaincode versions
# Created: June 4, 2026
# 
# Usage: .\upgrade-chaincode-version.ps1 -NewVersion "1.5" [-SkipTests] [-SkipBackup]
#
# This script handles the complete upgrade workflow:
# 1. Pre-upgrade validation
# 2. Backup current version
# 3. Build new chaincode
# 4. Create Docker image
# 5. Create external chaincode package
# 6. Install on all peers
# 7. Approve for all organizations
# 8. Commit to channel
# 9. Start container with correct CCID
# 10. Post-upgrade validation

param(
    [Parameter(Mandatory=$true)]
    [string]$NewVersion,
    
    [Parameter(Mandatory=$false)]
    [string]$ChaincodePath = "chaincodes/coffee",
    
    [switch]$SkipTests,
    [switch]$SkipBackup,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Configuration
$CHANNEL_NAME = "coffeechannel"
$CC_NAME = "coffee"
$ORDERER_CA = "/work/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
$WORK_DIR = (Get-Location).Path.Replace('\', '/')

# Organizations configuration
$ORGS = @(
    @{name="ecta"; port=7051; mspid="ECTAMSP"}
    @{name="ecx"; port=8051; mspid="ECXMSP"}
    @{name="banks"; port=9051; mspid="BanksMSP"}
    @{name="nbe"; port=10051; mspid="NBEMSP"}
    @{name="customs"; port=11051; mspid="CustomsMSP"}
    @{name="shipping"; port=12051; mspid="ShippingMSP"}
)

# Color functions
function Write-Step { param($msg) Write-Host "▶ $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Error-Custom { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  ℹ $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          CECBS Chaincode Upgrade System v1.0                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 1: PRE-UPGRADE VALIDATION
# ============================================================================
Write-Step "Step 1: Pre-upgrade validation"

# Check current committed version
try {
    $currentCommitted = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID="ECTAMSP" `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
        -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
        -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" `
        hyperledger/fabric-tools:2.5 `
        peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME --tls --cafile $ORDERER_CA 2>&1
    
    if ($currentCommitted -match "Version:\s+([0-9.]+).*Sequence:\s+(\d+)") {
        $CURRENT_VERSION = $matches[1]
        $CURRENT_SEQUENCE = [int]$matches[2]
        $NEW_SEQUENCE = $CURRENT_SEQUENCE + 1
        
        Write-Success "Current version: $CURRENT_VERSION (sequence $CURRENT_SEQUENCE)"
        Write-Success "New version: $NewVersion (sequence $NEW_SEQUENCE)"
    } else {
        Write-Error-Custom "Could not determine current version"
        exit 1
    }
} catch {
    Write-Error-Custom "Failed to query current chaincode: $_"
    exit 1
}

# Validate version format
if ($NewVersion -notmatch '^\d+\.\d+$') {
    Write-Error-Custom "Invalid version format. Use format: X.Y (e.g., 1.5)"
    exit 1
}

# Check if new version is greater
$curVer = [version]$CURRENT_VERSION
$newVer = [version]$NewVersion
if ($newVer -le $curVer) {
    Write-Error-Custom "New version ($NewVersion) must be greater than current version ($CURRENT_VERSION)"
    exit 1
}

# Check chaincode source files
$requiredFiles = @("main.go", "banking.go", "forex.go", "customs.go", "payment.go", "ecx.go", "go.mod", "Dockerfile", "connection.json")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path "$ChaincodePath/$file")) {
        Write-Error-Custom "Missing required file: $file"
        exit 1
    }
}
Write-Success "All source files present"

# Check Docker
try {
    docker ps | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error-Custom "Docker is not running"
    exit 1
}

# Check if all peers are running
$peerCount = 0
foreach ($org in $ORGS) {
    $peerStatus = docker ps --filter "name=peer0.$($org.name).cecbs.et" --format "{{.Status}}"
    if ($peerStatus -match "Up") {
        $peerCount++
    }
}
if ($peerCount -eq 6) {
    Write-Success "All 6 peers are running"
} else {
    Write-Error-Custom "Only $peerCount/6 peers are running"
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: BACKUP CURRENT VERSION
# ============================================================================
if (-not $SkipBackup) {
    Write-Step "Step 2: Creating backup"
    
    $backupDir = "archive/chaincode-backups/v$CURRENT_VERSION-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Backup source code
    Copy-Item "$ChaincodePath/*.go" $backupDir -Force
    Copy-Item "$ChaincodePath/go.mod" $backupDir -Force
    Copy-Item "$ChaincodePath/Dockerfile" $backupDir -Force
    
    # Backup current package if exists
    $currentPackage = "$ChaincodePath/coffee-v${CURRENT_VERSION//./}-ccaas.tar.gz"
    if (Test-Path $currentPackage) {
        Copy-Item $currentPackage "$backupDir/" -Force
    }
    
    Write-Success "Backup created: $backupDir"
    Write-Host ""
} else {
    Write-Info "Skipping backup (--SkipBackup)"
    Write-Host ""
}

# ============================================================================
# STEP 3: BUILD NEW CHAINCODE
# ============================================================================
Write-Step "Step 3: Building chaincode v$NewVersion"

if ($DryRun) {
    Write-Info "[DRY RUN] Would build chaincode"
} else {
    Push-Location $ChaincodePath
    try {
        # Set build environment
        $env:GOOS = "linux"
        $env:GOARCH = "amd64"
        $env:CGO_ENABLED = "0"
        
        # Build
        Write-Info "Compiling Go code..."
        go build -v -o chaincode-linux . 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            throw "Go build failed"
        }
        
        $binarySize = (Get-Item chaincode-linux).Length
        Write-Success "Binary built: chaincode-linux ($([math]::Round($binarySize/1KB, 2)) KB)"
    } finally {
        Pop-Location
    }
}
Write-Host ""

# ============================================================================
# STEP 4: CREATE DOCKER IMAGE
# ============================================================================
Write-Step "Step 4: Creating Docker image"

$imageName = "coffee-chaincode:$NewVersion"

if ($DryRun) {
    Write-Info "[DRY RUN] Would create Docker image: $imageName"
} else {
    Push-Location $ChaincodePath
    try {
        docker build -t $imageName . 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        Write-Success "Image created: $imageName"
    } finally {
        Pop-Location
    }
}
Write-Host ""

# ============================================================================
# STEP 5: CREATE EXTERNAL CHAINCODE PACKAGE
# ============================================================================
Write-Step "Step 5: Creating external chaincode package"

$packageName = "coffee-v${NewVersion//./}-ccaas.tar.gz"
$packageDir = "$ChaincodePath/package-v${NewVersion//./}"

if ($DryRun) {
    Write-Info "[DRY RUN] Would create package: $packageName"
} else {
    # Clean and create package directory
    if (Test-Path $packageDir) {
        Remove-Item -Recurse -Force $packageDir
    }
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    
    # Create connection.json
    $connectionJson = @{
        address = "coffee-chaincode:9999"
        dial_timeout = "10s"
        tls_required = $false
    } | ConvertTo-Json -Compress
    Set-Content -Path "$packageDir/connection.json" -Value $connectionJson -NoNewline
    
    # Create code.tar.gz
    tar -czf "$packageDir/code.tar.gz" -C $packageDir connection.json 2>&1 | Out-Null
    Remove-Item "$packageDir/connection.json"
    
    # Create metadata.json
    $metadataJson = @{
        type = "ccaas"
        label = "coffee_$NewVersion"
    } | ConvertTo-Json -Compress
    Set-Content -Path "$packageDir/metadata.json" -Value $metadataJson -NoNewline
    
    # Create final package
    tar -czf "$ChaincodePath/$packageName" -C $packageDir metadata.json code.tar.gz 2>&1 | Out-Null
    
    Write-Success "Package created: $packageName"
}
Write-Host ""

# ============================================================================
# STEP 6: INSTALL ON ALL PEERS
# ============================================================================
Write-Step "Step 6: Installing on all peers"

$packagePath = "/work/$ChaincodePath/$packageName"

foreach ($org in $ORGS) {
    Write-Info "Installing on $($org.name)..."
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would install on $($org.name)"
        continue
    }
    
    $output = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID="$($org.mspid)" `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/$($org.name).cecbs.et/peers/peer0.$($org.name).cecbs.et/tls/ca.crt" `
        -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/$($org.name).cecbs.et/users/Admin@$($org.name).cecbs.et/msp" `
        -e CORE_PEER_ADDRESS="peer0.$($org.name).cecbs.et:$($org.port)" `
        hyperledger/fabric-tools:2.5 `
        peer lifecycle chaincode install $packagePath 2>&1
    
    if ($output -match "Chaincode code package identifier") {
        Write-Success "Installed on $($org.name)"
    } elseif ($output -match "already successfully installed") {
        Write-Success "Already installed on $($org.name)"
    } else {
        Write-Error-Custom "Failed on $($org.name): $output"
        exit 1
    }
}
Write-Host ""

# ============================================================================
# STEP 7: GET PACKAGE ID
# ============================================================================
Write-Step "Step 7: Retrieving package ID"

if ($DryRun) {
    $CC_PACKAGE_ID = "coffee_${NewVersion}:dummy_package_id_for_dry_run"
    Write-Info "[DRY RUN] Using dummy package ID"
} else {
    $queryOutput = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID="ECTAMSP" `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
        -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
        -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" `
        hyperledger/fabric-tools:2.5 `
        peer lifecycle chaincode queryinstalled 2>&1
    
    if ($queryOutput -match "coffee_${NewVersion}:([a-f0-9]{64})") {
        $CC_PACKAGE_ID = "coffee_${NewVersion}:$($matches[1])"
        Write-Success "Package ID: $CC_PACKAGE_ID"
    } else {
        Write-Error-Custom "Could not find package ID"
        exit 1
    }
}
Write-Host ""

# ============================================================================
# STEP 8: APPROVE FOR ALL ORGANIZATIONS
# ============================================================================
Write-Step "Step 8: Approving for all organizations"

foreach ($org in $ORGS) {
    Write-Info "Approving for $($org.name)..."
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would approve for $($org.name)"
        continue
    }
    
    docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID="$($org.mspid)" `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/$($org.name).cecbs.et/peers/peer0.$($org.name).cecbs.et/tls/ca.crt" `
        -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/$($org.name).cecbs.et/users/Admin@$($org.name).cecbs.et/msp" `
        -e CORE_PEER_ADDRESS="peer0.$($org.name).cecbs.et:$($org.port)" `
        hyperledger/fabric-tools:2.5 `
        peer lifecycle chaincode approveformyorg `
            -o orderer.cecbs.et:7050 `
            --ordererTLSHostnameOverride orderer.cecbs.et `
            --channelID $CHANNEL_NAME `
            --name $CC_NAME `
            --version $NewVersion `
            --package-id "$CC_PACKAGE_ID" `
            --sequence $NEW_SEQUENCE `
            --tls `
            --cafile $ORDERER_CA 2>&1 | Out-Null
    
    Write-Success "Approved for $($org.name)"
}
Write-Host ""

# ============================================================================
# STEP 9: COMMIT TO CHANNEL
# ============================================================================
Write-Step "Step 9: Committing to channel"

if ($DryRun) {
    Write-Info "[DRY RUN] Would commit to channel"
} else {
    $commitOutput = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID="ECTAMSP" `
        -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
        -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
        -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" `
        hyperledger/fabric-tools:2.5 `
        peer lifecycle chaincode commit `
            -o orderer.cecbs.et:7050 `
            --ordererTLSHostnameOverride orderer.cecbs.et `
            --channelID $CHANNEL_NAME `
            --name $CC_NAME `
            --version $NewVersion `
            --sequence $NEW_SEQUENCE `
            --tls `
            --cafile $ORDERER_CA `
            --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt `
            --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt `
            --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt `
            --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt `
            --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt `
            --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt 2>&1
    
    if ($commitOutput -match "success|Successfully|committed") {
        Write-Success "Committed to channel"
    } else {
        Write-Error-Custom "Commit failed: $commitOutput"
        exit 1
    }
}
Write-Host ""

# ============================================================================
# STEP 10: RESTART CHAINCODE CONTAINER
# ============================================================================
Write-Step "Step 10: Restarting chaincode container"

if ($DryRun) {
    Write-Info "[DRY RUN] Would restart container"
} else {
    # Stop old container
    docker stop coffee-chaincode 2>&1 | Out-Null
    docker rm coffee-chaincode 2>&1 | Out-Null
    Write-Info "Stopped old container"
    
    # Start new container with correct CCID
    docker run -d --name coffee-chaincode `
        --network cecbs-network `
        -p 9999:9999 `
        -e CORE_CHAINCODE_ID_NAME="$CC_PACKAGE_ID" `
        -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" `
        $imageName 2>&1 | Out-Null
    
    Start-Sleep -Seconds 3
    
    # Check if running
    $containerStatus = docker ps --filter "name=coffee-chaincode" --format "{{.Status}}"
    if ($containerStatus -match "Up") {
        Write-Success "Container started successfully"
    } else {
        Write-Error-Custom "Container failed to start"
        docker logs coffee-chaincode
        exit 1
    }
}
Write-Host ""

# ============================================================================
# STEP 11: POST-UPGRADE VALIDATION
# ============================================================================
if (-not $SkipTests) {
    Write-Step "Step 11: Post-upgrade validation"
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would run validation tests"
    } else {
        Start-Sleep -Seconds 5
        
        # Test query
        Write-Info "Testing chaincode query..."
        $testQuery = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
            -e CORE_PEER_TLS_ENABLED=true `
            -e CORE_PEER_LOCALMSPID="ECTAMSP" `
            -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
            -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
            -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" `
            hyperledger/fabric-tools:2.5 `
            peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{\"function\":\"QueryAllExporters\",\"Args\":[]}' --tls --cafile $ORDERER_CA 2>&1
        
        if ($testQuery -match "^\[") {
            Write-Success "Query test passed"
        } else {
            Write-Error-Custom "Query test failed: $testQuery"
            exit 1
        }
        
        # Verify committed version
        $verifyCommit = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work `
            -e CORE_PEER_TLS_ENABLED=true `
            -e CORE_PEER_LOCALMSPID="ECTAMSP" `
            -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
            -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
            -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" `
            hyperledger/fabric-tools:2.5 `
            peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME --tls --cafile $ORDERER_CA 2>&1
        
        if ($verifyCommit -match "Version:\s+$NewVersion.*Sequence:\s+$NEW_SEQUENCE") {
            Write-Success "Version verified on channel"
        } else {
            Write-Error-Custom "Version verification failed"
            exit 1
        }
    }
    Write-Host ""
} else {
    Write-Info "Skipping tests (--SkipTests)"
    Write-Host ""
}

# ============================================================================
# UPGRADE COMPLETE
# ============================================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  UPGRADE SUCCESSFUL!                           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Upgrade Summary:" -ForegroundColor Cyan
Write-Host "  Previous Version: $CURRENT_VERSION (sequence $CURRENT_SEQUENCE)" -ForegroundColor White
Write-Host "  New Version: $NewVersion (sequence $NEW_SEQUENCE)" -ForegroundColor White
Write-Host "  Package ID: $CC_PACKAGE_ID" -ForegroundColor White
Write-Host "  Container: coffee-chaincode:$NewVersion" -ForegroundColor White
Write-Host "  Status: Operational" -ForegroundColor Green
Write-Host ""

if (-not $DryRun) {
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Monitor container logs: docker logs coffee-chaincode -f" -ForegroundColor White
    Write-Host "  2. Test API endpoints thoroughly" -ForegroundColor White
    Write-Host "  3. Update documentation with new features" -ForegroundColor White
    Write-Host "  4. Notify stakeholders of the upgrade" -ForegroundColor White
    Write-Host ""
    
    # Create upgrade log
    $upgradeLog = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        fromVersion = $CURRENT_VERSION
        toVersion = $NewVersion
        fromSequence = $CURRENT_SEQUENCE
        toSequence = $NEW_SEQUENCE
        packageId = $CC_PACKAGE_ID
        status = "success"
    } | ConvertTo-Json
    
    $logFile = "archive/chaincode-backups/upgrade-log.json"
    if (Test-Path $logFile) {
        $existingLog = Get-Content $logFile | ConvertFrom-Json
        $upgrades = @($existingLog) + $upgradeLog | ConvertTo-Json
        Set-Content -Path $logFile -Value $upgrades
    } else {
        Set-Content -Path $logFile -Value "[$upgradeLog]"
    }
}
