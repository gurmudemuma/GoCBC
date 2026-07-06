@echo off
echo Removing old coffee-chaincode container...
docker rm -f coffee-chaincode 2>nul

echo Starting coffee-chaincode with correct CHAINCODE_ID...
docker-compose -f C:\goCBC\docker-compose-fabric.yml up -d coffee-chaincode

echo Waiting 5s for chaincode to start...
timeout /t 5 /nobreak >nul

echo === coffee-chaincode status ===
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo === coffee-chaincode logs ===
docker logs coffee-chaincode --tail 20 2>&1
