#!/bin/bash
cd /home/guda/GoCBC
bash end-to-end-test.sh 2>&1 | tee /tmp/e2e-output.log
echo "=== TEST COMPLETE ==="
echo "Output saved to /tmp/e2e-output.log"
