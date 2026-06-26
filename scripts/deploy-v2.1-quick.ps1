#!/usr/bin/env pwsh
# Quick deployment script for v2.1

$ErrorActionPreference = "Continue"
$PACKAGE_ID = "coffee_2.1:10760d8307b117be902ae083a031df5998f590be58da7bfab102d3557bbb44a9"
$CHANNEL_NAME = "coffeechannel"
$CHAINCODE_NAME = "coffee"
$VERSION = "2.1"
$SEQUENCE = 9

Write-Host "Installing and approving on all peers..." -ForegroundColor Cyan

$orgs = @(
    @{Name="nbe"; Container="peer0.nbe.cecbs.et"},
    @{Name="banks"; Container="peer0.banks.cecbs.et"},
    @{Name="customs"; Container="peer0.customs.cecbs.et"},
    @{Name="ecx"; Container="peer0.ecx.cecbs.et"},
    @{Name="shipping"; Container="peer0.shipping.cecbs.et"}
)

# Copy orderer CA to all peers
Write-Host "Copying orderer CA cert to peers..." -ForegroundColor Yellow
foreach ($org in $orgs) {
    docker cp C:\CEX\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\tls\ca.crt "$($org.Container):/tmp/orderer-ca.crt" 2>&1 | Out-Null
}

# Copy package to all peers
Write-Host "Copying chaincode package to peers..." -ForegroundColor Yellow
foreach ($org in $orgs) {
    docker cp C:\CEX\chaincodes\coffee\coffee-v2.1-complete.tar.gz "$($org.Container):/tmp/coffee-v2.1-complete.tar.gz" 2>&1 | Out-Null
}

# Install and approve on each peer
foreach ($org in $orgs) {
    $container = $org.Container
    $orgName = $org.Name
    
    Write-Host "Processing $orgName..." -ForegroundColor Cyan
    
    # Install
    Write-Host "  Installing..." -ForegroundColor Yellow
    $installOutput = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$($orgName).cecbs.et/msp $container peer lifecycle chaincode install /tmp/coffee-v2.1-complete.tar.gz 2>&1
    if ($installOutput -match "already successfully installed") {
        Write-Host "    (already installed)" -ForegroundColor Gray
    }
    
    # Approve
    Write-Host "  Approving..." -ForegroundColor Yellow
    $approveOutput = docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$($orgName).cecbs.et/msp $container peer lifecycle chaincode approveformyorg --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile /tmp/orderer-ca.crt 2>&1
    
    Write-Host "  [OK] $orgName complete" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking commit readiness..." -ForegroundColor Yellow
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile /tmp/orderer-ca.crt --output json

Write-Host ""
Write-Host "Committing chaincode..." -ForegroundColor Yellow
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode commit --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $VERSION --sequence $SEQUENCE --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --tls --cafile /tmp/orderer-ca.crt

Write-Host ""
Write-Host "[OK] Chaincode v$VERSION deployed!" -ForegroundColor Green
