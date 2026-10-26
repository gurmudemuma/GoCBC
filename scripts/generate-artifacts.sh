#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
ARTIFACTS_DIR="blockchain/channel-artifacts"

echo "Generating channel artifacts..."

mkdir -p ${ARTIFACTS_DIR}

# Generate genesis block
echo "Generating genesis block..."
configtxgen -profile CoffeeOrdererGenesis \
    -channelID system-channel \
    -outputBlock ${ARTIFACTS_DIR}/genesis.block \
    -configPath blockchain

# Generate channel configuration transaction
echo "Generating channel configuration transaction..."
configtxgen -profile CoffeeChannel \
    -outputCreateChannelTx ${ARTIFACTS_DIR}/${CHANNEL_NAME}.tx \
    -channelID ${CHANNEL_NAME} \
    -configPath blockchain

# Generate anchor peer updates for each organization
echo "Generating anchor peer updates..."
for org in ECTA ECX Banks NBE Customs Shipping; do
    configtxgen -profile CoffeeChannel \
        -outputAnchorPeersUpdate ${ARTIFACTS_DIR}/${org}MSPanchors.tx \
        -channelID ${CHANNEL_NAME} \
        -asOrg ${org}MSP \
        -configPath blockchain
done

echo "Channel artifacts generated successfully!"
