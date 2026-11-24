@echo off
SET MSYS_NO_PATHCONV=1
SET MSYS2_ARG_CONV_EXCL=*
"C:\Program Files\Git\bin\bash.exe" -c "MSYS_NO_PATHCONV=1 docker exec -e FABRIC_CFG_PATH=//etc/hyperledger/fabric -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID=ECTAMSP -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 -e CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt -e CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1"
