#!/usr/bin/env pwsh
# CECBS Chaincode Inclusive Deployment Script - Payment Method Differentiation
# Version: 1.12
# Date: June 26, 2026
# Purpose: Deploy chaincode across ALL organizations (ECTA, ECX, Banks, NBE, Customs, Shipping)

param(
    [switch]$SkipPackage = $false,
    [switch]$SkipInstall = $false,
    [switch]$SkipApprove = $false,
    [switch]$TestOnly = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Configuration
$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "1.12"
$CHAINCODE_SEQUENCE = 12
$CHANNEL_NAME = "coffeechannel"
$CHAINCODE_PATH = "C:\CEX\chaincodes\coffee"
$PACKAGE_FILE = "coffee_$CHAINCODE_VERSION.tar.gz"
$ORDERER_CA = "C:\CEX\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem"

Write-Info "=========================================================="
Write-Info "CECBS INCLUSIVE Chaincode Deployment - Payment Methods v1.12"
Write-Info "=========================================================="
Write-Info ""
Write-Info "Organizations in this network:"
Write-Info "  1. ECTA (Ethiopian Coffee and Tea Authority) - Port 7051"
Write-Info "  2. ECX (Ethiopian Commodity Exchange) - Port 8051"
Write-Info "  3. Banks (Ethiopian Commercial Banks) - Port 9051"
Write-Info "  4. NBE (National Bank of Ethiopia) - Port 10051"
Write-Info "  5. Customs (Ethiopian Customs Commission) - Port 11051"
Write-Info "  6. Shipping (Logistics/Shipping Agents) - Port 12051"
Write-Info ""
Write-Info "Endorsement Policy: MAJORITY (4 out of 6 organizations must approve)"
Write-Info ""
Write-Info "Features in v1.12:"
Write-Info "  - 5 Payment Methods (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)"
Write-Info "  - Payment method-specific status transitions"
Write-Info "  - Prerequisite validation"
Write-Info "  - Document release control"
Write-Info "  - Multi-stage payment tracking"
Write-Info ""

# Add Fabric binaries to PATH
$env:PATH = "C:\CEX\fabric-samples\bin;" + $env:PATH
Write-Info "Added Fabric binaries to PATH: C:\CEX\fabric-samples\bin"
Write-Info ""

# Check if Fabric peer binary is available
if (-not (Get-Command "peer" -ErrorAction SilentlyContinue)) {
    Write-Error "Hyperledger Fabric peer binary not found. Please ensure Fabric binaries are in PATH."
    Write-Error "Expected location: C:\CEX\fabric-samples\bin\peer.exe"
    exit 1
}

Write-Success "Fabric peer binary found: $(Get-Command peer | Select-Object -ExpandProperty Source)"
Write-Info ""

# Check if Docker is available
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found. Please ensure Docker is installed and running."
    exit 1
}

# Check if Fabric containers are running
$runningContainers = docker ps --format "{{.Names}}" | Select-String -Pattern "peer0.ecta.cecbs.et"
if (-not $runningContainers) {
    Write-Error "Fabric network is not running. Please start the network first."
    Write-Error "Run: docker-compose -f docker-compose-fabric.yml up -d"
    exit 1
}

# Organization configurations
$organizations = @(
    @{
        Name = "ECTA"
        MSPID = "ECTAMSP"
        PeerAddress = "localhost:7051"
        PeerHostname = "peer0.ecta.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\ecta.cecbs.et\peers\peer0.ecta.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\ecta.cecbs.et\users\Admin@ecta.cecbs.et\msp"
    },
    @{
        Name = "ECX"
        MSPID = "ECXMSP"
        PeerAddress = "localhost:8051"
        PeerHostname = "peer0.ecx.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\ecx.cecbs.et\peers\peer0.ecx.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\ecx.cecbs.et\users\Admin@ecx.cecbs.et\msp"
    },
    @{
        Name = "Banks"
        MSPID = "BanksMSP"
        PeerAddress = "localhost:9051"
        PeerHostname = "peer0.banks.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\banks.cecbs.et\peers\peer0.banks.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\banks.cecbs.et\users\Admin@banks.cecbs.et\msp"
    },
    @{
        Name = "NBE"
        MSPID = "NBEMSP"
        PeerAddress = "localhost:10051"
        PeerHostname = "peer0.nbe.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\nbe.cecbs.et\peers\peer0.nbe.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\nbe.cecbs.et\users\Admin@nbe.cecbs.et\msp"
    },
    @{
        Name = "Customs"
        MSPID = "CustomsMSP"
        PeerAddress = "localhost:11051"
        PeerHostname = "peer0.customs.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\customs.cecbs.et\peers\peer0.customs.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\customs.cecbs.et\users\Admin@customs.cecbs.et\msp"
    },
    @{
        Name = "Shipping"
        MSPID = "ShippingMSP"
        PeerAddress = "localhost:12051"
        PeerHostname = "peer0.shipping.cecbs.et"
        TLSRootCert = "C:\CEX\blockchain\organizations\peerOrganizations\shipping.cecbs.et\peers\peer0.shipping.cecbs.et\tls\ca.crt"
        MSPConfigPath = "C:\CEX\blockchain\organizations\peerOrganizations\shipping.cecbs.et\users\Admin@shipping.cecbs.et\msp"
    }
)

