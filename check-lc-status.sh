#!/bin/bash

LC_ID="LC-1793288783"

echo "Checking status of LC: $LC_ID"
echo "================================"

# Query from bank peer
docker exec peer0.banks.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c "{\"Args\":[\"GetLC\",\"$LC_ID\"]}" 2>&1 | jq '.' 2>/dev/null || echo "Query failed or LC not found"
