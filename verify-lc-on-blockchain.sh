#!/bin/bash

LC_ID="${1:-LC-1793296666}"

echo "Verifying LC on blockchain: $LC_ID"
echo "========================================"

# Try to query from different peers
for ORG in ecta ecx banks nbe customs shipping; do
  echo ""
  echo "Querying from peer0.$ORG.cecbs.et..."
  docker exec peer0.$ORG.cecbs.et peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c "{\"Args\":[\"GetLC\",\"$LC_ID\"]}" 2>&1 | head -20
  
  if [ $? -eq 0 ]; then
    echo "✓ Successfully queried from $ORG"
    break
  else
    echo "✗ Failed to query from $ORG"
  fi
done

echo ""
echo "Checking CouchDB directly..."
curl -s http://admin:adminpw@localhost:5984/coffeechannel_coffee/LC_$LC_ID 2>/dev/null | jq '.' 2>/dev/null || echo "Not found in CouchDB"