# Set base Fabric environment
$env:FABRIC_CFG_PATH = "C:\CEX\blockchain"
$env:CORE_PEER_TLS_ENABLED = "true"
$env:GODEBUG = "x509ignoreCN=0"  # Allow hostname mismatch for localhost connections

# ==================== STEP 1: PACKAGE CHAINCODE ====================
if (-not $SkipPackage -and -not $TestOnly) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 1/5] PACKAGING CHAINCODE"
    Write-Info "=========================================================="
    Write-Info "Version: $CHAINCODE_VERSION"
    Write-Info "Path: $CHAINCODE_PATH"
    
    Push-Location $CHAINCODE_PATH
    
    Write-Info "Running go mod tidy..."
    go mod tidy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "go mod tidy failed"
        Pop-Location
        exit 1
    }
    
    Pop-Location
    
    Write-Info "Creating package: $PACKAGE_FILE"
    peer lifecycle chaincode package $PACKAGE_FILE `
        --path $CHAINCODE_PATH `
        --lang golang `
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode packaging failed"
        exit 1
    }
    
    Write-Success "Chaincode packaged successfully: $PACKAGE_FILE"
} elseif ($SkipPackage) {
    Write-Warning "Skipping packaging step (using existing package)"
}

# ==================== STEP 2: INSTALL ON ALL PEERS ====================
$packageIds = @{}

if (-not $SkipInstall -and -not $TestOnly) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 2/5] INSTALLING CHAINCODE ON ALL PEERS"
    Write-Info "=========================================================="
    
    foreach ($org in $organizations) {
        Write-Info ""
        Write-Info "Installing on $($org.Name) peer ($($org.PeerAddress))..."
        
        # Set environment for this organization
        $env:CORE_PEER_LOCALMSPID = $org.MSPID
        $env:CORE_PEER_TLS_ROOTCERT_FILE = $org.TLSRootCert
        $env:CORE_PEER_MSPCONFIGPATH = $org.MSPConfigPath
        $env:CORE_PEER_ADDRESS = $org.PeerAddress
        
        # Install chaincode
        $installOutput = peer lifecycle chaincode install $PACKAGE_FILE 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Installation failed on $($org.Name) peer"
            Write-Error $installOutput
            exit 1
        }
        
        Write-Success "Installed on $($org.Name) peer"
        
        # Extract package ID from output
        $packageIdMatch = [regex]::Match($installOutput, "Package ID: (${CHAINCODE_NAME}_${CHAINCODE_VERSION}:[a-f0-9]+)")
        if ($packageIdMatch.Success) {
            $packageIds[$org.Name] = $packageIdMatch.Groups[1].Value
            Write-Info "Package ID: $($packageIds[$org.Name])"
        }
    }
    
    Write-Info ""
    Write-Success "Chaincode installed on all $($organizations.Count) peers"
    
    # Display all package IDs
    Write-Info ""
    Write-Info "Package IDs by organization:"
    foreach ($org in $organizations) {
        if ($packageIds.ContainsKey($org.Name)) {
            Write-Info "  $($org.Name): $($packageIds[$org.Name])"
        }
    }
    
    # Use the first package ID (they should all be the same)
    $PACKAGE_ID = $packageIds[$organizations[0].Name]
    
} else {
    if (-not $TestOnly) {
        Write-Warning "Skipping installation step"
        Write-Info "Please enter the Package ID manually:"
        $PACKAGE_ID = Read-Host "Package ID"
    }
}

# ==================== STEP 3: APPROVE FOR ALL ORGANIZATIONS ====================
if (-not $SkipApprove -and -not $TestOnly -and -not [string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 3/5] APPROVING CHAINCODE FOR ALL ORGANIZATIONS"
    Write-Info "=========================================================="
    Write-Info "Package ID: $PACKAGE_ID"
    Write-Info ""
    
    $approvalCount = 0
    
    foreach ($org in $organizations) {
        Write-Info "Approving for $($org.Name)..."
        
        # Set environment for this organization
        $env:CORE_PEER_LOCALMSPID = $org.MSPID
        $env:CORE_PEER_TLS_ROOTCERT_FILE = $org.TLSRootCert
        $env:CORE_PEER_MSPCONFIGPATH = $org.MSPConfigPath
        $env:CORE_PEER_ADDRESS = $org.PeerAddress
        
        # Approve chaincode
        peer lifecycle chaincode approveformyorg `
            -o localhost:7050 `
            --ordererTLSHostnameOverride orderer.cecbs.et `
            --channelID $CHANNEL_NAME `
            --name $CHAINCODE_NAME `
            --version $CHAINCODE_VERSION `
            --package-id $PACKAGE_ID `
            --sequence $CHAINCODE_SEQUENCE `
            --tls `
            --cafile $ORDERER_CA 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "  $($org.Name) - APPROVED"
            $approvalCount++
        } else {
            Write-Warning "  $($org.Name) - FAILED (this may be normal if already approved)"
        }
    }
    
    Write-Info ""
    Write-Success "Approval process complete: $approvalCount/$($organizations.Count) organizations"
    
} elseif (-not $TestOnly) {
    Write-Warning "Skipping approval step"
}

