#!/bin/bash

docker ps --format "{{.Names}}: {{.Status}}" | grep -E "(peer|orderer|chaincode)" > /tmp/container-ages.txt
cat /tmp/container-ages.txt
