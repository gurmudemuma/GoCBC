#!/bin/bash

set -e

echo "========================================="
echo "Starting CECBS Blockchain System"
echo "========================================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Add bin directory to PATH if it exists
if [ -d "$(pwd)/bin" ]; then
    export PATH=$PATH:$(pwd)/bin
fi

# Check for Fabric binaries
if ! command -v cryptogen >/dev/null 2>&1; then
    echo "Error: Hyperledger Fabric binaries not found!"
    echo ""
    echo "Please install them by running:"
    echo "  ./scripts/install-fabric.sh"
    echo ""
    echo "Then add to PATH:"
    echo "  export PATH=\$PATH:$(pwd)/bin"
    echo ""
    exit 1
fi

# Clean up previous runs
echo "Cleaning up previous deployment..."
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
rm -rf blockchain/organizations blockchain/channel-artifacts *.tar.gz 2>/dev/null || true

# Generate crypto material
echo "Step 1: Generating crypto material..."
if [ ! -f "blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem" ]; then
    ./scripts/generate-crypto.sh
else
    echo "Crypto material already exists, skipping..."
fi

# Generate channel artifacts
echo "Step 2: Generating channel artifacts..."
./scripts/generate-artifacts.sh

# Start Docker containers
echo "Step 3: Starting Docker containers..."
docker-compose -f docker-compose-fabric.yml up -d

# Wait for containers to be ready
echo "Waiting for containers to start..."
sleep 10

# Create and join channel
echo "Step 4: Creating and joining channel..."
./scripts/create-channel.sh

# Deploy chaincode
echo "Step 5: Deploying chaincode..."
./scripts/deploy-chaincode.sh

echo "========================================="
echo "CECBS Blockchain System Started!"
echo "========================================="
echo ""
echo "Access Points:"
echo "  - Frontend: http://localhost:5173"
echo "  - Gateway API: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Test Credentials:"
echo "  - admin / admin123"
echo "  - exporter1 / password123"
echo ""
echo "To view logs: docker-compose -f docker-compose-fabric.yml logs -f"
echo "To stop: docker-compose -f docker-compose-fabric.yml down"
echo ""

