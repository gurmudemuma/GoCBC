# Quick install script for v1.4

$CHANNEL_NAME = "coffeechannel"
$CC_NAME = "coffee"
$CC_VERSION = "1.4"
$CC_SEQUENCE = "5"
$WORK_DIR = (Get-Location).Path.Replace('\', '/')
$ORDERER_CA = "/work/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

Write-Host "=== Installing Chaincode v1.4 ===" -ForegroundColor Cyan
Write-Host ""

# Install on ECTA
Write-Host "Installing on ECTA..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECTAMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

# Install on ECX
Write-Host "Installing on ECX..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECXMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecx.cecbs.et:8051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

# Install on Banks
Write-Host "Installing on Banks..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="BanksMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.banks.cecbs.et:9051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

# Install on NBE
Write-Host "Installing on NBE..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="NBEMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.nbe.cecbs.et:10051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

# Install on Customs
Write-Host "Installing on Customs..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="CustomsMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/customs.cecbs.et/users/Admin@customs.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.customs.cecbs.et:11051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

# Install on Shipping
Write-Host "Installing on Shipping..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ShippingMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/users/Admin@shipping.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.shipping.cecbs.et:12051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode install /work/chaincodes/coffee/coffee-v14-ccaas.tar.gz

Write-Host ""
Write-Host "Getting package ID..." -ForegroundColor Yellow
$queryOutput = docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECTAMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode queryinstalled 2>&1

if ($queryOutput -match "coffee_1\.4:([a-f0-9]{64})") {
    $CC_PACKAGE_ID = "coffee_1.4:$($matches[1])"
    Write-Host "Package ID: $CC_PACKAGE_ID" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find package ID" -ForegroundColor Red
    Write-Host $queryOutput
    exit 1
}

Write-Host ""
Write-Host "Approving for all 6 organizations..." -ForegroundColor Yellow

# Approve ECTA
Write-Host "  Approving ECTA..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECTAMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

# Approve ECX
Write-Host "  Approving ECX..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECXMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecx.cecbs.et:8051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

# Approve Banks
Write-Host "  Approving Banks..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="BanksMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/banks.cecbs.et/users/Admin@banks.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.banks.cecbs.et:9051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

# Approve NBE
Write-Host "  Approving NBE..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="NBEMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.nbe.cecbs.et:10051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

# Approve Customs
Write-Host "  Approving Customs..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="CustomsMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/customs.cecbs.et/users/Admin@customs.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.customs.cecbs.et:11051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

# Approve Shipping
Write-Host "  Approving Shipping..." -ForegroundColor Gray
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ShippingMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/users/Admin@shipping.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.shipping.cecbs.et:12051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA

Write-Host ""
Write-Host "Committing chaincode..." -ForegroundColor Yellow
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECTAMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode commit -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt

Write-Host ""
Write-Host "=== DEPLOYED ===" -ForegroundColor Green
docker run --rm --network cecbs-network -v "${WORK_DIR}:/work" -w /work -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="ECTAMSP" -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt" -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp" -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" hyperledger/fabric-tools:2.5 peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME --tls --cafile $ORDERER_CA
