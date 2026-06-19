# Upgrade Coffee Chaincode to add QueryAllLCs function
# Version: 1.10 -> 1.11

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   UPGRADING COFFEE CHAINCODE TO VERSION 1.11                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$CHAINCODE_NAME = "coffee"
$CHAINCODE_VERSION = "1.11"
$CHANNEL_NAME = "coffeechannel"
$SEQUENCE = 8  # Increment from current sequence 7

# Set working directory
Set-Location C:\CEX

Write-Host "Step 1: Packaging chaincode..." -ForegroundColor Yellow
Set-Location chaincodes\coffee

# Create connection.json for external chaincode
$connectionJson = @'
{
  "address": "coffee:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
'@
$connectionJson | Out-File -FilePath connection.json -Encoding utf8

# Create metadata.json
$metadataJson = @'
{
  "type": "external",
  "label": "coffee_1.11"
}
'@
$metadataJson | Out-File -FilePath metadata.json -Encoding utf8

# Package the chaincode
Write-Host "  Creating tar archive..." -ForegroundColor Gray
tar -czf code.tar.gz connection.json
if (-not (Test-Path code.tar.gz)) {
    Write-Host "✗ Failed to create code.tar.gz" -ForegroundColor Red
    exit 1
}

tar -czf ${CHAINCODE_NAME}-${CHAINCODE_VERSION}-ccaas.tar.gz code.tar.gz metadata.json
if (-not (Test-Path "${CHAINCODE_NAME}-${CHAINCODE_VERSION}-ccaas.tar.gz")) {
    Write-Host "✗ Failed to create chaincode package" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Chaincode packaged: ${CHAINCODE_NAME}-${CHAINCODE_VERSION}-ccaas.tar.gz" -ForegroundColor Green

# Install on all peers
Write-Host "`nStep 2: Installing chaincode on all peers..." -ForegroundColor Yellow

$peers = @(
    @{Name="peer0.ecta.cecbs.et"; Port=7051; MSP="ECTAMSP"},
    @{Name="peer0.ecx.cecbs.et"; Port=8051; MSP="ECXMSP"},
    @{Name="peer0.banks.cecbs.et"; Port=9051; MSP="BanksMSP"},
    @{Name="peer0.nbe.cecbs.et"; Port=10051; MSP="NBEMSP"},
    @{Name="peer0.customs.cecbs.et"; Port=11051; MSP="CustomsMSP"},
    @{Name="peer0.shipping.cecbs.et"; Port=12051; MSP="ShippingMSP"}
)

$packageId = ""

foreach ($peer in $peers) {
    $orgName = $peer.MSP.Replace("MSP", "").ToLower()
    Write-Host "  Installing on $($peer.Name)..." -ForegroundColor Gray
    
    docker cp ${CHAINCODE_NAME}-${CHAINCODE_VERSION}-ccaas.tar.gz "$($peer.Name):/tmp/"
    
    $output = docker exec `
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${orgName}.cecbs.et/msp `
        $peer.Name `
        peer lifecycle chaincode install /tmp/${CHAINCODE_NAME}-${CHAINCODE_VERSION}-ccaas.tar.gz 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Installed on $($peer.Name)" -ForegroundColor Green
        
        # Extract package ID from first successful install
        if ($packageId -eq "") {
            $match = $output | Select-String -Pattern "Chaincode code package identifier: (.+)"
            if ($match) {
                $packageId = $match.Matches[0].Groups[1].Value
                Write-Host "  Package ID: $packageId" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "  ✗ Failed to install on $($peer.Name)" -ForegroundColor Red
        Write-Host $output
    }
}

if ($packageId -eq "") {
    Write-Host "`n✗ Failed to get package ID" -ForegroundColor Red
    exit 1
}

# Approve for all orgs
Write-Host "`nStep 3: Approving chaincode for all organizations..." -ForegroundColor Yellow

foreach ($peer in $peers) {
    $orgName = $peer.MSP.Replace("MSP", "").ToLower()
    Write-Host "  Approving for $($peer.MSP)..." -ForegroundColor Gray
    
    docker exec `
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${orgName}.cecbs.et/msp `
        -e CORE_PEER_ADDRESS=$($peer.Name):$($peer.Port) `
        -e CORE_PEER_LOCALMSPID=$($peer.MSP) `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt `
        $peer.Name `
        peer lifecycle chaincode approveformyorg `
            --channelID $CHANNEL_NAME `
            --name $CHAINCODE_NAME `
            --version $CHAINCODE_VERSION `
            --package-id $packageId `
            --sequence $SEQUENCE `
            --tls `
            --cafile /etc/hyperledger/fabric/tls/ca.crt `
            --waitForEvent 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Approved by $($peer.MSP)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to approve by $($peer.MSP)" -ForegroundColor Red
    }
}

# Check commit readiness
Write-Host "`nStep 4: Checking commit readiness..." -ForegroundColor Yellow

docker exec `
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp `
    peer0.ecta.cecbs.et `
    peer lifecycle chaincode checkcommitreadiness `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $SEQUENCE `
        --tls `
        --cafile /etc/hyperledger/fabric/tls/ca.crt

# Commit the chaincode
Write-Host "`nStep 5: Committing chaincode to channel..." -ForegroundColor Yellow

$peerAddresses = $peers | ForEach-Object { "--peerAddresses $($_.Name):$($_.Port)" }
$tlsRootCerts = $peers | ForEach-Object { 
    $orgName = $_.MSP.Replace("MSP", "").ToLower()
    "--tlsRootCertFiles /etc/hyperledger/fabric/users/Admin@${orgName}.cecbs.et/tls/ca.crt"
}

docker exec `
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp `
    peer0.ecta.cecbs.et `
    peer lifecycle chaincode commit `
        --channelID $CHANNEL_NAME `
        --name $CHAINCODE_NAME `
        --version $CHAINCODE_VERSION `
        --sequence $SEQUENCE `
        $peerAddresses `
        $tlsRootCerts `
        --tls `
        --cafile /etc/hyperledger/fabric/tls/ca.crt `
        --waitForEvent

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Chaincode committed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Failed to commit chaincode" -ForegroundColor Red
    exit 1
}

# Restart chaincode container
Write-Host "`nStep 6: Restarting chaincode container..." -ForegroundColor Yellow

docker-compose -f docker-compose-chaincode.yml restart coffee

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   CHAINCODE UPGRADE COMPLETED SUCCESSFULLY!                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "New chaincode version: $CHAINCODE_VERSION" -ForegroundColor Cyan
Write-Host "Sequence: $SEQUENCE" -ForegroundColor Cyan
Write-Host ""
Write-Host "The QueryAllLCs function is now available!" -ForegroundColor Green
