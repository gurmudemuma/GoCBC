#!/bin/bash

set -e

CRYPTO_CONFIG_DIR="blockchain/organizations"

echo "Generating crypto material using Docker..."

# Create directory structure
mkdir -p ${CRYPTO_CONFIG_DIR}/{ordererOrganizations,peerOrganizations}

# Get absolute path (Windows compatible)
# Use MSYS_NO_PATHCONV to prevent Git Bash from converting paths
export MSYS_NO_PATHCONV=1

# Get current directory in Windows format for Docker
WORK_DIR="$(pwd)"

# Generate crypto material using Docker
docker run --rm \
    -v "${WORK_DIR}://work" \
    -w //work \
    hyperledger/fabric-tools:2.5 \
    cryptogen generate --config=blockchain/crypto-config.yaml --output=${CRYPTO_CONFIG_DIR}

echo "Crypto material generated successfully!"
echo "Location: ${CRYPTO_CONFIG_DIR}"
