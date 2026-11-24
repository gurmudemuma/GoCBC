# Join all peers to coffeechannel (skips peers already joined)
$WORK = "C:/goCBC"
$CHANNEL = "coffeechannel"
$BLOCK = "/work/blockchain/channel-artifacts/$CHANNEL.block"
$ORDERER_CA = "/work/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

$orgs = @(
    @{ name="ecta";     port=7051;  msp="ECTAMSP"     },
    @{ name="ecx";      port=8051;  msp="ECXMSP"      },
    @{ name="banks";    port=9051;  msp="BanksMSP"    },
    @{ name="nbe";      port=10051; msp="NBEMSP"      },
    @{ name="customs";  port=11051; msp="CustomsMSP"  },
    @{ name="shipping"; port=12051; msp="ShippingMSP" }
)

# Fetch channel block using ECTA admin
Write-Host "Fetching channel block from orderer..." -ForegroundColor Cyan
docker run --rm --network cecbs-network `
    -v "${WORK}:/work" -w /work `
    -e CORE_PEER_TLS_ENABLED=true `
    -e CORE_PEER_LOCALMSPID=ECTAMSP `
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" `
    -e "CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" `
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 `
    hyperledger/fabric-tools:2.5 `
    peer channel fetch 0 $BLOCK -o orderer.cecbs.et:7050 -c $CHANNEL --tls --cafile $ORDERER_CA 2>&1 | Out-Null

Write-Host "Channel block fetched." -ForegroundColor Green

foreach ($org in $orgs) {
    $n    = $org.name
    $port = $org.port
    $msp  = $org.msp
    $tls  = "/work/blockchain/organizations/peerOrganizations/$n.cecbs.et/peers/peer0.$n.cecbs.et/tls/ca.crt"
    $mspP = "/work/blockchain/organizations/peerOrganizations/$n.cecbs.et/users/Admin@$n.cecbs.et/msp"
    $addr = "peer0.$n.cecbs.et:$port"

    Write-Host "Joining peer0.$n ..." -ForegroundColor Cyan

    $out = docker run --rm --network cecbs-network `
        -v "${WORK}:/work" -w /work `
        -e CORE_PEER_TLS_ENABLED=true `
        -e CORE_PEER_LOCALMSPID=$msp `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$tls `
        -e CORE_PEER_MSPCONFIGPATH=$mspP `
        -e CORE_PEER_ADDRESS=$addr `
        hyperledger/fabric-tools:2.5 `
        peer channel join -b $BLOCK 2>&1

    $outStr = $out -join " "
    if ($outStr -match "already exists") {
        Write-Host "  peer0.$n already on channel - skipping" -ForegroundColor Yellow
    } elseif ($outStr -match "Successfully submitted") {
        Write-Host "  peer0.$n joined coffeechannel" -ForegroundColor Green
    } else {
        Write-Host "  peer0.$n result: $outStr" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All peers processed for coffeechannel." -ForegroundColor Green
