@echo off
echo === coffee-chaincode container status ===
docker ps -a --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo === Full network info ===
docker inspect coffee-chaincode --format "{{json .NetworkSettings.Networks}}"
echo.
echo === Container logs (last 20) ===
docker logs coffee-chaincode --tail 20 2>&1
