#!/bin/bash

set -e

CRYPTO_CONFIG_DIR="blockchain/organizations"

echo "Generating crypto material for CECBS..."

# Create directory structure
mkdir -p ${CRYPTO_CONFIG_DIR}/{ordererOrganizations,peerOrganizations}

# Generate Orderer Org
echo "Generating Orderer Organization..."
cryptogen generate --config=blockchain/crypto-config.yaml --output=${CRYPTO_CONFIG_DIR}

echo "Crypto material generated successfully!"
echo "Location: ${CRYPTO_CONFIG_DIR}"
