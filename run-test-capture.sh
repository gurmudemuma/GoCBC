#!/bin/bash
cd /home/guda/GoCBC
bash end-to-end-test.sh > /home/guda/GoCBC/test-output-latest.txt 2>&1
echo "Exit code: $?" >> /home/guda/GoCBC/test-output-latest.txt
