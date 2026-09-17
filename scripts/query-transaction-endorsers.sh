#!/bin/bash
# Query real endorsers from blockchain transaction using peer CLI
# Usage: ./query-transaction-endorsers.sh <txId>

TXID=$1

if [ -z "$TXID" ]; then
  echo "Usage: $0 <transaction_id>"
  exit 1
fi

# Query transaction from peer using qscc (Query System Chaincode)
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECXMSP

peer chaincode query \
  -C coffeechannel \
  -n qscc \
  -c '{\"Args\":[\"GetTransactionByID\",\"coffeechannel\",\"$TXID\"]}'
" 2>/dev/null | base64
