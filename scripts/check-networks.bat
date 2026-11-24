@echo off
echo === peer0.nbe networks ===
docker inspect peer0.nbe.cecbs.et --format "{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}"
echo === peer0.ecx networks ===
docker inspect peer0.ecx.cecbs.et --format "{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}"
echo === peer0.ecta networks ===
docker inspect peer0.ecta.cecbs.et --format "{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}"
echo === coffee-chaincode networks ===
docker inspect coffee-chaincode --format "{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}"
echo === coffee-chaincode IP ===
docker inspect coffee-chaincode --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"
