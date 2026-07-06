@echo off
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
docker logs coffee-chaincode --tail 5 2>&1