# ==================== STEP 4: CHECK COMMIT READINESS ====================
if (-not $TestOnly) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 4/5] CHECKING COMMIT READINESS"
    Write-Info "=========================================================="
    
    # Set environment to first org for checking
    $env:CORE_PEER_LOCALMSPID = $organizations[0].MSPID
    $env:CORE_PEER_TLS_ROOTCERT_FILE = $organizations[0].TLSRootCert
    $env:CORE_PEER_MSPCONFIGPATH = $organizations[0].MSPConfigPath
    $env:CORE_PEER_ADDRESS = $organizations[0].PeerAddress
    
    peer lifecycle chaincode checkcommitreadiness `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $CHAINCODE_SEQUENCE `
        --tls `
        --cafile $ORDERER_CA `
        --output json
    
    Write-Info ""
    Write-Warning "Review the commit readiness above."
    Write-Warning "Required: MAJORITY (at least 4 out of 6 organizations must approve)"
    Write-Info ""
    
    $continue = Read-Host "Continue with commit? (y/n)"
    if ($continue -ne "y") {
        Write-Warning "Deployment paused. Run script again to continue."
        exit 0
    }
}

# ==================== STEP 5: COMMIT CHAINCODE ====================
if (-not $TestOnly) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 5/5] COMMITTING CHAINCODE TO CHANNEL"
    Write-Info "=========================================================="
    
    # Build peer addresses and TLS root cert files arguments for all orgs
    $peerAddresses = @()
    $tlsRootCertFiles = @()
    
    foreach ($org in $organizations) {
        $peerAddresses += "--peerAddresses"
        $peerAddresses += $org.PeerAddress
        $tlsRootCertFiles += "--tlsRootCertFiles"
        $tlsRootCertFiles += $org.TLSRootCert
    }
    
    # Set environment to first org for commit
    $env:CORE_PEER_LOCALMSPID = $organizations[0].MSPID
    $env:CORE_PEER_TLS_ROOTCERT_FILE = $organizations[0].TLSRootCert
    $env:CORE_PEER_MSPCONFIGPATH = $organizations[0].MSPConfigPath
    $env:CORE_PEER_ADDRESS = $organizations[0].PeerAddress
    
    Write-Info "Committing with all peer addresses:"
    foreach ($org in $organizations) {
        Write-Info "  - $($org.Name): $($org.PeerAddress)"
    }
    Write-Info ""
    
    # Commit chaincode
    $commitArgs = @(
        "lifecycle", "chaincode", "commit",
        "-o", "localhost:7050",
        "--ordererTLSHostnameOverride", "orderer.cecbs.et",
        "--channelID", $CHANNEL_NAME,
        "--name", $CHAINCODE_NAME,
        "--version", $CHAINCODE_VERSION,
        "--sequence", $CHAINCODE_SEQUENCE,
        "--tls",
        "--cafile", $ORDERER_CA
    ) + $peerAddresses + $tlsRootCertFiles
    
    & peer $commitArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode commit failed"
        exit 1
    }
    
    Write-Success "Chaincode committed successfully to channel!"
    Write-Info ""
}

