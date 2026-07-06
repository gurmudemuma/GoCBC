@echo off
echo.
echo ===========================================================
echo  COMMITTING COFFEE CHAINCODE VERSION 1.13 (SEQUENCE 4)
echo ===========================================================
echo.

echo Checking commit readiness...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode checkcommitreadiness --channelID coffeechannel --name coffee --version 1.13 --sequence 4 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Committing chaincode to channel (sequence 4)...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode commit --channelID coffeechannel --name coffee --version 1.13 --sequence 4 --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /tmp/ecx-tls-ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /tmp/banks-tls-ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /tmp/nbe-tls-ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /tmp/customs-tls-ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /tmp/shipping-tls-ca.crt --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Verifying committed chaincode...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee"

echo.
echo ===========================================================
echo  CHAINCODE COMMIT COMPLETED!
echo ===========================================================
echo.
pause
