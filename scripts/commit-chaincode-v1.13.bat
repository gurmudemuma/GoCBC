@echo off
echo.
echo ===========================================================
echo  COMMITTING COFFEE CHAINCODE VERSION 1.13
echo ===========================================================
echo.

echo Committing chaincode to channel...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode commit --channelID coffeechannel --name coffee --version 1.13 --sequence 3 --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo Verifying committed chaincode...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee"

echo.
echo ===========================================================
echo  CHAINCODE COMMIT COMPLETED!
echo ===========================================================
echo.
pause