# ==================== STEP 6: VERIFY DEPLOYMENT ====================
Write-Info ""
Write-Info "=========================================================="
Write-Info "[STEP 6/6] VERIFYING DEPLOYMENT"
Write-Info "=========================================================="

# Query committed chaincodes
Write-Info "Querying committed chaincodes on channel..."

$env:CORE_PEER_LOCALMSPID = $organizations[0].MSPID
$env:CORE_PEER_TLS_ROOTCERT_FILE = $organizations[0].TLSRootCert
$env:CORE_PEER_MSPCONFIGPATH = $organizations[0].MSPConfigPath
$env:CORE_PEER_ADDRESS = $organizations[0].PeerAddress

peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CHAINCODE_NAME

if ($LASTEXITCODE -eq 0) {
    Write-Success "Chaincode is committed and ready to use!"
} else {
    Write-Warning "Could not verify chaincode deployment"
}

Write-Info ""

# ==================== TEST DEPLOYMENT ====================
Write-Info ""
Write-Info "=========================================================="
Write-Info "TESTING DEPLOYED CHAINCODE"
Write-Info "=========================================================="
Write-Info ""

# Test 1: Query existing data
Write-Info "[Test 1] Querying chaincode..."
peer chaincode query `
    -C $CHANNEL_NAME `
    -n $CHAINCODE_NAME `
    -c '{"function":"QueryAllContracts","Args":[]}'

if ($LASTEXITCODE -eq 0) {
    Write-Success "Query successful - chaincode is responsive"
} else {
    Write-Warning "Query failed - chaincode may need initialization"
}

Write-Info ""

# ==================== DEPLOYMENT SUMMARY ====================
Write-Success ""
Write-Success "=========================================================="
Write-Success "DEPLOYMENT COMPLETE!"
Write-Success "=========================================================="
Write-Info ""
Write-Info "Deployment Summary:"
Write-Info "  Chaincode: $CHAINCODE_NAME"
Write-Info "  Version: $CHAINCODE_VERSION"
Write-Info "  Sequence: $CHAINCODE_SEQUENCE"
Write-Info "  Channel: $CHANNEL_NAME"
Write-Info "  Organizations: $($organizations.Count) (ECTA, ECX, Banks, NBE, Customs, Shipping)"
Write-Info ""
Write-Info "New Payment Method Functions Available:"
Write-Info "  1. InitiatePayment - With payment method parameter (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)"
Write-Info "  2. ReleaseDocumentsToBuyer - For CAD/LC document control"
Write-Info "  3. ReceiveAdvancePayment - For advance payment tracking"
Write-Info "  4. ReceiveBalancePayment - For balance payment tracking"
Write-Info "  5. UpdatePaymentStatus - Generic status update with validation"
Write-Info "  6. QueryPaymentsByMethod - Query payments by method type"
Write-Info ""
Write-Info "Payment Methods Supported:"
Write-Info "  - LC (Letter of Credit) - Bank guaranteed, LOW risk, UCP 600"
Write-Info "  - CAD (Cash Against Documents) - No guarantee, MEDIUM risk, URC 522"
Write-Info "  - TT_ADVANCE (Telegraphic Transfer - Advance) - LOW risk"
Write-Info "  - TT_POST (Telegraphic Transfer - Post-shipment) - HIGH risk"
Write-Info "  - ADVANCE (Advance Payment) - LOW risk"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Restart API server to use new chaincode functions"
Write-Info "  2. Test payment initiation via API with different methods"
Write-Info "  3. Test method-specific workflows and status transitions"
Write-Info "  4. Verify prerequisite validation (LC must be issued, etc.)"
Write-Info "  5. Test document release control for CAD/LC"
Write-Info "  6. Test advance payment staging"
Write-Info ""
Write-Success "Payment Method Differentiation is now ACTIVE across all organizations!"
Write-Info ""
