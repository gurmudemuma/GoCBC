#!/bin/bash

OUTPUT_FILE="/tmp/complete-test-output-$(date +%s).txt"

echo "Running complete lifecycle test..."
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

cd /home/guda/GoCBC

# Run the test and capture all output
./scripts/complete-lifecycle-test.sh > "$OUTPUT_FILE" 2>&1

# Show the result
echo ""
echo "Test completed!"
echo "Output file: $OUTPUT_FILE"
echo ""
echo "=== Last 50 lines of output ==="
tail -50 "$OUTPUT_FILE"
