#!/bin/bash

set -e

echo "=== Fixing MSP Configuration with NodeOUs ==="

cd /home/guda/GoCBC/blockchain

# Function to create config.yaml for MSP
create_msp_config() {
    local msp_path=$1
    local org=$2
    local ca_cert_name=$3
    
    cat > "$msp_path/config.yaml" << EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/${ca_cert_name}
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/${ca_cert_name}
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/${ca_cert_name}
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/${ca_cert_name}
    OrganizationalUnitIdentifier: orderer
EOF
    echo "✓ Created config.yaml for $org MSP"
}

echo ""
echo "Creating MSP config.yaml files for all organizations..."
echo ""

# Create config.yaml for each peer organization
for org in ecta ecx banks nbe customs shipping; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    
    # Get the actual CA cert filename
    ca_cert=$(ls organizations/peerOrganizations/${org}.cecbs.et/msp/cacerts/ 2>/dev/null | head -1)
    
    if [ ! -z "$ca_cert" ]; then
        # Main MSP
        msp_path="organizations/peerOrganizations/${org}.cecbs.et/msp"
        if [ -d "$msp_path" ]; then
            create_msp_config "$msp_path" "$org_upper" "$ca_cert"
        fi
        
        # Admin user MSP
        admin_msp="organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp"
        if [ -d "$admin_msp" ]; then
            create_msp_config "$admin_msp" "$org_upper Admin" "$ca_cert"
        fi
        
        # Peer MSP
        peer_msp="organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/msp"
        if [ -d "$peer_msp" ]; then
            create_msp_config "$peer_msp" "$org_upper Peer" "$ca_cert"
        fi
    else
        echo "⚠ Warning: CA cert not found for $org"
    fi
done

# Create config.yaml for orderer organization
orderer_ca_cert=$(ls organizations/ordererOrganizations/cecbs.et/msp/cacerts/ 2>/dev/null | head -1)

if [ ! -z "$orderer_ca_cert" ]; then
    orderer_msp="organizations/ordererOrganizations/cecbs.et/msp"
    if [ -d "$orderer_msp" ]; then
        create_msp_config "$orderer_msp" "Orderer" "$orderer_ca_cert"
    fi
    
    # Orderer admin MSP
    admin_msp="organizations/ordererOrganizations/cecbs.et/users/Admin@cecbs.et/msp"
    if [ -d "$admin_msp" ]; then
        create_msp_config "$admin_msp" "Orderer Admin" "$orderer_ca_cert"
    fi
    
    # Orderer node MSP
    orderer_node_msp="organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp"
    if [ -d "$orderer_node_msp" ]; then
        create_msp_config "$orderer_node_msp" "Orderer Node" "$orderer_ca_cert"
    fi
fi

echo ""
echo "=== MSP Configuration Updated ==="
echo ""
echo "Restarting containers to apply changes..."

# Restart containers to pick up new MSP config
docker-compose -f ../docker-compose-fabric.yml restart

echo "Waiting for containers to be ready..."
sleep 15

echo ""
echo "=== Testing MSP Configuration ==="

# Test with peer command
echo "Testing peer queryinstalled with new MSP config..."
docker exec \
    -e CORE_PEER_LOCALMSPID="NBEMSP" \
    -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/fabric/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/fabric/organizations/peerOrganizations/nbe.cecbs.et/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et peer lifecycle chaincode queryinstalled

echo ""
echo "✅ MSP Configuration Fixed!"
