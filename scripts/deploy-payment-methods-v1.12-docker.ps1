#!/usr/bin/env pwsh
# CECBS Chaincode Docker Deployment Script - Payment Method Differentiation
# Version: 1.12
# Date: June 26, 2026
# Purpose: Deploy chaincode using Docker exec (for containerized Fabric network)

param(
    [switch]$SkipPackage = $false,
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
$CHAINCODE_PATH = "/opt/gopath/src/github.com/cecbs/chaincodes/coffee"
$PACKAGE_FILE = "coffee_$CHAINCODE_VERSION.tar.gz"
$ORDERER_CA = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

Write-Info "=========================================================="
Write-Info "CECBS Docker Chaincode Deployment - Payment Methods v1.12"
Write-Info "=========================================================="
Write-Info ""
Write-Info "Organizations in this network:"
Write-Info "  1. ECTA - peer0.ecta.cecbs.et"
Write-Info "  2. ECX - peer0.ecx.cecbs.et"
Write-Info "  3. Banks - peer0.banks.cecbs.et"
Write-Info "  4. NBE - peer0.nbe.cecbs.et"
Write-Info "  5. Customs - peer0.customs.cecbs.et"
Write-Info "  6. Shipping - peer0.shipping.cecbs.et"
Write-Info ""
Write-Info "Features in v1.12:"
Write-Info "  - 5 Payment Methods (LC, CAD, TT_ADVANCE, TT_POST, ADVANCE)"
Write-Info "  - Payment method-specific status transitions"
Write-Info "  - Prerequisite validation"
Write-Info "  - Document release control"
Write-Info "  - Multi-stage payment tracking"
Write-Info ""

# Check if Docker is running
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found"
    exit 1
}

# Check if peer containers are running
$peerCount = (docker ps --filter "name=peer0" --format "{{.Names}}" | Measure-Object).Count
if ($peerCount -lt 6) {
    Write-Error "Expected 6 peer containers, found $peerCount. Please start the Fabric network."
    exit 1
}

Write-Success "Found $peerCount peer containers running"
Write-Info ""

# Organization configurations for Docker
$organizations = @(
    @{
        Name = "ECTA"
        Container = "peer0.ecta.cecbs.et"
        MSPID = "ECTAMSP"
        PeerAddress = "peer0.ecta.cecbs.et:7051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt"
    },
    @{
        Name = "ECX"
        Container = "peer0.ecx.cecbs.et"
        MSPID = "ECXMSP"
        PeerAddress = "peer0.ecx.cecbs.et:8051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt"
    },
    @{
        Name = "Banks"
        Container = "peer0.banks.cecbs.et"
        MSPID = "BanksMSP"
        PeerAddress = "peer0.banks.cecbs.et:9051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt"
    },
    @{
        Name = "NBE"
        Container = "peer0.nbe.cecbs.et"
        MSPID = "NBEMSP"
        PeerAddress = "peer0.nbe.cecbs.et:10051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt"
    },
    @{
        Name = "Customs"
        Container = "peer0.customs.cecbs.et"
        MSPID = "CustomsMSP"
        PeerAddress = "peer0.customs.cecbs.et:11051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/customs.cecbs.et/users/Admin@customs.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt"
    },
    @{
        Name = "Shipping"
        Container = "peer0.shipping.cecbs.et"
        MSPID = "ShippingMSP"
        PeerAddress = "peer0.shipping.cecbs.et:12051"
        MSPConfigPath = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipping.cecbs.et/users/Admin@shipping.cecbs.et/msp"
        TLSRootCert = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt"
    }
)

# ==================== STEP 1: PACKAGE CHAINCODE ====================
if (-not $SkipPackage -and -not $TestOnly) {
    Write-Info "=========================================================="
    Write-Info "[STEP 1/6] PACKAGING CHAINCODE"
    Write-Info "=========================================================="
    
    # Package using ECTA peer container
    $ectaContainer = $organizations[0].Container
    
    Write-Info "Packaging chaincode in container: $ectaContainer"
    Write-Info "Running go mod tidy..."
    
    docker exec $ectaContainer bash -c "cd $CHAINCODE_PATH && go mod tidy"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "go mod tidy failed"
        exit 1
    }
    
    Write-Info "Creating package: $PACKAGE_FILE"
    
    docker exec -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
        -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
        $ectaContainer bash -c @"
