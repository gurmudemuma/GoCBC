#!/bin/bash
# Package and deploy updated chaincode with contract fixes

set -e

echo "================================================"
echo "📦 Packaging Chaincode with Contract Fixes"
echo "================================================"

cd "$(dirname "$0")"

# Version increment
NEW_VERSION="1.57"
PACKAGE_NAME="coffee_${NEW_VERSION}.tgz"

echo ""
echo "✅ Building Go chaincode..."
go build -o coffee.exe

echo ""
echo "✅ Creating chaincode package: $PACKAGE_NAME"

# Create package directory structure
rm -rf pkg-temp
mkdir -p pkg-temp/src

# Copy source files
cp *.go pkg-temp/src/
cp go.mod pkg-temp/src/
cp go.sum pkg-temp/src/

# Create metadata
cat > pkg-temp/metadata.json << EOF
{
  "type": "golang",
  "label": "coffee_${NEW_VERSION}"
}
EOF

# Package as tar.gz
cd pkg-temp
tar czf "../${PACKAGE_NAME}" metadata.json src/
cd ..
rm -rf pkg-temp

echo ""
echo "✅ Package created: ${PACKAGE_NAME}"
echo ""
echo "================================================"
echo "🚀 Ready to Deploy"
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
echo "     --channelID coffeechannel --name coffee --version ${NEW_VERSION} \\"
echo "     --package-id PACKAGE_ID --sequence 57 --tls \\"
echo "     --cafile \$ORDERER_CA"
echo ""
echo "4. Commit (after all orgs approve):"
echo "   peer lifecycle chaincode commit -o orderer.cecbs.et:7050 \\"
echo "     --channelID coffeechannel --name coffee --version ${NEW_VERSION} \\"
echo "     --sequence 57 --tls --cafile \$ORDERER_CA \\"
echo "     --peerAddresses peer0.ecx.cecbs.et:7051 \\"
echo "     --tlsRootCertFiles \$PEER0_ECX_CA"
echo ""
echo "================================================"
