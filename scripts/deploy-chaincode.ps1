# Deploy coffee chaincode (External CaaS) to coffeechannel
# Runs lifecycle commands INSIDE peer containers (so externalBuilders config is active)

$ErrorActionPreference = "Stop"
$CHANNEL = "coffeechannel"
$CC_NAME = "coffee"
$CC_VERSION = "1.11"
$CC_SEQUENCE = 1
$CC_LABEL = "${CC_NAME}_${CC_VERSION}"
$ORDERER_CA = "/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

$orgs = @(
    @{ name="ecta";     peer="peer0.ecta.cecbs.et";     port=7051;  msp="ECTAMSP"     },
    @{ name="ecx";      peer="peer0.ecx.cecbs.et";      port=8051;  msp="ECXMSP"      },
    @{ name="banks";    peer="peer0.banks.cecbs.et";     port=9051;  msp="BanksMSP"    },
    @{ name="nbe";      peer="peer0.nbe.cecbs.et";       port=10051; msp="NBEMSP"      },
    @{ name="customs";  peer="peer0.customs.cecbs.et";   port=11051; msp="CustomsMSP"  },
    @{ name="shipping"; peer="peer0.shipping.cecbs.et";  port=12051; msp="ShippingMSP" }
)

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Deploying Coffee Chaincode (CaaS)" -ForegroundColor Cyan
Write-Host "  Label: $CC_LABEL   Channel: $CHANNEL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ── Step 1: Copy the orderer TLS CA into each peer container ──────────────────
Write-Host "[1/5] Distributing orderer TLS cert to peers..." -ForegroundColor Yellow
$ordererCaCrt = "C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\orderers\orderer.cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem"
foreach ($org in $orgs) {
    docker exec $org.peer sh -c "mkdir -p /var/hyperledger/orderer-tls" 2>&1 | Out-Null
    docker cp $ordererCaCrt "$($org.peer):/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>&1 | Out-Null
}
Write-Host "  Done" -ForegroundColor Green

# ── Step 2: Build and copy chaincode package into each peer ───────────────────
Write-Host "[2/5] Building chaincode package..." -ForegroundColor Yellow

$tmpDir = New-Item -ItemType Directory -Path "$env:TEMP\cc_pkg_$(Get-Random)" -Force
[System.IO.File]::WriteAllText("$tmpDir\metadata.json",   '{"type":"external","label":"' + $CC_LABEL + '"}')
[System.IO.File]::WriteAllText("$tmpDir\connection.json",  '{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}')

Push-Location $tmpDir
& tar czf code.tar.gz connection.json 2>&1 | Out-Null
& tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz 2>&1 | Out-Null
Pop-Location

$pkgLocal = "$tmpDir\${CC_LABEL}.tar.gz"

Write-Host "  Copying package to all peers..." -ForegroundColor Yellow
foreach ($org in $orgs) {
    docker cp $pkgLocal "$($org.peer):/tmp/${CC_LABEL}.tar.gz" 2>&1 | Out-Null
    Write-Host "  Copied to $($org.peer)" -ForegroundColor Green
}
Remove-Item $tmpDir -Recurse -Force

# ── Step 3: Install chaincode on each peer ────────────────────────────────────
Write-Host "[3/5] Installing chaincode on all peers..." -ForegroundColor Yellow