peer lifecycle chaincode package $PACKAGE_FILE \
    --path $CHAINCODE_PATH \
    --lang golang \
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}
"@
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Chaincode packaging failed"
        exit 1
    }
    
    # Copy package to all other peer containers
    Write-Info "Copying package to other peer containers..."
    for ($i = 1; $i -lt $organizations.Count; $i++) {
        $targetContainer = $organizations[$i].Container
        Write-Info "  Copying to $targetContainer..."
        docker exec $ectaContainer bash -c "cat $PACKAGE_FILE" | `
            docker exec -i $targetContainer bash -c "cat > $PACKAGE_FILE"
    }
    
    Write-Success "Chaincode packaged and distributed to all peers"
    Write-Info ""
}

# ==================== STEP 2: INSTALL ON ALL PEERS ====================
$packageIds = @{}

if (-not $TestOnly) {
    Write-Info "=========================================================="
    Write-Info "[STEP 2/6] INSTALLING CHAINCODE ON ALL PEERS"
    Write-Info "=========================================================="
    Write-Info ""
    
    foreach ($org in $organizations) {
        Write-Info "Installing on $($org.Name) peer..."
        
        $installCmd = @"
peer lifecycle chaincode install $PACKAGE_FILE
"@
        
        $installOutput = docker exec -e CORE_PEER_ADDRESS=$($org.PeerAddress) `
            -e CORE_PEER_LOCALMSPID=$($org.MSPID) `
            -e CORE_PEER_TLS_ENABLED=true `
            -e CORE_PEER_TLS_ROOTCERT_FILE=$($org.TLSRootCert) `
            -e CORE_PEER_MSPCONFIGPATH=$($org.MSPConfigPath) `
            $($org.Container) bash -c $installCmd 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "  $($org.Name) - INSTALLED"
            
            # Extract package ID
            $packageIdMatch = [regex]::Match($installOutput, "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:[a-f0-9]+")
            if ($packageIdMatch.Success) {
                $packageIds[$org.Name] = $packageIdMatch.Value
            }
        } else {
            Write-Warning "  $($org.Name) - FAILED or already installed"
            Write-Info "  Output: $installOutput"
        }
    }
    
    Write-Info ""
    Write-Info "Installation Summary:"
    foreach ($key in $packageIds.Keys) {
        Write-Info "  $key : $($packageIds[$key])"
    }
    
    # Use first package ID (should be same for all)
    $PACKAGE_ID = $packageIds[$organizations[0].Name]
    
    if ([string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
        # Try to query installed chaincode
        Write-Info "Querying installed chaincodes..."
        $queryOutput = docker exec -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
            -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
            $($organizations[0].Container) peer lifecycle chaincode queryinstalled
        
        Write-Info $queryOutput
        
        $PACKAGE_ID = Read-Host "Enter Package ID for ${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
    }
    
    Write-Info ""
    Write-Success "Package ID: $PACKAGE_ID"
    Write-Info ""
}

