#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"

echo "Rejoining orderer to channel: ${CHANNEL_NAME}"

# Get absolute path for Windows
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Use curl container to call the orderer admin API
docker run --rm \
    --network cecbs-network \
    -v "${PROJECT_DIR}/blockchain/channel-artifacts:/channel-artifacts" \
    -v "${PROJECT_DIR}/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls:/tls" \
    curlimages/curl:latest \
    -k -X POST \
    --data-binary @/channel-artifacts/${CHANNEL_NAME}.block \
    https://orderer.cecbs.et:7053/participation/v1/channels \
    --cert /tls/server.crt \
    --key /tls/server.key \
    --cacert /tls/ca.crt

echo "Orderer rejoined channel successfully!"
