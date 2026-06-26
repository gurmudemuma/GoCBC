#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy CECBS Audit Trail Chaincode v2.0

.DESCRIPTION
    Deploys the cryptographic audit trail chaincode to the CECBS blockchain network.
    - Installs chaincode on all 6 organization peers
    - Approves chaincode for all organizations
    - Commits chaincode to the channel
    - Verifies deployment

.PARAMETER SkipInstall
    Skip the installation phase (if already installed)

.PARAMETER SkipApprove
    Skip the approval phase (if already approved)

.PARAMETER Sequence
    Chaincode sequence number (default: 2)

.EXAMPLE
    .\deploy-audit-trail-v2.0.ps1
    Full deployment of v2.0

.EXAMPLE
    .\deploy-audit-trail-v2.0.ps1 -SkipInstall
    Skip installation, only approve and commit
#>

param(
    [switch]$SkipInstall,
    [switch]$SkipApprove,
    [int]$Sequence = 2
)

# Configuration
$ErrorActionPreference = "Stop"
$CHANNEL_NAME = "coffeechannel"
$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "2.1"
$CHAINCODE_PACKAGE = "coffee-v2.1-complete.tar.gz"
$CHAINCODE_DIR = Join-Path $PSScriptRoot "..\chaincodes\coffee"
$PROJECT_ROOT = Join-Path $PSScriptRoot ".."

# Organization configuration
$ORGS = @(
    @{ Name = "ecta";     MSP = "ECTAMSP";     Port = 7051;  Domain = "ecta.cecbs.et" },
    @{ Name = "nbe";      MSP = "NBEMSP";      Port = 8051;  Domain = "nbe.cecbs.et" },
    @{ Name = "banks";    MSP = "BanksMSP";    Port = 9051;  Domain = "banks.cecbs.et" },
    @{ Name = "customs";  MSP = "CustomsMSP";  Port = 10051; Domain = "customs.cecbs.et" },
    @{ Name = "ecx";      MSP = "ECXMSP";      Port = 11051; Domain = "ecx.cecbs.et" },
    @{ Name = "shipping"; MSP = "ShippingMSP"; Port = 12051; Domain = "shipping.cecbs.et" }
)

# Orderer configuration
$ORDERER_ADDRESS = "orderer.cecbs.et:7050"
$ORDERER_CA = Join-Path $PROJECT_ROOT "blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CECBS Audit Trail Deployment v2.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to set peer environment variables
function Set-PeerEnvironment {
    param($Org)
    
    $peerRoot = Join-Path $PROJECT_ROOT "blockchain\organizations\peerOrganizations\$($Org.Domain)\peers\peer0.$($Org.Domain)"
    $adminMSP = Join-Path $PROJECT_ROOT "blockchain\organizations\peerOrganizations\$($Org.Domain)\users\Admin@$($Org.Domain)\msp"
    
    $env:CORE_PEER_ADDRESS = "peer0.$($Org.Domain):$($Org.Port)"
    $env:CORE_PEER_LOCALMSPID = $Org.MSP
    $env:CORE_PEER_TLS_ENABLED = "true"
    $env:CORE_PEER_TLS_ROOTCERT_FILE = Join-Path $peerRoot "tls\ca.crt"
    $env:CORE_PEER_MSPCONFIGPATH = $adminMSP
}

# Step 1: Verify prerequisites
Write-Host "Step 1: Verify prerequisites" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

