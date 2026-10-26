#!/bin/bash

set -e

echo "========================================="
echo "Starting CECBS (Docker-based setup)"
echo "========================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Clean up previous runs
echo "Cleaning up previous deployment..."
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
rm -rf blockchain/organizations blockchain/channel-artifacts *.tar.gz 2>/dev/null || true

# Generate crypto material using Docker
echo "Step 1: Generating crypto material (using Docker)..."
bash scripts/generate-crypto-docker.sh

# Generate channel artifacts using Docker
echo "Step 2: Generating channel artifacts (using Docker)..."
bash scripts/generate-artifacts-docker.sh

# Start Docker containers
echo "Step 3: Starting Docker containers..."
docker-compose -f docker-compose-fabric.yml up -d

# Wait for containers to be ready
echo "Waiting for containers to start..."
sleep 15

echo "========================================="
echo "CECBS Blockchain Network Started!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Create channel: bash scripts/create-channel-docker.sh"
echo "  2. Deploy chaincode: bash scripts/deploy-chaincode-docker.sh"
echo ""
echo "Or run the complete setup:"
echo "  bash scripts/setup-complete-docker.sh"
echo ""
