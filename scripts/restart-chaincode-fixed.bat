@echo off
echo Removing old container...
docker rm -f coffee-chaincode 2>nul

echo.
echo Starting new chaincode container with customs functions...
docker run -d --name coffee-chaincode --network cecbs-network -p 9999:9999 -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 -e CORE_CHAINCODE_ID_NAME=coffee_1.13:abc123 coffee-chaincode:latest

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Checking status...
docker ps --filter "name=coffee-chaincode"

echo.
echo Checking logs...
docker logs coffee-chaincode 2>&1 | findstr /C:"Starting" /C:"Error" /C:"panic"

echo.
echo Done! Chaincode container restarted.
pause
