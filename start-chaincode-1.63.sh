#!/bin/bash
docker run -d --name coffee-chaincode --network cecbs-network -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.63:c82cdc9fa45dae3925b0cacfa704001851ffab6df565baedb3528db0321c4bed" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:1.63

sleep 3
docker logs coffee-chaincode
