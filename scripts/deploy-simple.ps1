#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple step-by-step deployment with manual confirmation

.DESCRIPTION
    Walks through each deployment step with pause for verification
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CECBS Audit Trail - Step by Step Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

Write-Host "PROJECT ROOT: $PROJECT_ROOT" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[STEP 1] Checking prerequisites..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green

# Check for orderer
$orderer = docker ps --filter "name=orderer.cecbs.et" --format "{{.Names}}"
if (-not $orderer) {
    Write-Host "ERROR: Orderer not running. Start blockchain first!" -ForegroundColor Red
    Write-Host "Run: docker-compose -f docker-compose-fabric.yml up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Orderer is running: $orderer" -ForegroundColor Green

# Check peers
$peers = docker ps --filter "name=peer0" --format "{{.Names}}"
$peerCount = ($peers | Measure-Object -Line).Lines
Write-Host "[OK] Found $peerCount peers running" -ForegroundColor Green

Write-Host ""
Write-Host "Peers running:" -ForegroundColor Yellow
$peers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# Check peer CLI
try {
    $peerVersion = peer version 2>&1 | Select-String "Version:"
    Write-Host "[OK] Peer CLI available: $peerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Peer CLI not found in PATH!" -ForegroundColor Red
    exit 1
}

# Check chaincode package
$packagePath = ".\chaincodes\coffee\coffee-v2.0-ccaas.tar.gz"
if (-not (Test-Path $packagePath)) {
    Write-Host "ERROR: Chaincode package not found!" -ForegroundColor Red
    Write-Host "Creating package..." -ForegroundColor Yellow
    Set-Location ".\chaincodes\coffee"
    tar czf coffee-v2.0-ccaas.tar.gz *.go go.mod go.sum connection.json
    Set-Location $PROJECT_ROOT
    
    if (Test-Path $packagePath) {
        Write-Host "[OK] Package created" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create package" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Chaincode package exists" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press ENTER to continue with installation"

# Step 2: Install on ECTA peer (first peer)
Write-Host ""
Write-Host "[STEP 2] Installing on ECTA peer..." -ForegroundColor Cyan
Write-Host ""

$env:CORE_PEER_ADDRESS = "peer0.ecta.cecbs.et:7051"
$env:CORE_PEER_LOCALMSPID = "ECTAMSP"
$env:CORE_PEER_TLS_ENABLED = "true"
$env:CORE_PEER_TLS_ROOTCERT_FILE = ".\blockchain\organizations\peerOrganizations\ecta.cecbs.et\peers\peer0.ecta.cecbs.et\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = ".\blockchain\organizations\peerOrganizations\ecta.cecbs.et\users\Admin@ecta.cecbs.et\msp"

Write-Host "Installing chaincode on ECTA peer..." -ForegroundColor Yellow
$installOutput = peer lifecycle chaincode install $packagePath 2>&1 | Out-String
Write-Host $installOutput

# Extract package ID
if ($installOutput -match 'Chaincode code package identifier: (.+)') {
    $PACKAGE_ID = $Matches[1]
    Write-Host ""
    Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
    $PACKAGE_ID | Out-File -FilePath ".\chaincodes\coffee\package-id.txt" -Encoding UTF8
} else {
    Write-Host "Querying for package ID..." -ForegroundColor Yellow
    $queryOutput = peer lifecycle chaincode queryinstalled 2>&1 | Out-String
    Write-Host $queryOutput
    
    if ($queryOutput -match 'Package ID: (coffee[_:]2\.0[^,]+)') {
        $PACKAGE_ID = $Matches[1]
        Write-Host ""
        Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
        $PACKAGE_ID | Out-File -FilePath ".\chaincodes\coffee\package-id.txt" -Encoding UTF8
    } else {
        Write-Host "ERROR: Could not extract package ID" -ForegroundColor Red
        Write-Host "Please check output above and extract manually" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Read-Host "Press ENTER to continue with approval"

# Step 3: Approve for ECTA
Write-Host ""
Write-Host "[STEP 3] Approving chaincode for ECTA..." -ForegroundColor Cyan
Write-Host ""

$ORDERER_CA = ".\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem"

Write-Host "Approving with Package ID: $PACKAGE_ID" -ForegroundColor Yellow

peer lifecycle chaincode approveformyorg `
    --channelID coffeechannel `
    --name coffee `
    --version 2.0 `
    --package-id $PACKAGE_ID `
    --sequence 2 `
    --tls `
    --cafile $ORDERER_CA

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Approved by ECTA" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Approval may have failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking commit readiness..." -ForegroundColor Yellow
peer lifecycle chaincode checkcommitreadiness `
    --channelID coffeechannel `
    --name coffee `
    --version 2.0 `
    --sequence 2 `
    --tls `
    --cafile $ORDERER_CA `
    --output json

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTALLATION SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor White
Write-Host "Installed on: ECTA peer" -ForegroundColor White
Write-Host "Approved by: ECTA" -ForegroundColor White
Write-Host ""
Write-Host "TO COMPLETE DEPLOYMENT:" -ForegroundColor Yellow
Write-Host "1. Install on remaining 5 peers (NBE, Banks, Customs, ECX, Shipping)" -ForegroundColor White
Write-Host "2. Approve on remaining 5 organizations" -ForegroundColor White
Write-Host "3. Commit to channel when all orgs approved" -ForegroundColor White
Write-Host ""
Write-Host "Run full deployment: .\scripts\deploy-audit-trail-v2.0.ps1" -ForegroundColor Cyan
Write-Host ""
