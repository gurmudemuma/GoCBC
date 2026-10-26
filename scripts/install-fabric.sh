#!/bin/bash

set -e

echo "Installing Hyperledger Fabric binaries..."

# Set versions
FABRIC_VERSION=2.5.4
CA_VERSION=1.5.7

# Create bin directory if it doesn't exist
mkdir -p bin

# Download and extract Fabric binaries
echo "Downloading Fabric binaries v${FABRIC_VERSION}..."
curl -sSL https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz | tar xz -C .

# Download and extract Fabric CA binaries
echo "Downloading Fabric CA binaries v${CA_VERSION}..."
curl -sSL https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/hyperledger-fabric-ca-linux-amd64-${CA_VERSION}.tar.gz | tar xz -C .

echo ""
echo "Fabric binaries installed successfully!"
echo ""
echo "Binaries location: $(pwd)/bin"
echo ""
echo "Add to PATH by running:"
echo "  export PATH=\$PATH:$(pwd)/bin"
echo ""
echo "Or add this line to your ~/.bashrc:"
echo "  echo 'export PATH=\$PATH:$(pwd)/bin' >> ~/.bashrc"
echo "  source ~/.bashrc"
echo ""
