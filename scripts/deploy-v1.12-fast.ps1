#!/usr/bin/env pwsh
# Fast Chaincode Deployment v1.12 - Payment Methods
$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "1.12"
$CHAINCODE_SEQUENCE = 9  # Upgrading from 1.11 (seq 8) to 1.12 (seq 9)
$CHANNEL_NAME = "coffeechannel"
$PACKAGE_FILE = "coffee_1.12.tar.gz"

Write-Info "CECBS Payment Methods v1.12 Deployment"
Write-Info "========================================"
Write-Info ""

# Setup
$env:PATH = "C:\CEX\fabric-samples\bin;" + $env:PATH
$env:FABRIC_CFG_PATH = "C:\CEX\blockchain"

# Package chaincode
Write-Info "[1/5] Packaging..."
Set-Location "C:\CEX\scripts"

if (-not (Test-Path $PACKAGE_FILE)) {
    peer lifecycle chaincode package $PACKAGE_FILE `
        --path "C:\CEX\chaincodes\coffee" `
        --lang golang `
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION} | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Packaging failed"
        exit 1
    }
}

Write-Success "Package ready: $PACKAGE_FILE"
Write-Info ""

# Copy to first peer only
Write-Info "[2/5] Copying to peer..."
docker cp $PACKAGE_FILE "peer0.ecta.cecbs.et:/" | Out-Null
Write-Success "Copied to peer0.ecta.cecbs.et"
Write-Info ""

# Install on first peer
Write-Info "[3/5] Installing..."
$installOutput = docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP `
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp `
    peer0.ecta.cecbs.et peer lifecycle chaincode install /$PACKAGE_FILE 2>&1

$PACKAGE_ID = ""
if ($installOutput -match "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:([a-f0-9]+)") {
    $PACKAGE_ID = "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:$($matches[1])"
    Write-Success "Installed. Package ID: $PACKAGE_ID"
} elseif ($installOutput -like "*already installed*") {
    Write-Warning "Already installed. Querying package ID..."
    $queryOutput = docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1
    if ($queryOutput -match "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:([a-f0-9]+)") {
        $PACKAGE_ID = "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:$($matches[1])"
        Write-Success "Found: $PACKAGE_ID"
    }
}

if ([string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
    Write-Error "Could not determine package ID"
    exit 1
}

Write-Info ""

# Approve for ECTA (lead org)
Write-Info "[4/5] Approving for ECTA..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP `
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp `
    peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg `
    -o orderer.cecbs.et:7050 `
    --ordererTLSHostnameOverride orderer.cecbs.et `
    --channelID $CHANNEL_NAME `
    --name $CHAINCODE_NAME `
    --version $CHAINCODE_VERSION `
    --package-id $PACKAGE_ID `
    --sequence $CHAINCODE_SEQUENCE `
    --tls `
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "ECTA approved"
} else {
    Write-Warning "Approval may have failed or already done"
}

Write-Info ""

# Check readiness
Write-Info "[4.5] Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness `
    --channelID $CHANNEL_NAME `
    --name $CHAINCODE_NAME `
    --version $CHAINCODE_VERSION `
    --sequence $CHAINCODE_SEQUENCE `
    --tls `
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem `
    --output json

Write-Info ""
$continue = Read-Host "Commit? (y/n)"
if ($continue -ne "y") {
    Write-Warning "Paused"
    exit 0
}

# Commit
Write-Info ""
Write-Info "[5/5] Committing..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit `
    -o orderer.cecbs.et:7050 `
    --ordererTLSHostnameOverride orderer.cecbs.et `
    --channelID $CHANNEL_NAME `
    --name $CHAINCODE_NAME `
    --version $CHAINCODE_VERSION `
    --sequence $CHAINCODE_SEQUENCE `
    --tls `
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem `
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

if ($LASTEXITCODE -eq 0) {
    Write-Success "Committed successfully!"
} else {
    Write-Error "Commit failed"
    exit 1
}

Write-Info ""
Write-Success "========================================"
Write-Success "DEPLOYMENT COMPLETE"
Write-Success "========================================"
Write-Info ""
Write-Info "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION (seq $CHAINCODE_SEQUENCE)"
Write-Info ""
Write-Info "New Payment Methods:"
Write-Info "  LC, CAD, TT_ADVANCE, TT_POST, ADVANCE"
Write-Info ""
Write-Info "Next: Restart API and test"
