@echo off
echo.
echo ===========================================================
echo  UPGRADING COFFEE CHAINCODE TO VERSION 1.13
echo  Adding Customs Declaration Functions
echo ===========================================================
echo.

cd C:\goCBC\chaincodes\coffee

REM Step 0: Copy orderer TLS cert to peer containers if not exists
echo [0/6] Setting up orderer TLS certificates...
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.ecta.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.ecx.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.banks.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.nbe.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.customs.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
docker cp C:\goCBC\blockchain\organizations\ordererOrganizations\cecbs.et\msp\tlscacerts\tlsca.cecbs.et-cert.pem peer0.shipping.cecbs.et:/tmp/orderer-tls-ca.crt 2>nul
echo   Done
echo.

REM Step 1: Package chaincode
echo [1/6] Packaging chaincode version 1.13...
if exist code.tar.gz del code.tar.gz
if exist coffee-1.13-ccaas.tar.gz del coffee-1.13-ccaas.tar.gz
tar -czf code.tar.gz connection.json
tar -czf coffee-1.13-ccaas.tar.gz code.tar.gz metadata.json
if errorlevel 1 (
    echo ERROR: Failed to package chaincode
    exit /b 1
)
echo   Done packaging
echo.

REM Step 2: Install on ECTA peer
echo [2/6] Installing on peer0.ecta.cecbs.et...
docker cp coffee-1.13-ccaas.tar.gz peer0.ecta.cecbs.et:/tmp/
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz" > temp_output.txt 2>&1
type temp_output.txt
for /f "tokens=*" %%i in ('findstr /C:"Chaincode code package identifier:" temp_output.txt') do set PACKAGE_LINE=%%i
for /f "tokens=5" %%i in ("%PACKAGE_LINE%") do set PACKAGE_ID=%%i
echo   Package ID: %PACKAGE_ID%
echo.

REM Step 3: Install on other peers
echo [3/6] Installing on other peers...
for %%p in (peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et) do (
    echo   Installing on %%p...
    docker cp coffee-1.13-ccaas.tar.gz %%p:/tmp/
    docker exec %%p sh -c "peer lifecycle chaincode install /tmp/coffee-1.13-ccaas.tar.gz" >nul 2>&1
)
echo   Done
echo.

REM Step 4: Approve for all organizations
echo [4/6] Approving for all organizations...

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

echo   Done approving
echo.

REM Step 5: Check commit readiness
echo [5/6] Checking commit readiness...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode checkcommitreadiness --channelID coffeechannel --name coffee --version 1.13 --sequence 3 --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"
echo.

REM Step 6: Commit
echo [6/6] Committing chaincode to channel...
docker exec peer0.ecta.cecbs.et sh -c "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer lifecycle chaincode commit --channelID coffeechannel --name coffee --version 1.13 --sequence 3 --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --orderer orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /tmp/orderer-tls-ca.crt"

echo.
echo ===========================================================
echo  CHAINCODE UPGRADE COMPLETED!
echo    Version: 1.13 ^| Sequence: 3
echo    Customs Declaration functions now available!
echo ===========================================================
echo.

del temp_output.txt >nul 2>&1
pause
