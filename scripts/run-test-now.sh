#!/bin/bash
cd /home/guda/GoCBC
bash ./complete-e2e-test.sh 2>&1 | tee test-run-output.log
