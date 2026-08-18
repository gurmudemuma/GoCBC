#!/bin/bash
# Build CCAAS package for v1.57

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Create metadata
cat > metadata.json << 'EOF'
{"type":"ccaas","label":"coffee_1.57"}
EOF

# Create connection
cat > connection.json << 'EOF'
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF

# Package
tar czf code.tar.gz connection.json
tar czf coffee_1.57.tgz metadata.json code.tar.gz

# Copy to destination
cp coffee_1.57.tgz /c/goCBC/chaincodes/coffee/coffee_1.57.tgz

echo "Created: /c/goCBC/chaincodes/coffee/coffee_1.57.tgz"
ls -lh /c/goCBC/chaincodes/coffee/coffee_1.57.tgz
