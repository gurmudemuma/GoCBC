@echo off
REM Deploy chaincode v1.57 with contract fixes

echo ==========================================
echo Deploying Chaincode v1.57
echo ==========================================
echo.

echo Step 1: Copy chaincode package to peer container...
docker cp chaincodes\coffee\coffee_1.57.tgz peer0.ecx.cecbs.et:/tmp/coffee_1.57.tgz
if errorlevel 1 goto error
echo Done.
echo.

echo Step 2: Install chaincode on ECX peer...
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.57.tgz
if errorlevel 1 goto error
echo Done.
echo.

echo Step 3: Query installed chaincode to get package ID...
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et peer lifecycle chaincode queryinstalled > installed.txt
type installed.txt
echo.

echo Please extract the Package ID from above output and run:
echo docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID coffeechannel --name coffee --version 1.57 --package-id PACKAGE_ID_HERE --sequence 57 --tls --cafile /etc/hyperledger/fabric/channel-artifacts/tls-ecx.crt
echo.
echo Then commit:
echo docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et peer lifecycle chaincode commit -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --channelID coffeechannel --name coffee --version 1.57 --sequence 57 --tls --cafile /etc/hyperledger/fabric/channel-artifacts/tls-ecx.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt
echo.
goto end

:error
echo ERROR: Deployment failed!
exit /b 1

:end
echo Script completed.
