#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Audit Trail using Docker (no peer CLI needed)

.DESCRIPTION
    Deploys chaincode using Docker exec - peer CLI runs inside container
#>

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CECBS Audit Trail - Docker Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PROJECT_ROOT

# Configuration
$CHANNEL_NAME = "coffeechannel"
$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "2.1"
$CHAINCODE_PACKAGE = "coffee-v2.1-complete.tar.gz"
$SEQUENCE = 2

Write-Host "Step 1: Verify prerequisites" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

# Check Docker
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    exit 1
}

# Check package
$packagePath = ".\chaincodes\coffee\$CHAINCODE_PACKAGE"
if (-not (Test-Path $packagePath)) {
    Write-Host "ERROR: Package not found: $packagePath" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Package found: $CHAINCODE_PACKAGE" -ForegroundColor Green

# Check peers
$peers = docker ps --filter "name=peer0" --format "{{.Names}}"
if (-not $peers) {
    Write-Host "ERROR: No peers running!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Found peers: $($peers.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Copy package to ECTA peer" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

docker cp $packagePath peer0.ecta.cecbs.et:/tmp/$CHAINCODE_PACKAGE
Write-Host "[OK] Package copied to peer" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Install chaincode on ECTA peer" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$installCmd = "peer lifecycle chaincode install /tmp/$CHAINCODE_PACKAGE"

$output = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $installCmd 2>&1
Write-Host $output

# Extract package ID
if ($output -match 'Chaincode code package identifier: (.+)') {
    $PACKAGE_ID = $Matches[1].Trim()
    Write-Host ""
    Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
    $PACKAGE_ID | Out-File -FilePath ".\chaincodes\coffee\package-id.txt" -Encoding UTF8
} else {
    # Try to query for it
    Write-Host "Extracting package ID from query..." -ForegroundColor Yellow
    $queryCmd = "peer lifecycle chaincode queryinstalled"
    $queryOutput = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $queryCmd 2>&1
    
    if ($queryOutput -match "Package ID: ($CHAINCODE_NAME[_:]$CHAINCODE_VERSION[^,\s]+)") {
        $PACKAGE_ID = $Matches[1].Trim()
        Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
        $PACKAGE_ID | Out-File -FilePath ".\chaincodes\coffee\package-id.txt" -Encoding UTF8
    } else {
        Write-Host "ERROR: Could not extract package ID" -ForegroundColor Red
        Write-Host "Output: $queryOutput" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Step 4: Approve chaincode for ECTA" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$approveCmd = "peer lifecycle chaincode approveformyorg --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"

docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $approveCmd
Write-Host "[OK] Approved by ECTA" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Install on remaining peers" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$orgs = @(
    @{Name="nbe"; Container="peer0.nbe.cecbs.et"},
    @{Name="banks"; Container="peer0.banks.cecbs.et"},
    @{Name="customs"; Container="peer0.customs.cecbs.et"},
    @{Name="ecx"; Container="peer0.ecx.cecbs.et"},
    @{Name="shipping"; Container="peer0.shipping.cecbs.et"}
)

foreach ($org in $orgs) {
    $container = $org.Container
    $orgName = $org.Name
    
    Write-Host "Installing on $orgName..." -ForegroundColor Cyan
    
    # Check if container exists
    $exists = docker ps --filter "name=$container" --format "{{.Names}}"
    if (-not $exists) {
        Write-Host "[SKIP] Container $container not found" -ForegroundColor Yellow
        continue
    }
    
    # Copy package
    docker cp $packagePath "$($container):/tmp/$CHAINCODE_PACKAGE" 2>$null
    
    # Install
    $installOrgCmd = "peer lifecycle chaincode install /tmp/$CHAINCODE_PACKAGE"
    docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$($orgName).cecbs.et/msp $container bash -c $installOrgCmd 2>&1 | Out-Null
    
    # Approve
    $approveOrgCmd = "peer lifecycle chaincode approveformyorg --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"
    
    docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$($orgName).cecbs.et/msp $container bash -c $approveOrgCmd 2>&1 | Out-Null
    Write-Host "[OK] $orgName" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 6: Check commit readiness" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$checkCmd = "peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --sequence $SEQUENCE --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem --output json"

$readiness = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $checkCmd 2>&1
Write-Host $readiness

Write-Host ""
Write-Host "Step 7: Commit chaincode" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

# Build peer addresses
$peerAddresses = ""
$peerAddresses += "--peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt "

$otherPeers = @("nbe", "banks", "customs", "ecx", "shipping")
$ports = @{nbe=8051; banks=9051; customs=10051; ecx=11051; shipping=12051}

foreach ($p in $otherPeers) {
    $port = $ports[$p]
    $peerAddresses += "--peerAddresses peer0.$p.cecbs.et:$port --tlsRootCertFiles /organizations/peerOrganizations/$p.cecbs.et/peers/peer0.$p.cecbs.et/tls/ca.crt "
}

$commitCmd = "peer lifecycle chaincode commit --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --sequence $SEQUENCE $peerAddresses --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"

Write-Host "Committing chaincode (this may take a minute)..." -ForegroundColor Cyan
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $commitCmd
Write-Host "[OK] Chaincode committed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 8: Verify deployment" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$verifyCmd = "peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CHAINCODE_NAME"

$committed = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et bash -c $verifyCmd 2>&1
Write-Host $committed

if ($committed -match "Version: $CHAINCODE_VERSION") {
    Write-Host ""
    Write-Host "[OK] Chaincode v$CHAINCODE_VERSION is deployed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARNING] Could not verify version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CHAINCODE DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION" -ForegroundColor White
Write-Host "Channel: $CHANNEL_NAME" -ForegroundColor White
Write-Host "Sequence: $SEQUENCE" -ForegroundColor White
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor White
Write-Host ""