# ==================== STEP 3: APPROVE FOR ALL ORGANIZATIONS ====================
if (-not $TestOnly) {
    Write-Info "=========================================================="
    Write-Info "[STEP 3/6] APPROVING CHAINCODE FOR ALL ORGANIZATIONS"
    Write-Info "=========================================================="
    Write-Info ""
    
    $approvalCount = 0
    
    foreach ($org in $organizations) {
        Write-Info "Approving for $($org.Name)..."
        
        $approveCmd = @"
peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA
"@
        
        docker exec -e CORE_PEER_ADDRESS=$($org.PeerAddress) `
            -e CORE_PEER_LOCALMSPID=$($org.MSPID) `
            -e CORE_PEER_TLS_ENABLED=true `
            -e CORE_PEER_TLS_ROOTCERT_FILE=$($org.TLSRootCert) `
            -e CORE_PEER_MSPCONFIGPATH=$($org.MSPConfigPath) `
            $($org.Container) bash -c $approveCmd 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "  $($org.Name) - APPROVED"
            $approvalCount++
        } else {
            Write-Warning "  $($org.Name) - FAILED (may be already approved)"
        }
    }
    
    Write-Info ""
    Write-Success "Approved by $approvalCount / $($organizations.Count) organizations"
    Write-Info ""
}

# ==================== STEP 4: CHECK COMMIT READINESS ====================
if (-not $TestOnly) {
    Write-Info "=========================================================="
    Write-Info "[STEP 4/6] CHECKING COMMIT READINESS"
    Write-Info "=========================================================="
    
    $checkCmd = @"
peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    --output json
"@
    
    docker exec -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
        -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
        $($organizations[0].Container) bash -c $checkCmd
    
    Write-Info ""
    $continue = Read-Host "Continue with commit? (y/n)"
    if ($continue -ne "y") {
        Write-Warning "Deployment paused"
        exit 0
    }
}

# ==================== STEP 5: COMMIT CHAINCODE ====================
if (-not $TestOnly) {
    Write-Info ""
    Write-Info "=========================================================="
    Write-Info "[STEP 5/6] COMMITTING CHAINCODE TO CHANNEL"
    Write-Info "=========================================================="
    
    # Build peer addresses and TLS cert files
    $peerAddressesList = @()
    $tlsRootCertsList = @()
    
    foreach ($org in $organizations) {
        $peerAddressesList += "--peerAddresses $($org.PeerAddress)"
        $tlsRootCertsList += "--tlsRootCertFiles $($org.TLSRootCert)"
    }
    
    $peerAddressesStr = $peerAddressesList -join " "
    $tlsRootCertsStr = $tlsRootCertsList -join " "
    
    $commitCmd = @"
peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    $peerAddressesStr \
    $tlsRootCertsStr
"@
    
    Write-Info "Committing chaincode with all peer endorsements..."
    Write-Info ""
    
    docker exec -e CORE_PEER_ADDRESS=$($organizations[0].PeerAddress) `
        -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$($organizations[0].TLSRootCert) `
        -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
        $($organizations[0].Container) bash -c $commitCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Chaincode committed successfully!"
    } else {
        Write-Error "Chaincode commit failed"
        exit 1
    }
    
    Write-Info ""
}

# ==================== STEP 6: VERIFY DEPLOYMENT ====================
Write-Info "=========================================================="
Write-Info "[STEP 6/6] VERIFYING DEPLOYMENT"
Write-Info "=========================================================="
Write-Info ""

$queryCommittedCmd = @"
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CHAINCODE_NAME
"@

docker exec -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
    -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
    $($organizations[0].Container) bash -c $queryCommittedCmd

Write-Info ""

# Test query
Write-Info "[Test] Querying chaincode..."
$testQueryCmd = @"
peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"QueryAllContracts\",\"Args\":[]}'
"@

docker exec -e CORE_PEER_MSPCONFIGPATH=$($organizations[0].MSPConfigPath) `
    -e CORE_PEER_LOCALMSPID=$($organizations[0].MSPID) `
    $($organizations[0].Container) bash -c $testQueryCmd

if ($LASTEXITCODE -eq 0) {
    Write-Success "Query successful - chaincode is operational!"
} else {
    Write-Warning "Query failed - chaincode may need initialization"
}

# ==================== DEPLOYMENT SUMMARY ====================
Write-Info ""
Write-Success "=========================================================="
Write-Success "DEPLOYMENT COMPLETE!"
Write-Success "=========================================================="
Write-Info ""
Write-Info "Chaincode: $CHAINCODE_NAME v$CHAINCODE_VERSION (sequence $CHAINCODE_SEQUENCE)"
Write-Info "Channel: $CHANNEL_NAME"
Write-Info "Organizations: 6 (ECTA, ECX, Banks, NBE, Customs, Shipping)"
Write-Info ""
Write-Info "New Payment Method Functions:"
Write-Info "  1. InitiatePayment - With payment method parameter"
Write-Info "  2. ReleaseDocumentsToBuyer - Document control for CAD/LC"
Write-Info "  3. ReceiveAdvancePayment - Advance payment tracking"
Write-Info "  4. ReceiveBalancePayment - Balance payment tracking"
Write-Info "  5. UpdatePaymentStatus - Status update with validation"
Write-Info "  6. QueryPaymentsByMethod - Query by payment method"
Write-Info ""
Write-Info "Payment Methods: LC, CAD, TT_ADVANCE, TT_POST, ADVANCE"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Restart API server: cd C:\CEX\api && npm run dev"
Write-Info "  2. Test payment methods via API endpoints"
Write-Info "  3. Verify method-specific workflows"
Write-Info ""
Write-Success "Payment Method Differentiation is ACTIVE!"