# Check chaincode package exists
$packagePath = Join-Path $CHAINCODE_DIR $CHAINCODE_PACKAGE
if (-not (Test-Path $packagePath)) {
    Write-Host "ERROR: Chaincode package not found at: $packagePath" -ForegroundColor Red
    Write-Host "Run: cd $CHAINCODE_DIR; tar czf $CHAINCODE_PACKAGE *.go go.mod go.sum connection.json" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Package found: $CHAINCODE_PACKAGE" -ForegroundColor Green

# Check peer command available
try {
    $null = Get-Command peer -ErrorAction Stop
    Write-Host "[OK] Hyperledger Fabric peer CLI available" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Hyperledger Fabric peer CLI not found" -ForegroundColor Red
    Write-Host "Ensure Fabric binaries are in PATH" -ForegroundColor Yellow
    exit 1
}

# Check orderer CA exists
if (-not (Test-Path $ORDERER_CA)) {
    Write-Host "WARNING: Orderer CA not found at: $ORDERER_CA" -ForegroundColor Yellow
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Check Docker is running
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running" -ForegroundColor Red
    exit 1
}

# Check blockchain network is running
$ordererRunning = docker ps --filter "name=orderer.cecbs.et" --format "{{.Names}}"
if (-not $ordererRunning) {
    Write-Host "ERROR: Orderer not running. Start network first." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Blockchain network is running" -ForegroundColor Green
Write-Host ""

# Step 2: Install chaincode on all peers
if (-not $SkipInstall) {
    Write-Host "Step 2: Install chaincode on all peers" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    
    $PACKAGE_ID = $null
    
    foreach ($org in $ORGS) {
        Write-Host "Installing on $($org.Name) ($($org.MSP))..." -ForegroundColor Cyan
        
        Set-PeerEnvironment -Org $org
        
        try {
            # Install chaincode
            $output = peer lifecycle chaincode install $packagePath 2>&1 | Out-String
            
            # Extract package ID from output
            if ($output -match 'Chaincode code package identifier: (.+)') {
                $extractedId = $Matches[1]
                if (-not $PACKAGE_ID) {
                    $PACKAGE_ID = $extractedId
                }
            }
            
            Write-Host "[OK] Installed on $($org.Name)" -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Installation may have failed on $($org.Name): $_" -ForegroundColor Yellow
        }
    }
    
    # If package ID not extracted, try to query it
    if (-not $PACKAGE_ID) {
        Write-Host "Querying for package ID..." -ForegroundColor Cyan
        Set-PeerEnvironment -Org $ORGS[0]
        $queryOutput = peer lifecycle chaincode queryinstalled 2>&1 | Out-String
        
        if ($queryOutput -match "Package ID: ($CHAINCODE_NAME[_:]$CHAINCODE_VERSION[^,]+)") {
            $PACKAGE_ID = $Matches[1]
        }
    }
    
    if (-not $PACKAGE_ID) {
        Write-Host "ERROR: Could not determine package ID" -ForegroundColor Red
        Write-Host "Output: $queryOutput" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
    Write-Host ""
    
    # Save package ID for later use
    $PACKAGE_ID | Out-File -FilePath (Join-Path $CHAINCODE_DIR "package-id.txt") -Encoding UTF8
} else {
    Write-Host "Step 2: Skipping installation (using existing)" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    
    # Load package ID from file
    $packageIdFile = Join-Path $CHAINCODE_DIR "package-id.txt"
    if (Test-Path $packageIdFile) {
        $PACKAGE_ID = Get-Content $packageIdFile -Raw | ForEach-Object { $_.Trim() }
        Write-Host "Using Package ID: $PACKAGE_ID" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Package ID file not found. Remove -SkipInstall flag." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Step 3: Approve chaincode for all organizations
if (-not $SkipApprove) {
    Write-Host "Step 3: Approve chaincode for all organizations" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    
    foreach ($org in $ORGS) {
        Write-Host "Approving for $($org.Name) ($($org.MSP))..." -ForegroundColor Cyan
        
        Set-PeerEnvironment -Org $org
        
        try {
            peer lifecycle chaincode approveformyorg `
                --channelID $CHANNEL_NAME `
                --name $CHAINCODE_NAME `
                --version $CHAINCODE_VERSION `
                --package-id $PACKAGE_ID `
                --sequence $Sequence `
                --tls `
                --cafile $ORDERER_CA 2>&1 | Out-Null
            
            Write-Host "[OK] Approved by $($org.Name)" -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Approval may have failed for $($org.Name): $_" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "Step 3: Skipping approval (using existing)" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Check commit readiness
Write-Host "Step 4: Check commit readiness" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

Set-PeerEnvironment -Org $ORGS[0]

try {
    $readinessOutput = peer lifecycle chaincode checkcommitreadiness `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $Sequence `
        --tls `
        --cafile $ORDERER_CA `
        --output json 2>&1 | Out-String
    
    Write-Host $readinessOutput
    
    # Parse JSON to check if all orgs approved
    $readiness = $readinessOutput | ConvertFrom-Json
    $allApproved = $true
    foreach ($org in $ORGS) {
        if ($readiness.approvals.($org.MSP) -ne $true) {
            Write-Host "[WARNING] $($org.MSP) has not approved" -ForegroundColor Yellow
            $allApproved = $false
        }
    }
    
    if ($allApproved) {
        Write-Host "[OK] All organizations have approved" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Not all organizations have approved. Commit may fail." -ForegroundColor Yellow
        $continue = Read-Host "Continue with commit anyway? (y/n)"
        if ($continue -ne 'y') {
            Write-Host "Deployment cancelled by user" -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "[WARNING] Could not check readiness: $_" -ForegroundColor Yellow
    Write-Host "Continuing with commit..." -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Commit chaincode to channel
Write-Host "Step 5: Commit chaincode to channel" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

# Build peer connection parameters for all orgs
$peerConnParams = @()
foreach ($org in $ORGS) {
    $peerAddress = "peer0.$($org.Domain):$($org.Port)"
    $tlsCertFile = Join-Path $PROJECT_ROOT "blockchain\organizations\peerOrganizations\$($org.Domain)\peers\peer0.$($org.Domain)\tls\ca.crt"
    
    $peerConnParams += "--peerAddresses"
    $peerConnParams += $peerAddress
    $peerConnParams += "--tlsRootCertFiles"
    $peerConnParams += $tlsCertFile
}

# Set to first org for commit command
Set-PeerEnvironment -Org $ORGS[0]

Write-Host "Committing chaincode (this may take a minute)..." -ForegroundColor Cyan

try {
    peer lifecycle chaincode commit `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $Sequence `
        $peerConnParams `
        --tls `
        --cafile $ORDERER_CA `
        --orderer $ORDERER_ADDRESS 2>&1 | Out-String | Write-Host
    
    Write-Host "[OK] Chaincode committed to channel" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Commit failed: $_" -ForegroundColor Red
    Write-Host "Check if chaincode is already committed or if there are endorsement policy issues" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 6: Verify deployment
Write-Host "Step 6: Verify deployment" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

try {
    $committedOutput = peer lifecycle chaincode querycommitted `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME 2>&1 | Out-String
    
    Write-Host $committedOutput
    
    if ($committedOutput -match "Version: $CHAINCODE_VERSION") {
        Write-Host "[OK] Chaincode v$CHAINCODE_VERSION is deployed and committed" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Chaincode version mismatch" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Could not verify deployment: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION" -ForegroundColor White
Write-Host "Channel: $CHANNEL_NAME" -ForegroundColor White
Write-Host "Sequence: $Sequence" -ForegroundColor White
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host "1. Restart API server:" -ForegroundColor White
Write-Host "   cd api && npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test audit endpoints:" -ForegroundColor White
Write-Host "   curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Register test exporter:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3001/api/exporters/register -H 'Content-Type: application/json' -d '{...}'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify audit log created:" -ForegroundColor White
Write-Host "   curl http://localhost:3001/api/audit/entity/EXPORTER/TEST_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed testing guide, see: DEPLOYMENT-CHECKLIST.md" -ForegroundColor Cyan
Write-Host ""
