#!/bin/bash

echo ""
echo "████████████████████████████████████████████████████████████████"
echo "█                                                              █"
echo "█           GoCBC Automated Workflow Tests                     █"
echo "█                  Quick Start Script                          █"
echo "█                                                              █"
echo "████████████████████████████████████████████████████████████████"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from /home/guda/GoCBC/tests directory"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "🎯 Available Commands:"
echo ""
echo "  npm test                 - Run all 7 portal tests"
echo "  npm run test:exporter    - Test Exporter Portal (8 tabs)"
echo "  npm run test:ecta        - Test ECTA Portal (10 tabs + 5 stages)"
echo "  npm run test:banks       - Test Banks Portal (hierarchical + 4 methods)"
echo "  npm run test:nbe         - Test NBE Portal (8 tabs + 9 subtabs)"
echo "  npm run test:customs     - Test Customs, Shipping, ECX"
echo ""
echo "🚀 Starting full test suite in 3 seconds..."
sleep 3

echo ""
echo "▶▶▶ Running All Tests..."
echo ""

npm test

echo ""
echo "✅ Test execution complete!"
echo ""
