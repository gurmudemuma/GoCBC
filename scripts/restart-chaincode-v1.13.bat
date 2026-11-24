@echo off
echo.
echo ===========================================================
echo  RESTARTING CHAINCODE CONTAINER WITH V1.13 PACKAGE ID
echo ===========================================================
echo.

echo Stopping old chaincode container...
docker stop coffee-chaincode 2>nul
docker rm coffee-chaincode 2>nul

echo.
echo Starting chaincode container with package ID...
docker run -d ^
  --name coffee-chaincode ^
  --network cecbs-network ^
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 ^
  -e CORE_CHAINCODE_ID_NAME=coffee_1.13:69412010fb728a5527ea93cc031861b86596bbf4a4e0750d638564f037e03a1a ^
  -p 9999:9999 ^
  coffee-chaincode:latest

echo.
echo Waiting 5 seconds for chaincode to start...
timeout /t 5 /nobreak >nul

echo.
echo Checking chaincode container status...
docker ps --filter "name=coffee-chaincode"

echo.
echo Checking chaincode logs...
docker logs coffee-chaincode --tail 20

echo.
echo ===========================================================
echo  CHAINCODE CONTAINER RESTARTED!
echo ===========================================================
echo.
pause
