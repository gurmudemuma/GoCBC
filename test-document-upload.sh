#!/bin/bash

echo "=========================================="
echo "Document Upload Test"
echo "=========================================="
echo ""

# Create a test file
TEST_FILE="/tmp/test-upload-$(date +%s).txt"
echo "This is a test document for blockchain registration" > "$TEST_FILE"
echo "Created test file: $TEST_FILE"
echo "File size: $(wc -c < "$TEST_FILE") bytes"
echo ""

# Calculate SHA-256 hash
HASH=$(sha256sum "$TEST_FILE" | awk '{print $1}')
echo "File hash: $HASH"
echo "Hash length: ${#HASH} characters"
echo ""

# Test upload
echo "Uploading to: http://localhost:3001/api/v1/documents/upload-registration"
echo ""

curl -v -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@$TEST_FILE" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-TEST-$(date +%s)" \
  -F "fileName=test-document.txt" \
  2>&1 | tee /tmp/upload-test-output.log

echo ""
echo "=========================================="
echo "Full output saved to: /tmp/upload-test-output.log"
echo ""

# Clean up
rm -f "$TEST_FILE"
echo "Test file cleaned up"
echo "=========================================="
