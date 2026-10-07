#!/bin/bash

cd /home/guda/GoCBC/chaincodes/coffee

echo "=========================================="
echo "Testing Go Chaincode Build"
echo "=========================================="
echo ""

echo "Building chaincode..."
go build -tags notls 2>&1

BUILD_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Build exit code: $BUILD_EXIT_CODE"
echo "=========================================="

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "Binary created:"
    ls -lh coffee 2>/dev/null || echo "No binary found (but build succeeded)"
else
    echo "❌ BUILD FAILED!"
fi

exit $BUILD_EXIT_CODE
