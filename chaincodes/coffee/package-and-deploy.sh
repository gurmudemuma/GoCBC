#!/bin/bash
# Package the coffee chaincode for deployment (Chaincode-as-a-Service).
#
# The live chaincode is CCAAS, NOT golang: it runs as the
# coffee-chaincode:2.2 Docker image at coffee-chaincode:9999 (see
# chaincodes/coffee/connection.json), and the committed definition on
# channel coffeechannel is version 2.2, sequence 21
# (blockchain/channel-artifacts/coffee_2.2-deployment.json).
#
# This script ONLY builds the CCAAS package coffee_2.2.tgz and prints the
# install / approve / commit commands. It does not deploy anything itself.
# For the next upgrade (v2.3, sequence 22) use ./deploy-chaincode.sh at the
# repo root, which derives the next version/sequence from the live channel.
#
# Previous versions of this script were WRONG and must not be restored:
# they hardcoded version 1.57 / sequence 57, built a Windows binary
# (coffee.exe), and packaged the code as type "golang".

set -e

cd "$(dirname "$0")"

VERSION="2.2"
SEQUENCE="21"
PACKAGE_NAME="coffee_${VERSION}.tgz"

echo "================================================"
echo "Packaging Chaincode (CCAAS) v${VERSION}, sequence ${SEQUENCE}"
echo "================================================"

# Sanity check: the package label must match the committed definition.
LABEL=$(python3 -c "import json; print(json.load(open('metadata.json'))['label'])" 2>/dev/null || grep -o '"label": *"[^"]*"' metadata.json | cut -d'"' -f4)
if [ "$LABEL" != "coffee_${VERSION}" ]; then
  echo "ERROR: metadata.json label is '$LABEL', expected 'coffee_${VERSION}'." >&2
  echo "Fix chaincodes/coffee/metadata.json before packaging." >&2
  exit 1
fi

echo ""
echo "Building chaincode server image coffee-chaincode:${VERSION}..."
docker build -t "coffee-chaincode:${VERSION}" .

echo ""
echo "Creating CCAAS package: ${PACKAGE_NAME}"
rm -rf pkg-temp
mkdir -p pkg-temp
cp metadata.json pkg-temp/
cp connection.json pkg-temp/

# Package with the Fabric peer CLI. CCAAS packages contain only
# metadata.json + connection.json and use --lang external.
if command -v peer >/dev/null 2>&1; then
  peer lifecycle chaincode package "${PACKAGE_NAME}" \
    --path pkg-temp \
    --lang external \
    --label "coffee_${VERSION}"
else
  docker run --rm \
    -v "$PWD/pkg-temp":/pkg \
    -v "$PWD":/out \
    -w /out \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode package "${PACKAGE_NAME}" \
    --path /pkg \
    --lang external \
    --label "coffee_${VERSION}"
fi
rm -rf pkg-temp

echo ""
echo "Package created: ${PACKAGE_NAME}"
echo ""
echo "================================================"
echo "Ready to Deploy (v${VERSION}, sequence ${SEQUENCE})"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Install chaincode on all peers:"
echo "   peer lifecycle chaincode install ${PACKAGE_NAME}"
echo ""
echo "2. Get package ID:"
echo "   peer lifecycle chaincode queryinstalled"
echo ""
echo "3. Approve for your org (replace PACKAGE_ID):"
echo "   peer lifecycle chaincode approveformyorg -o orderer.cecbs.et:7050 \\"
echo "     --channelID coffeechannel --name coffee --version ${VERSION} \\"
echo "     --package-id PACKAGE_ID --sequence ${SEQUENCE} --tls \\"
echo "     --cafile \$ORDERER_CA"
echo ""
echo "4. Commit (after all orgs approve):"
echo "   peer lifecycle chaincode commit -o orderer.cecbs.et:7050 \\"
echo "     --channelID coffeechannel --name coffee --version ${VERSION} \\"
echo "     --sequence ${SEQUENCE} --tls --cafile \$ORDERER_CA \\"
echo "     --peerAddresses peer0.ecx.cecbs.et:8051 \\"
echo "     --tlsRootCertFiles \$PEER0_ECX_CA"
echo ""
echo "================================================"
