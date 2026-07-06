@echo off
echo.
echo ===========================================================
echo  REBUILDING COFFEE CHAINCODE CONTAINER
echo ===========================================================
echo.

cd C:\goCBC\chaincodes\coffee

echo [1/4] Stopping old chaincode container...
docker stop coffee-chaincode
docker rm coffee-chaincode
echo   Done
echo.

echo [2/4] Building new chaincode Docker image...
docker build -t coffee-chaincode:latest .
if errorlevel 1 (
    echo ERROR: Failed to build chaincode image
    exit /b 1
)
echo   Done
echo.

echo [3/4] Starting new chaincode container...
docker run -d --name coffee-chaincode --network cecbs-network -p 9999:9999 -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 -e CHAINCODE_ID=coffee:1.13 coffee-chaincode:latest
if errorlevel 1 (
    echo ERROR: Failed to start chaincode container
    exit /b 1
)
echo   Done
echo.

echo [4/4] Checking chaincode container status...
timeout /t 3 /nobreak >nul
docker ps --filter "name=coffee-chaincode"
echo.

echo ===========================================================
echo  CHAINCODE CONTAINER REBUILD COMPLETED!
echo  New container with customs functions is now running
echo ===========================================================
echo.
pause
