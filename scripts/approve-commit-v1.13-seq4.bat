@echo off
echo.
echo ===========================================================
echo  APPROVING AND COMMITTING V1.13 AS SEQUENCE 4
echo ===========================================================
echo.

set PACKAGE_ID=coffee_1.13:69412010fb728a5527ea93cc031861b86596bbf4a4e0750d638564f037e03a1a

echo [1/3] Approving for all organizations (sequence 4)...
echo.

echo   Approving for ECTAMSP...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 CORE_PEER_LOCALMSPID=ECTAMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for ECXMSP...
docker exec peer0.ecx.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 CORE_PEER_LOCALMSPID=ECXMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for BanksMSP...
docker exec peer0.banks.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 CORE_PEER_LOCALMSPID=BanksMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for NBEMSP...
docker exec peer0.nbe.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 CORE_PEER_LOCALMSPID=NBEMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for CustomsMSP...
docker exec peer0.customs.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp CORE_PEER_ADDRESS=peer0.customs.cecbs.et:11051 CORE_PEER_LOCALMSPID=CustomsMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for ShippingMSP...
docker exec peer0.shipping.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp CORE_PEER_ADDRESS=peer0.shipping.cecbs.et:12051 CORE_PEER_LOCALMSPID=ShippingMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo [2/3] Checking commit readiness...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode checkcommitreadiness --channelID coffeechannel --name coffee --version 1.13 --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo [3/3] Committing chaincode to channel...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode commit --channelID coffeechannel --name coffee --version 1.13 --sequence 4 --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /tmp/ecx-tls-ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /tmp/banks-tls-ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /tmp/nbe-tls-ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /tmp/customs-tls-ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /tmp/shipping-tls-ca.crt --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Verifying committed chaincode...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee"

echo.
echo ===========================================================
echo  CHAINCODE UPGRADE COMPLETED!
echo  Version: 1.13 - Sequence: 4
echo  Customs Declaration functions now available!
echo ===========================================================
echo.
pause
