#!/bin/bash

# ============================================================
# GoCBC Blockchain Integration Setup Script
# ============================================================
# This script prepares the API backend for blockchain integration
# ============================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════════"
echo "  GoCBC BLOCKCHAIN INTEGRATION SETUP"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Check if blockchain is running
echo "Step 1: Checking blockchain network status..."
if docker ps | grep -q "peer0.ecta.cecbs.et"; then
    echo "✅ Blockchain network is running"
else
    echo "❌ Blockchain network is not running"
    echo "   Please start the blockchain first:"
    echo "   cd /home/guda/GoCBC && ./COMPLETE-BLOCKCHAIN-FIX.sh"
    exit 1
fi
echo ""

# Step 2: Check Node.js and npm
echo "Step 2: Checking Node.js environment..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm is not installed"
    exit 1
fi
echo ""

# Step 3: Install dependencies
echo "Step 3: Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (this may take a few minutes)..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 4: Set up environment configuration
echo "Step 4: Setting up environment configuration..."
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please review and update .env with your settings"
else
    echo "✅ .env file already exists"
fi

# Append blockchain configuration if not already present
if ! grep -q "FABRIC_ENABLED" .env; then
    echo ""
    echo "Adding blockchain configuration to .env..."
    cat .env.blockchain >> .env
    echo "✅ Blockchain configuration added to .env"
else
    echo "✅ Blockchain configuration already in .env"
fi
echo ""

# Step 5: Create wallet directory
echo "Step 5: Setting up wallet directory..."
if [ ! -d "wallet" ]; then
    mkdir -p wallet
    echo "✅ Created wallet directory"
else
    echo "✅ Wallet directory exists"
fi
echo ""

# Step 6: Verify crypto material
echo "Step 6: Verifying blockchain crypto material..."
CRYPTO_PATH="../blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp"
if [ -d "$CRYPTO_PATH" ]; then
    echo "✅ ECTA admin crypto material found"
    
    # Check for certificate
    if ls "$CRYPTO_PATH/signcerts/"*.pem 1> /dev/null 2>&1; then
        echo "✅ Admin certificate found"
    else
        echo "❌ Admin certificate not found"
        exit 1
    fi
    
    # Check for private key
    if ls "$CRYPTO_PATH/keystore/"* 1> /dev/null 2>&1; then
        echo "✅ Admin private key found"
    else
        echo "❌ Admin private key not found"
        exit 1
    fi
else
    echo "❌ Crypto material not found at: $CRYPTO_PATH"
    echo "   Please ensure the blockchain network has been set up correctly"
    exit 1
fi
echo ""

# Step 7: Build TypeScript
echo "Step 7: Building TypeScript..."
if [ -f "tsconfig.json" ]; then
    npm run build
    echo "✅ TypeScript compiled successfully"
else
    echo "⚠️  tsconfig.json not found, skipping TypeScript build"
fi
echo ""

# Step 8: Test blockchain connection
echo "Step 8: Testing blockchain connection..."
echo "This will verify that the API can connect to the blockchain network."
echo ""

if [ -f "test-blockchain-connection.js" ] && [ -d "dist" ]; then
    echo "Running connection test..."
    node test-blockchain-connection.js
    TEST_RESULT=$?
    
    if [ $TEST_RESULT -eq 0 ]; then
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo "  ✅ BLOCKCHAIN INTEGRATION SETUP COMPLETE!"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        echo "Your API backend is ready to integrate with the blockchain."
        echo ""
        echo "Next steps:"
        echo "1. Review the integration guide:"
        echo "   cat ../BLOCKCHAIN-BACKEND-INTEGRATION-GUIDE.md"
        echo ""
        echo "2. Start your API server:"
        echo "   npm start"
        echo ""
        echo "3. Test blockchain operations from your web portals"
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo ""
    else
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo "  ⚠️  BLOCKCHAIN CONNECTION TEST FAILED"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        echo "Some tests failed. Please review the errors above."
        echo ""
        echo "Common issues:"
        echo "1. Blockchain network not running - run COMPLETE-BLOCKCHAIN-FIX.sh"
        echo "2. Network connectivity - ensure API can reach peers and orderer"
        echo "3. Environment variables - check .env configuration"
        echo ""
        echo "For help, see: ../BLOCKCHAIN-BACKEND-INTEGRATION-GUIDE.md"
        echo ""
        exit 1
    fi
else
    echo "⚠️  Test script not found or TypeScript not compiled"
    echo "   Skipping connection test"
    echo ""
    echo "To run the test manually:"
    echo "   node test-blockchain-connection.js"
    echo ""
fi

exit 0
