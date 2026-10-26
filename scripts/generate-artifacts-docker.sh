#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
ARTIFACTS_DIR="blockchain/channel-artifacts"

echo "Generating channel artifacts using Docker..."

mkdir -p ${ARTIFACTS_DIR}

# Use MSYS_NO_PATHCONV to prevent Git Bash from converting paths
export MSYS_NO_PATHCONV=1

# Get current directory
WORK_DIR="$(pwd)"

# Generate genesis block
echo "Generating genesis block..."
docker run --rm \
    -v "${WORK_DIR}://work" \
    -w //work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeOrdererGenesis \
        -channelID system-channel \
        -outputBlock ${ARTIFACTS_DIR}/genesis.block \
        -configPath blockchain

# Generate channel configuration transaction
echo "Generating channel configuration transaction..."
docker run --rm \
    -v "${WORK_DIR}://work" \
    -w //work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputCreateChannelTx ${ARTIFACTS_DIR}/${CHANNEL_NAME}.tx \
        -channelID ${CHANNEL_NAME} \
        -configPath blockchain

# Generate anchor peer updates for each organization
echo "Generating anchor peer updates..."
for org in ECTA ECX Banks NBE Customs Shipping; do
    docker run --rm \
        -v "${WORK_DIR}://work" \
        -w //work \
        hyperledger/fabric-tools:2.5 \
        configtxgen -profile CoffeeChannel \
            -outputAnchorPeersUpdate ${ARTIFACTS_DIR}/${org}MSPanchors.tx \
            -channelID ${CHANNEL_NAME} \
            -asOrg ${org}MSP \
            -configPath blockchain
done

echo "Channel artifacts generated successfully!"
