@echo off
echo.
echo ===========================================================
echo  RE-APPROVING COFFEE CHAINCODE V1.13 WITH CORRECT PACKAGE ID
echo ===========================================================
echo.

set PACKAGE_ID=coffee_1.13:69412010fb728a5527ea93cc031861b86596bbf4a4e0750d638564f037e03a1a

echo Using Package ID: %PACKAGE_ID%
echo.

echo Approving for all organizations...
echo.

echo   Approving for ECTAMSP...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 CORE_PEER_LOCALMSPID=ECTAMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for ECXMSP...
docker exec peer0.ecx.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 CORE_PEER_LOCALMSPID=ECXMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for BanksMSP...
docker exec peer0.banks.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 CORE_PEER_LOCALMSPID=BanksMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for NBEMSP...
docker exec peer0.nbe.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 CORE_PEER_LOCALMSPID=NBEMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for CustomsMSP...
docker exec peer0.customs.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp CORE_PEER_ADDRESS=peer0.customs.cecbs.et:11051 CORE_PEER_LOCALMSPID=CustomsMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo   Approving for ShippingMSP...
docker exec peer0.shipping.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp CORE_PEER_ADDRESS=peer0.shipping.cecbs.et:12051 CORE_PEER_LOCALMSPID=ShippingMSP CORE_PEER_TLS_ENABLED=true CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt peer lifecycle chaincode approveformyorg --channelID coffeechannel --name coffee --version 1.13 --package-id %PACKAGE_ID% --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Done approving
echo.

echo Checking commit readiness...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode checkcommitreadiness --channelID coffeechannel --name coffee --version 1.13 --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Verifying approval with package ID...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode queryapproved --channelID coffeechannel --name coffee --sequence 3"

echo.
echo ===========================================================
echo  RE-APPROVAL COMPLETED!
echo ===========================================================
echo.
pause
