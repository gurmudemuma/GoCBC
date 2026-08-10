$env:CORE_PEER_LOCALMSPID="ECTAMSP"
$env:CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051"
$env:CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp"
$env:CORE_PEER_TLS_ENABLED="true"
$env:CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt"

docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{\"Args\":[\"QueryAllExporters\"]}'
