#!/bin/bash

docker exec peer0.ecx.cecbs.et ls -la /etc/hyperledger/fabric/orderer-tls/ > /tmp/orderer-tls-contents.txt 2>&1
cat /tmp/orderer-tls-contents.txt
