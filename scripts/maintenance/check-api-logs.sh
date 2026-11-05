#!/bin/bash
tail -150 /tmp/api-clean.log | grep -E "(LC-INV|FOREX-INV|ApproveLCIssuance|RequestForex|timeout|endorsement|Failed)" > /tmp/api-filtered-logs.txt
cat /tmp/api-filtered-logs.txt
