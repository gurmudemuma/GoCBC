#!/usr/bin/env bash
# Package chaincode v1.57 in CCAAS format (external chaincode)

CC_VERSION="1.57"
CC_LABEL="coffee_${CC_VERSION}"
OUTPUT_DIR="chaincodes/coffee"

echo "=========================================="
echo "Packaging Chaincode v1.57"
echo "=========================================="
echo ""

# Create temporary directory
TMP_DIR=$(mktemp -d)
echo "Working in: $TMP_DIR"

# Create metadata.json
cat > "$TMP_DIR/metadata.json" <<EOF
{
    "type": "ccaas",
    "label": "${CC_LABEL}"
}
EOF

# Create connection.json (points to the running Docker container)
cat > "$TMP_DIR/connection.json" <<EOF
{
    "address": "coffee-chaincode:9999",
    "dial_timeout": "10s",
    "tls_required": false
}
EOF

echo "✓ Created metadata and connection files"

# Create code.tar.gz
cd "$TMP_DIR"
tar czf code.tar.gz connection.json
echo "✓ Created code.tar.gz"

# Create final package
tar czf "${CC_LABEL}.tgz" metadata.json code.tar.gz
echo "✓ Created ${CC_LABEL}.tgz"

# Move to output directory
cp "${CC_LABEL}.tgz" "$OUTPUT_DIR/${CC_LABEL}.tgz"
cd - > /dev/null

echo ""
echo "=========================================="
echo "✅ Package created: $OUTPUT_DIR/${CC_LABEL}.tgz"
echo "=========================================="
echo ""
echo "Package contents:"
tar -tzf "$OUTPUT_DIR/${CC_LABEL}.tgz"

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo "Ready to deploy with upgrade-to-157.sh"
