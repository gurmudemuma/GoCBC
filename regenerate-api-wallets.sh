#!/bin/bash

set -e

echo "=========================================="
echo "  Regenerating API Wallet Identities"
echo "=========================================="

WALLET_DIR="api/wallet"

# Backup old wallet
if [ -d "$WALLET_DIR" ]; then
  echo "Backing up old wallet..."
  mv "$WALLET_DIR" "${WALLET_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Create new wallet directory
mkdir -p "$WALLET_DIR"

# Organizations
orgs=("ECTA" "ECX" "Banks" "NBE" "Customs" "Shipping")

for org in "${orgs[@]}"; do
  org_lower=$(echo "$org" | tr '[:upper:]' '[:lower:]')
  msp_id="${org}MSP"
  
  echo "Creating identity for $msp_id..."
  
  # Paths to crypto material
  cert_path="blockchain/organizations/peerOrganizations/${org_lower}.cecbs.et/users/Admin@${org_lower}.cecbs.et/msp/signcerts/Admin@${org_lower}.cecbs.et-cert.pem"
  key_path="blockchain/organizations/peerOrganizations/${org_lower}.cecbs.et/users/Admin@${org_lower}.cecbs.et/msp/keystore/priv_sk"
  
  # Check if cert exists
  if [ ! -f "$cert_path" ]; then
    echo "  ❌ Certificate not found: $cert_path"
    continue
  fi
  
  # Find private key (may have generated name)
  if [ ! -f "$key_path" ]; then
    # Try to find any key in keystore
    key_path=$(ls blockchain/organizations/peerOrganizations/${org_lower}.cecbs.et/users/Admin@${org_lower}.cecbs.et/msp/keystore/*_sk 2>/dev/null | head -1)
  fi
  
  if [ ! -f "$key_path" ]; then
    echo "  ❌ Private key not found for $org"
    continue
  fi
  
  # Read cert and key
  cert=$(cat "$cert_path" | sed ':a;N;$!ba;s/\n/\\n/g')
  key=$(cat "$key_path" | sed ':a;N;$!ba;s/\n/\\n/g')
  
  # Create wallet identity file
  cat > "$WALLET_DIR/admin-${msp_id}.id" << EOF
{
  "credentials": {
    "certificate": "$cert",
    "privateKey": "$key"
  },
  "mspId": "$msp_id",
  "type": "X.509",
  "version": 1
}
EOF
  
  echo "  ✓ Created admin-${msp_id}.id"
done

echo ""
echo "=========================================="
echo "  Wallet regeneration complete!"
echo "=========================================="
echo ""
echo "Generated identities:"
ls -1 "$WALLET_DIR"
echo ""
echo "Now restart the API server to pick up new identities"
