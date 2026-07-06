@echo off
echo ==========================================
echo Restarting Blockchain Peer Nodes
echo ==========================================

echo.
echo Step 1: Checking peer container status...
docker ps | findstr peer

echo.
echo Step 2: Restarting all peer containers...
docker restart peer0.ecta.cecbs.et
docker restart peer0.banks.cecbs.et
docker restart peer0.nbe.cecbs.et
docker restart peer0.customs.cecbs.et
docker restart peer0.ecx.cecbs.et
docker restart peer0.shipping.cecbs.et

echo.
echo Step 3: Waiting for peers to initialize (15 seconds)...
timeout /t 15 /nobreak

echo.
echo Step 4: Verifying peer status...
docker ps | findstr peer

echo.
echo Step 5: Checking peer logs for errors...
echo Peer0.ECTA logs:
docker logs --tail 10 peer0.ecta.cecbs.et 2>&1 | findstr /i "error ERROR"

echo.
echo ✓ Peers have been restarted
echo ✓ Now restart your API: ./restart-api.bat
echo.
pause
