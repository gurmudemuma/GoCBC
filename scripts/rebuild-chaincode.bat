@echo off
echo Rebuilding coffee chaincode image...
docker build -t cecbs/coffee-chaincode:latest C:\goCBC\chaincodes\coffee > C:\goCBC\scripts\rebuild-out.txt 2>&1
echo Build exit code: %ERRORLEVEL%
echo Restarting coffee-chaincode container...
docker rm -f coffee-chaincode >> C:\goCBC\scripts\rebuild-out.txt 2>&1
docker-compose -f C:\goCBC\docker-compose-fabric.yml up -d coffee-chaincode >> C:\goCBC\scripts\rebuild-out.txt 2>&1
timeout /t 5 /nobreak >nul
echo === Container status ===
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> C:\goCBC\scripts\rebuild-out.txt 2>&1
echo === Logs ===
docker logs coffee-chaincode --tail 10 >> C:\goCBC\scripts\rebuild-out.txt 2>&1
