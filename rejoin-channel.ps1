$CHANNEL_NAME = "coffeechannel"

Write-Host "Rejoining all peers to $CHANNEL_NAME..."

# ECTA
Write-Host "Joining ECTA peer..."
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_LOCALMSPID=ECTAMSP CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

# ECX
Write-Host "Joining ECX peer..."
docker exec peer0.ecx.cecbs.et sh -c "CORE_PEER_LOCALMSPID=ECXMSP CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

# Banks
Write-Host "Joining Banks peer..."
docker exec peer0.banks.cecbs.et sh -c "CORE_PEER_LOCALMSPID=BanksMSP CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

# NBE
Write-Host "Joining NBE peer..."
docker exec peer0.nbe.cecbs.et sh -c "CORE_PEER_LOCALMSPID=NBEMSP CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

# Customs
Write-Host "Joining Customs peer..."
docker exec peer0.customs.cecbs.et sh -c "CORE_PEER_LOCALMSPID=CustomsMSP CORE_PEER_ADDRESS=peer0.customs.cecbs.et:11051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

# Shipping
Write-Host "Joining Shipping peer..."
docker exec peer0.shipping.cecbs.et sh -c "CORE_PEER_LOCALMSPID=ShippingMSP CORE_PEER_ADDRESS=peer0.shipping.cecbs.et:12051 CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer channel join -b /var/hyperledger/channel-artifacts/$CHANNEL_NAME.block"

Write-Host "Done!"
