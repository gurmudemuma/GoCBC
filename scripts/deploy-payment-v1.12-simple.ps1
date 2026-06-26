#!/usr/bin/env pwsh
# Simple Docker-based Chaincode Deployment
# Version: 1.12 - Payment Method Differentiation

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "1.12"
$CHAINCODE_SEQUENCE = 12
$CHANNEL_NAME = "coffeechannel"
$LOCAL_CHAINCODE_PATH = "C:\CEX\chaincodes\coffee"
$PACKAGE_FILE = "coffee_1.12.tar.gz"

Write-Info "=========================================================="
Write-Info "CECBS Payment Methods v1.12 Deployment"
Write-Info "=========================================================="
Write-Info ""

# Add Fabric binaries to PATH
$env:PATH = "C:\CEX\fabric-samples\bin;" + $env:PATH
$env:FABRIC_CFG_PATH = "C:\CEX\blockchain"

# Step 1: Package chaincode on host
Write-Info "[1/5] Packaging chaincode on host..."
Push-Location $LOCAL_CHAINCODE_PATH
go mod tidy
if ($LASTEXITCODE -ne 0) { Write-Error "go mod tidy failed"; exit 1 }
Pop-Location

Set-Location "C:\CEX\scripts"
peer lifecycle chaincode package $PACKAGE_FILE `
    --path $LOCAL_CHAINCODE_PATH `
    --lang golang `
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

if ($LASTEXITCODE -ne 0) { Write-Error "Packaging failed"; exit 1 }
Write-Success "Packaged: $PACKAGE_FILE"
Write-Info ""

# Step 2: Copy package to all peer containers
Write-Info "[2/5] Copying package to peer containers..."
$peers = @("peer0.ecta.cecbs.et", "peer0.ecx.cecbs.et", "peer0.banks.cecbs.et", 
           "peer0.nbe.cecbs.et", "peer0.customs.cecbs.et", "peer0.shipping.cecbs.et")

foreach ($peer in $peers) {
    docker cp $PACKAGE_FILE "${peer}:/"
    Write-Info "  Copied to $peer"
}
Write-Success "Package distributed"
Write-Info ""

# Step 3: Install on all peers
Write-Info "[3/5] Installing on all peers..."

$orgs = @(
    @{Name="ECTA"; Peer="peer0.ecta.cecbs.et"; MSP="ECTAMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"},
    @{Name="ECX"; Peer="peer0.ecx.cecbs.et"; MSP="ECXMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"},
    @{Name="Banks"; Peer="peer0.banks.cecbs.et"; MSP="BanksMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"},
    @{Name="NBE"; Peer="peer0.nbe.cecbs.et"; MSP="NBEMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"},
    @{Name="Customs"; Peer="peer0.customs.cecbs.et"; MSP="CustomsMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"},
    @{Name="Shipping"; Peer="peer0.shipping.cecbs.et"; MSP="ShippingMSP"; 
      CryptoPath="/etc/hyperledger/fabric/msp"}
)

$PACKAGE_ID = ""

foreach ($org in $orgs) {
    Write-Info "Installing on $($org.Name)..."
    
    $output = docker exec -e CORE_PEER_LOCALMSPID=$($org.MSP) `
        -e CORE_PEER_MSPCONFIGPATH=$($org.CryptoPath) `
        $($org.Peer) peer lifecycle chaincode install "/$PACKAGE_FILE" 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $output -like "*already installed*") {
        Write-Success "  $($org.Name) - OK"
        
        # Extract package ID from output
        if ($output -match "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:([a-f0-9]+)") {
            $PACKAGE_ID = "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:$($matches[1])"
        }
    } else {
        Write-Warning "  $($org.Name) - Check: $output"
    }
}

if ([string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
    # Query to get package ID
    $queryOutput = docker exec -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/msp" `
        $($orgs[0].Peer) peer lifecycle chaincode queryinstalled 2>&1
    
    Write-Info "Installed chaincodes:"
    Write-Info $queryOutput
    $PACKAGE_ID = Read-Host "`nEnter Package ID"
}

Write-Info ""
Write-Success "Package ID: $PACKAGE_ID"
Write-Info ""

# Step 4: Approve for all orgs
Write-Info "[4/5] Approving for all organizations..."

$ORDERER_CA = "/etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

foreach ($org in $orgs) {
    Write-Info "Approving for $($org.Name)..."
    
    docker exec -e CORE_PEER_LOCALMSPID=$($org.MSP) `
        -e CORE_PEER_MSPCONFIGPATH=$($org.CryptoPath) `
        -e CORE_PEER_TLS_ENABLED=true `
        $($org.Peer) peer lifecycle chaincode approveformyorg `
        -o orderer.cecbs.et:7050 `
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
    } else {
        Write-Warning "  $($org.Name) - May be already approved"
    }
}

Write-Info ""

# Step 5: Check commit readiness
Write-Info "[4.5] Checking commit readiness..."
docker exec -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/msp" `
    $($orgs[0].Peer) peer lifecycle chaincode checkcommitreadiness `
    --channelID $CHANNEL_NAME `
    --name $CHAINCODE_NAME `
    --version $CHAINCODE_VERSION `
    --sequence $CHAINCODE_SEQUENCE `
    --tls `
    --cafile $ORDERER_CA `
    --output json

Write-Info ""
$continue = Read-Host "Commit chaincode? (y/n)"
if ($continue -ne "y") {
    Write-Warning "Paused. Run script again to continue."
    exit 0
}

# Step 5: Commit
Write-Info ""
Write-Info "[5/5] Committing chaincode..."

# Build peer addresses
$peerAddresses = ""
$tlsRootCerts = ""
foreach ($org in $orgs) {
    $peerAddresses += "--peerAddresses $($org.Peer):$(7051 + $orgs.IndexOf($org) * 1000) "
    $tlsRootCerts += "--tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt "
}

docker exec -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/msp" `
    -e CORE_PEER_LOCALMSPID="ECTAMSP" `
    $($orgs[0].Peer) peer lifecycle chaincode commit `
    -o orderer.cecbs.et:7050 `
    --ordererTLSHostnameOverride orderer.cecbs.et `
    --channelID $CHANNEL_NAME `
    --name $CHAINCODE_NAME `
    --version $CHAINCODE_VERSION `
    --sequence $CHAINCODE_SEQUENCE `
    --tls `
    --cafile $ORDERER_CA `
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt `
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt `
    --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt `
    --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt `
    --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt `
    --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

if ($LASTEXITCODE -eq 0) {
    Write-Success "Chaincode committed successfully!"
} else {
    Write-Error "Commit failed"
    exit 1
}

Write-Info ""

# Verify
Write-Info "[Verify] Querying committed chaincode..."
docker exec $($orgs[0].Peer) peer lifecycle chaincode querycommitted `
    --channelID $CHANNEL_NAME --name $CHAINCODE_NAME

Write-Info ""
Write-Success "=========================================================="
Write-Success "DEPLOYMENT COMPLETE!"
Write-Success "=========================================================="
Write-Info ""
Write-Info "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION"
Write-Info "Sequence: $CHAINCODE_SEQUENCE"
Write-Info ""
Write-Info "New Features Active:"
Write-Info "  - 5 Payment Methods (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)"
Write-Info "  - Method-specific workflows & validation"
Write-Info "  - Prerequisite checks (LC must be issued)"
Write-Info "  - Document release control (CAD/LC)"
Write-Info "  - Advance payment staging"
Write-Info ""
Write-Info "Next: Restart API server and test payment methods"
Write-Success ""
