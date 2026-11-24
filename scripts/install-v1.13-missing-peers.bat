@echo off
echo Installing chaincode v1.13 on missing peers...

echo.
echo [1/4] NBE Peer...
docker cp C:\goCBC\chaincodes\coffee\coffee-1.13-ccaas.tar.gz peer0.nbe.cecbs.et:/tmp/
docker exec peer0.nbe.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz"

echo.
echo [2/4] Shipping Peer...
docker cp C:\goCBC\chaincodes\coffee\coffee-1.13-ccaas.tar.gz peer0.shipping.cecbs.et:/tmp/
docker exec peer0.shipping.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz"

echo.
echo [3/4] Banks Peer...
docker cp C:\goCBC\chaincodes\coffee\coffee-1.13-ccaas.tar.gz peer0.banks.cecbs.et:/tmp/
docker exec peer0.banks.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz"

echo.
echo [4/4] ECX Peer...
docker cp C:\goCBC\chaincodes\coffee\coffee-1.13-ccaas.tar.gz peer0.ecx.cecbs.et:/tmp/
docker exec peer0.ecx.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz"

echo.
echo Done! Chaincode v1.13 installed on all peers.
pause
