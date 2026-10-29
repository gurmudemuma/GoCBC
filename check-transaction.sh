#!/bin/bash

# Check transaction status on the blockchain
TX_ID="${1:-aba958c49e6e2cbd045825996fa03de4f6126ac03276f7d93dd012502225a005}"
LC_ID="${2:-LC-1793290621}"

echo "Checking transaction: $TX_ID"
echo "For LC: $LC_ID"
echo "========================================"

# Query the LC status
echo ""
echo "1. Querying LC status from blockchain..."
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c "{\"Args\":[\"GetLC\",\"$LC_ID\"]}" 2>&1 | jq '.' 2>/dev/null || echo "Query failed or LC not found"

echo ""
echo "2. Checking transaction from qscc (Query System Chaincode)..."
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n qscc \
  -c "{\"Args\":[\"GetTransactionByID\",\"coffeechannel\",\"$TX_ID\"]}" 2>&1 | head -20

echo ""
echo "3. Checking if transaction is valid..."
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n qscc \
  -c "{\"Args\":[\"GetBlockByTxID\",\"coffeechannel\",\"$TX_ID\"]}" 2>&1 | grep -A 5 -B 5 "validation_code\|VALID\|INVALID" | head -20
