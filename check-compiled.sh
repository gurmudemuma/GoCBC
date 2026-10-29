#!/bin/bash
echo "Checking if banking.js has lcID in response..." > /tmp/check-compiled.txt
grep -A 10 "res.status(201).json" /home/guda/GoCBC/api/dist/routes/banking.js | head -15 >> /tmp/check-compiled.txt
cat /tmp/check-compiled.txt
