#!/bin/bash

OUTPUT_FILE="/tmp/complete-e2e-test-$(date +%s).txt"

echo "Running complete end-to-end workflow test..."
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

cd /home/guda/GoCBC/tests

# Run the test and capture all output
bash complete-end-to-end-workflow-test.sh > "$OUTPUT_FILE" 2>&1

# Show the result
EXIT_CODE=$?
echo ""
echo "Test completed with exit code: $EXIT_CODE"
echo "Output file: $OUTPUT_FILE"
echo ""
echo "=== Test Summary ==="
grep -A 20 "TEST SUMMARY" "$OUTPUT_FILE" || echo "No summary found"
echo ""
echo "=== Pass/Fail Breakdown ==="
grep -E "✓ PASS:|✗ FAIL:" "$OUTPUT_FILE" | head -10
echo "..."
grep -E "✓ PASS:|✗ FAIL:" "$OUTPUT_FILE" | tail -10

