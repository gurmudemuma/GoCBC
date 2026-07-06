@echo off
REM Windows batch version of chaincode fix script

echo === Fixing Chaincode Connection Issue ===
echo.

echo 1. Querying committed chaincode package ID...
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel -n coffee --output json > committed.tmp 2>nul

REM Parse package ID (simplified - may need adjustment)
for /f "tokens=2 delims=:" %%a in ('findstr /C:"package_id" committed.tmp') do set PKG_ID_RAW=%%a
set COMMITTED_PKG_ID=%PKG_ID_RAW:"=%
set COMMITTED_PKG_ID=%COMMITTED_PKG_ID:,=%
set COMMITTED_PKG_ID=%COMMITTED_PKG_ID: =%

if "%COMMITTED_PKG_ID%"=="" (
  echo [ERROR] Could not find committed chaincode
  echo The chaincode may need to be deployed first.
  echo Run: bash deploy-chaincode.sh
  del committed.tmp 2>nul
  exit /b 1
)

echo [OK] Found committed package ID: %COMMITTED_PKG_ID%
echo.

echo 2. Updating docker-compose-fabric.yml...
REM Backup
copy docker-compose-fabric.yml docker-compose-fabric.yml.bak >nul

REM This is simplified - you may need to manually update the file
echo WARNING: Automatic update may not work on Windows
echo Please manually update CORE_CHAINCODE_ID_NAME in docker-compose-fabric.yml
echo To: %COMMITTED_PKG_ID%
echo.
pause

echo 3. Restarting chaincode container...
docker stop coffee-chaincode 2>nul
docker rm coffee-chaincode 2>nul

docker compose -f docker-compose-fabric.yml up -d coffee-chaincode

timeout /t 5 /nobreak >nul

docker ps | findstr coffee-chaincode
if %ERRORLEVEL%==0 (
  echo [OK] Chaincode container restarted successfully
  echo.
  echo Container logs:
  docker logs coffee-chaincode --tail 10
  echo.
  echo === Fix Complete ===
  echo The chaincode should now respond to queries.
) else (
  echo [ERROR] Chaincode container failed to start
  echo Check logs: docker logs coffee-chaincode
  exit /b 1
)

del committed.tmp 2>nul
