# Simple Chaincode Upgrade Script
# Upgrades coffee chaincode from 1.10 to 1.11

$ErrorActionPreference = "Continue"

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host " UPGRADING COFFEE CHAINCODE TO VERSION 1.11" -ForegroundColor Cyan
Write-Host "===========================================================`n" -ForegroundColor Cyan

Set-Location C:\CEX\chaincodes\coffee

# Step 1: Package chaincode
Write-Host "[1/6] Packaging chaincode..." -ForegroundColor Yellow

# Ensure connection.json exists
if (-not (Test-Path connection.json)) {
    Write-Host "ERROR: connection.json not found!" -ForegroundColor Red
    exit 1
}

tar -czf code.tar.gz connection.json
tar -czf coffee-1.11-ccaas.tar.gz code.tar.gz metadata.json
Write-Host "  ✓ Package created: coffee-1.11-ccaas.tar.gz`n" -ForegroundColor Green

# Step 2: Install on ECTA peer
Write-Host "[2/6] Installing on peer0.ecta.cecbs.et..." -ForegroundColor Yellow
docker cp coffee-1.11-ccaas.tar.gz peer0.ecta.cecbs.et:/tmp/
$installOutput = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee-1.11-ccaas.tar.gz 2>&1 | Out-String

if ($installOutput -match "Chaincode code package identifier: (.+)") {
    $packageId = $matches[1].Trim()
    Write-Host "  Package ID: $packageId" -ForegroundColor Green
}
else {
    Write-Host "  Failed to extract package ID" -ForegroundColor Red
    Write-Host $installOutput
    exit 1
}

Write-Host "  Done installing on ECTA peer" -ForegroundColor Green
Write-Host ""

# Step 3: Install on all other peers
Write-Host "[3/6] Installing on other peers..." -ForegroundColor Yellow

$peers = @("peer0.ecx.cecbs.et", "peer0.banks.cecbs.et", "peer0.nbe.cecbs.et", "peer0.customs.cecbs.et", "peer0.shipping.cecbs.et")

foreach ($peer in $peers) {
    Write-Host "  Installing on $peer..." -ForegroundColor Gray
    docker cp coffee-1.11-ccaas.tar.gz ${peer}:/tmp/
    
    $org = $peer.Split('.')[1]
    docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp $peer peer lifecycle chaincode install /tmp/coffee-1.11-ccaas.tar.gz 2>&1 | Out-Null
}
Write-Host "  ✓ Installed on all peers`n" -ForegroundColor Green

# Step 4: Approve for all orgs
Write-Host "[4/6] Approving for all organizations..." -ForegroundColor Yellow

$orgsConfig = @(
    @{Peer="peer0.ecta.cecbs.et"; Port=7051; MSP="ECTAMSP"; Org="ecta"},
    @{Peer="peer0.ecx.cecbs.et"; Port=8051; MSP="ECXMSP"; Org="ecx"},
    @{Peer="peer0.banks.cecbs.et"; Port=9051; MSP="BanksMSP"; Org="banks"},
    @{Peer="peer0.nbe.cecbs.et"; Port=10051; MSP="NBEMSP"; Org="nbe"},
    @{Peer="peer0.customs.cecbs.et"; Port=11051; MSP="CustomsMSP"; Org="customs"},
    @{Peer="peer0.shipping.cecbs.et"; Port=12051; MSP="ShippingMSP"; Org="shipping"}
)

foreach ($orgConfig in $orgsConfig) {
    Write-Host "  Approving for $($orgConfig.MSP)..." -ForegroundColor Gray
    
    docker exec `
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$($orgConfig.Org).cecbs.et/msp `
        -e CORE_PEER_ADDRESS=$($orgConfig.Peer):$($orgConfig.Port) `
        -e CORE_PEER_LOCALMSPID=$($orgConfig.MSP) `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt `
        $($orgConfig.Peer) `
        peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.11 --package-id $packageId --sequence 8 --tls --cafile /etc/hyperledger/fabric/tls/ca.crt --waitForEvent 2>&1 | Out-Null
}
Write-Host "  ✓ Approved by all organizations`n" -ForegroundColor Green

# Step 5: Check commit readiness
Write-Host "[5/6] Checking commit readiness..." -ForegroundColor Yellow
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness --channelID coffeechannel --name coffee --version 1.11 --sequence 8 --tls --cafile /etc/hyperledger/fabric/tls/ca.crt
Write-Host ""

# Step 6: Commit
Write-Host "[6/6] Committing chaincode to channel..." -ForegroundColor Yellow
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode commit --channelID coffeechannel --name coffee --version 1.11 --sequence 8 --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --tls --cafile /etc/hyperledger/fabric/tls/ca.crt --waitForEvent

Write-Host "" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host " CHAINCODE UPGRADE COMPLETED!" -ForegroundColor Green
Write-Host "   Version: 1.11 | Sequence: 8" -ForegroundColor Cyan
Write-Host "   QueryAllLCs function is now available!" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
