#!/bin/bash

echo "=== Looking for orderer TLS certs in peer container ===" > /tmp/orderer-cert-location.txt
docker exec peer0.ecx.cecbs.et find /etc/hyperledger -name "*orderer*" -o -name "*ca.crt*" 2>&1 | head -30 >> /tmp/orderer-cert-location.txt

cat /tmp/orderer-cert-location.txt
