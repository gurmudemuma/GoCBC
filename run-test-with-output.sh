#!/bin/bash
cd /home/guda/GoCBC
bash test-crypto-signatures.sh > /tmp/crypto-test-output.log 2>&1
EXIT_CODE=$?
cat /tmp/crypto-test-output.log
exit $EXIT_CODE
