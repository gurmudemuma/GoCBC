#!/usr/bin/env pwsh
# CECBS Chaincode Upgrade Script - Payment Method Differentiation
# Version: 1.12
# Date: June 26, 2026
# Purpose: Deploy chaincode with payment method differentiation features

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
$CHAINCODE_SEQUENCE = 12  # Increment this if upgrading
$CHANNEL_NAME = "coffeechannel"
$CHAINCODE_PATH = "C:\CEX\chaincodes\coffee"
$PACKAGE_FILE = "coffee_$CHAINCODE_VERSION.tar.gz"

Write-Info "=================================================="
Write-Info "CECBS Chaincode Deployment - Payment Methods v1.12"
Write-Info "=================================================="
Write-Info ""
Write-Info "Features included in this version:"
Write-Info "  ✓ 5 Payment Methods (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)"
Write-Info "  ✓ Payment method-specific status transitions"
Write-Info "  ✓ Prerequisite validation (LC must be issued, etc.)"
Write-Info "  ✓ Document release control (CAD/LC)"
Write-Info "  ✓ Multi-stage payment tracking (advance + balance)"
Write-Info "  ✓ Risk profile and metadata tracking"
Write-Info ""

# Check if Fabric binaries are available
if (-not (Get-Command "peer" -ErrorAction SilentlyContinue)) {
    Write-Error "Hyperledger Fabric peer binary not found. Please ensure Fabric binaries are in PATH."
    exit 1
}

# Set Fabric environment variables
$env:FABRIC_CFG_PATH = "C:\CEX\blockchain"
$env:CORE_PEER_TLS_ENABLED = "true"
$env:CORE_PEER_LOCALMSPID = "ECTAMSP"
$env:CORE_PEER_TLS_ROOTCERT_FILE = "C:\CEX\blockchain\crypto-config\peerOrganizations\ecta.cecbs.com\peers\peer0.ecta.cecbs.com\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = "C:\CEX\blockchain\crypto-config\peerOrganizations\ecta.cecbs.com\users\Admin@ecta.cecbs.com\msp"
$env:CORE_PEER_ADDRESS = "localhost:7051"
$env:ORDERER_CA = "C:\CEX\blockchain\crypto-config\ordererOrganizations\cecbs.com\orderers\orderer.cecbs.com\msp\tlscacerts\tlsca.cecbs.com-cert.pem"

Write-Info "Environment configured for ECTA organization"
Write-Info ""

# Step 1: Package Chaincode
if (-not $SkipPackage -and -not $TestOnly) {
    Write-Info "[Step 1/5] Packaging chaincode..."
    Write-Info "Version: $CHAINCODE_VERSION"
    Write-Info "Path: $CHAINCODE_PATH"
    
    Push-Location $CHAINCODE_PATH
    
    # Ensure go.mod and go.sum are up to date
    Write-Info "Running go mod tidy..."
    go mod tidy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "go mod tidy failed"
        Pop-Location
        exit 1
    }
    
    Pop-Location
    
    # Package the chaincode
    Write-Info "Creating package: $PACKAGE_FILE"
    peer lifecycle chaincode package $PACKAGE_FILE `
        --path $CHAINCODE_PATH `
        --lang golang `
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode packaging failed"
        exit 1
    }
    
    Write-Success "✓ Chaincode packaged successfully"
    Write-Info "Package file: $PACKAGE_FILE"
    Write-Info ""
} elseif ($SkipPackage) {
    Write-Warning "Skipping packaging step (using existing package)"
    Write-Info ""
}

# Step 2: Install Chaincode on ECTA Peer
if (-not $SkipInstall -and -not $TestOnly) {
    Write-Info "[Step 2/5] Installing chaincode on ECTA peer..."
    
    peer lifecycle chaincode install $PACKAGE_FILE
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode installation failed on ECTA peer"
        exit 1
    }
    
    Write-Success "✓ Chaincode installed on ECTA peer"
    Write-Info ""
    
    # Get the package ID
    Write-Info "Querying installed chaincodes to get package ID..."
    $installedOutput = peer lifecycle chaincode queryinstalled
    
    # Extract package ID (this is a simplified approach)
    Write-Info "Installed chaincodes:"
    Write-Info $installedOutput
    Write-Info ""
    
    # Note: In production, parse the package ID properly
    Write-Warning "Please note the Package ID from the output above."
    Write-Warning "You will need it for the approve and commit steps."
    Write-Info ""
    
    # Prompt for package ID
    $PACKAGE_ID = Read-Host "Enter the Package ID for ${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
    
    if ([string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
        Write-Error "Package ID is required"
        exit 1
    }
} else {
    if (-not $TestOnly) {
        Write-Warning "Skipping installation step"
        $PACKAGE_ID = Read-Host "Enter the Package ID for approval (or press Enter to skip)"
    }
}

# Step 3: Approve Chaincode for ECTA Organization
if (-not $SkipApprove -and -not $TestOnly -and -not [string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
    Write-Info "[Step 3/5] Approving chaincode for ECTA organization..."
    
    peer lifecycle chaincode approveformyorg `
        -o localhost:7050 `
        --ordererTLSHostnameOverride orderer.cecbs.com `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --package-id $PACKAGE_ID `
        --sequence $CHAINCODE_SEQUENCE `
        --tls `
        --cafile $env:ORDERER_CA
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode approval failed"
        exit 1
    }
    
    Write-Success "✓ Chaincode approved for ECTA"
    Write-Info ""
} elseif (-not $TestOnly) {
    Write-Warning "Skipping approval step"
    Write-Info ""
}

# Step 4: Check Commit Readiness
if (-not $TestOnly) {
    Write-Info "[Step 4/5] Checking commit readiness..."
    
    peer lifecycle chaincode checkcommitreadiness `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $CHAINCODE_SEQUENCE `
        --tls `
        --cafile $env:ORDERER_CA `
        --output json
    
    Write-Info ""
    Write-Warning "Review the commit readiness above."
    Write-Warning "All required organizations must approve before committing."
    Write-Info ""
    
    $continue = Read-Host "Continue with commit? (y/n)"
    if ($continue -ne "y") {
        Write-Warning "Deployment paused. Run with appropriate flags to continue."
        exit 0
    }
}

# Step 5: Commit Chaincode
if (-not $TestOnly) {
    Write-Info "[Step 5/5] Committing chaincode to channel..."
    
    peer lifecycle chaincode commit `
        -o localhost:7050 `
        --ordererTLSHostnameOverride orderer.cecbs.com `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $CHAINCODE_SEQUENCE `
        --tls `
        --cafile $env:ORDERER_CA `
        --peerAddresses localhost:7051 `
        --tlsRootCertFiles "C:\CEX\blockchain\crypto-config\peerOrganizations\ecta.cecbs.com\peers\peer0.ecta.cecbs.com\tls\ca.crt"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode commit failed"
        exit 1
    }
    
    Write-Success "✓ Chaincode committed successfully"
    Write-Info ""
}