$packageId = ""
foreach ($org in $orgs) {
    $n = $org.name
    Write-Host "  Installing on $($org.peer)..." -NoNewline

    $mspPath = "/etc/hyperledger/fabric/users/Admin@$n.cecbs.et/msp"
    $result = docker exec `
        -e CORE_PEER_MSPCONFIGPATH=$mspPath `
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
        $org.peer `
        peer lifecycle chaincode install /tmp/${CC_LABEL}.tar.gz 2>&1

    $rStr = $result -join " "
    if ($rStr -match "already been installed") {
        Write-Host " already installed" -ForegroundColor Yellow
    } elseif ($rStr -match "Installed remotely") {
        Write-Host " installed" -ForegroundColor Green
    } else {
        Write-Host " $rStr" -ForegroundColor Yellow
    }
}

# Get package ID from ECTA
Write-Host "  Getting package ID..." -NoNewline
$qResult = docker exec `
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
    peer0.ecta.cecbs.et `
    peer lifecycle chaincode queryinstalled --output json 2>&1

$qStr = $qResult -join "`n"
if ($qStr -match '"package_id":"([^"]+)"') {
    $packageId = $Matches[1]
}
if (-not $packageId) {
    Write-Host ""
    Write-Host "ERROR: Could not get package ID. Output: $qStr" -ForegroundColor Red
    exit 1
}
Write-Host " $packageId" -ForegroundColor Green

# ── Step 4: Approve for each org ──────────────────────────────────────────────
Write-Host "[4/5] Approving for all organizations..." -ForegroundColor Yellow

foreach ($org in $orgs) {
    $n = $org.name
    Write-Host "  Approving $($org.msp)..." -NoNewline

    $mspPath = "/etc/hyperledger/fabric/users/Admin@$n.cecbs.et/msp"
    $tls = "/etc/hyperledger/fabric/tls/ca.crt"

    $result = docker exec `
        -e CORE_PEER_MSPCONFIGPATH=$mspPath `
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$tls `
        -e CORE_PEER_LOCALMSPID=$($org.msp) `
        -e CORE_PEER_ADDRESS="peer0.$n.cecbs.et:$($org.port)" `
        $org.peer `
        peer lifecycle chaincode approveformyorg `
            -o orderer.cecbs.et:7050 `
            --ordererTLSHostnameOverride orderer.cecbs.et `
            --tls --cafile $ORDERER_CA `
            --channelID $CHANNEL `
            --name $CC_NAME `
            --version $CC_VERSION `
            --package-id $packageId `
            --sequence $CC_SEQUENCE 2>&1

    $rStr = $result -join " "
    if ($rStr -match "Error") {
        Write-Host " ERROR: $rStr" -ForegroundColor Red
    } else {
        Write-Host " approved" -ForegroundColor Green
    }
}

# ── Step 5: Commit ────────────────────────────────────────────────────────────
Write-Host "[5/5] Committing chaincode definition..." -ForegroundColor Yellow

# Build peerAddresses and tlsRootCertFiles args
$commitArgs = @(
    "peer","lifecycle","chaincode","commit",
    "-o","orderer.cecbs.et:7050",
    "--ordererTLSHostnameOverride","orderer.cecbs.et",
    "--tls","--cafile",$ORDERER_CA,
    "--channelID",$CHANNEL,
    "--name",$CC_NAME,
    "--version",$CC_VERSION,
    "--sequence","$CC_SEQUENCE"
)
foreach ($org in $orgs) {
    $n = $org.name
    $commitArgs += "--peerAddresses"
    $commitArgs += "peer0.$n.cecbs.et:$($org.port)"
    $commitArgs += "--tlsRootCertFiles"
    $commitArgs += "/etc/hyperledger/fabric/tls/ca.crt"
}

$result = docker exec `
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
    -e CORE_PEER_TLS_ENABLED=true `
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" `
    -e CORE_PEER_LOCALMSPID=ECTAMSP `
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 `
    peer0.ecta.cecbs.et `
    @commitArgs 2>&1

$rStr = $result -join " "
if ($rStr -match "Error") {
    Write-Host "  ERROR: $rStr" -ForegroundColor Red
    exit 1
}
Write-Host "  Committed!" -ForegroundColor Green

# Verify
Write-Host "  Verifying..." -NoNewline
$vResult = docker exec `
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" `
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric `
    peer0.ecta.cecbs.et `
    peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME --output json 2>&1

Write-Host " $($vResult -join ' ')" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Chaincode deployed successfully!" -ForegroundColor Green
Write-Host "  $CC_NAME v$CC_VERSION on $CHANNEL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