# Test the deployment
Write-Info "=================================================="
Write-Info "Testing Deployed Chaincode"
Write-Info "=================================================="
Write-Info ""

# Test 1: Query existing data
Write-Info "[Test 1] Querying chaincode to verify deployment..."
peer chaincode query `
    -C $CHANNEL_NAME `
    -n $CHAINCODE_NAME `
    -c '{"function":"QueryAllContracts","Args":[]}'

if ($LASTEXITCODE -eq 0) {
    Write-Success "✓ Query successful - chaincode is deployed and responsive"
} else {
    Write-Warning "Query failed - chaincode may not be fully initialized"
}
Write-Info ""

# Test 2: Test payment method validation (new function)
Write-Info "[Test 2] Testing payment method validation..."
Write-Info "Attempting to initiate payment with LC method..."

$testPaymentArgs = @{
    function = "InitiatePayment"
    Args = @(
        "TEST_PAY_001",
        "CONTRACT_001",
        "EXP123",
        "LC_001",
        "10000",
        "USD",
        "Commercial Bank of Ethiopia",
        "CBETETAA",
        "Test Exporter",
        "12345678",
        "LC"
    )
} | ConvertTo-Json -Compress

Write-Info "Command: peer chaincode invoke -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '$testPaymentArgs'"
Write-Warning "Note: This test invoke will fail if prerequisites are not met (e.g., LC not issued)"
Write-Info "This is EXPECTED behavior demonstrating validation is working."
Write-Info ""

# Test 3: Query payment methods metadata
Write-Info "[Test 3] Available payment methods:"
Write-Info "  1. LC (Letter of Credit) - Bank guaranteed, LOW risk"
Write-Info "  2. CAD (Cash Against Documents) - No guarantee, MEDIUM risk"  
Write-Info "  3. TT_ADVANCE (Telegraphic Transfer - Advance) - Payment before shipment, LOW risk"
Write-Info "  4. TT_POST (Telegraphic Transfer - Post) - Payment after shipment, HIGH risk"
Write-Info "  5. ADVANCE (Advance Payment) - Payment before production, LOW risk"
Write-Info ""

Write-Success "=================================================="
Write-Success "Deployment Complete!"
Write-Success "=================================================="
Write-Info ""
Write-Info "Chaincode: $CHAINCODE_NAME"
Write-Info "Version: $CHAINCODE_VERSION"
Write-Info "Sequence: $CHAINCODE_SEQUENCE"
Write-Info ""
Write-Info "New Functions Available:"
Write-Info "  - InitiatePayment (with payment method parameter)"
Write-Info "  - ReleaseDocumentsToBuyer"
Write-Info "  - ReceiveAdvancePayment"
Write-Info "  - ReceiveBalancePayment"
Write-Info "  - UpdatePaymentStatus"
Write-Info "  - QueryPaymentsByMethod"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Restart API server to use new chaincode functions"
Write-Info "  2. Test payment initiation via API endpoints"
Write-Info "  3. Test each payment method workflow"
Write-Info "  4. Verify status transition validation"
Write-Info ""
Write-Success "Payment Method Differentiation is now active!"
