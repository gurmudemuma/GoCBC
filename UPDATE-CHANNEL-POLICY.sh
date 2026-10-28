#!/bin/bash
# Update Channel Policy to Allow Peer Writes

set -e

echo "==================================================================="
echo "UPDATING CHANNEL POLICY TO ALLOW PEER WRITES"
echo "==================================================================="
echo ""

cd /home/guda/GoCBC

# Step 1: Fetch current channel configuration
echo "Step 1: Fetching current channel configuration..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer channel fetch config /tmp/config_block.pb \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

echo "✓ Config fetched"

# Step 2: Decode the config block
echo ""
echo "Step 2: Decoding configuration..."
docker exec peer0.ecta.cecbs.et configtxlator proto_decode \
    --input /tmp/config_block.pb \
    --type common.Block \
    --output /tmp/config_block.json

docker exec peer0.ecta.cecbs.et sh -c "cat /tmp/config_block.json | jq .data.data[0].payload.data.config > /tmp/config.json"

echo "✓ Config decoded"

# Step 3: Modify the policy
echo ""
echo "Step 3: Modifying Writers policy to include peers..."
docker exec peer0.ecta.cecbs.et sh -c "cat /tmp/config.json | \
    jq '.channel_group.groups.Application.groups.ECTAMSP.policies.Writers.policy.value.rule.n_out_of.rules[0].signed_by = 0' | \
    jq '.channel_group.groups.Application.groups.ECTAMSP.policies.Writers.policy.value.rule.n_out_of.rules += [{\"signed_by\": 1}]' | \
    jq '.channel_group.groups.Application.groups.ECTAMSP.policies.Writers.policy.value.identities += [{\"principal\": {\"msp_identifier\": \"ECTAMSP\", \"role\": \"PEER\"}, \"principal_classification\": \"ROLE\"}]' \
    > /tmp/modified_config.json"

echo "✓ Policy modified"

# Step 4: Encode modified config
echo ""
echo "Step 4: Encoding modified configuration..."
docker exec peer0.ecta.cecbs.et configtxlator proto_encode \
    --input /tmp/config.json \
    --type common.Config \
    --output /tmp/config.pb

docker exec peer0.ecta.cecbs.et configtxlator proto_encode \
    --input /tmp/modified_config.json \
    --type common.Config \
    --output /tmp/modified_config.pb

echo "✓ Config encoded"

# Step 5: Compute delta
echo ""
echo "Step 5: Computing configuration delta..."
docker exec peer0.ecta.cecbs.et configtxlator compute_update \
    --channel_id coffeechannel \
    --original /tmp/config.pb \
    --updated /tmp/modified_config.pb \
    --output /tmp/config_update.pb

echo "✓ Delta computed"

# Step 6: Decode delta
echo ""
echo "Step 6: Creating update envelope..."
docker exec peer0.ecta.cecbs.et configtxlator proto_decode \
    --input /tmp/config_update.pb \
    --type common.ConfigUpdate \
    --output /tmp/config_update.json

docker exec peer0.ecta.cecbs.et sh -c 'echo "{\"payload\":{\"header\":{\"channel_header\":{\"channel_id\":\"coffeechannel\",\"type\":2}},\"data\":{\"config_update\":'$(cat /tmp/config_update.json)' }}}" > /tmp/config_update_in_envelope.json'

docker exec peer0.ecta.cecbs.et configtxlator proto_encode \
    --input /tmp/config_update_in_envelope.json \
    --type common.Envelope \
    --output /tmp/config_update_in_envelope.pb

echo "✓ Update envelope created"

# Step 7: Sign and submit update
echo ""
echo "Step 7: Signing and submitting update..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer channel update \
    -f /tmp/config_update_in_envelope.pb \
    -c coffeechannel \
    -o orderer.cecbs.et:7050 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

echo "✓ Channel updated!"

echo ""
echo "==================================================================="
echo "CHANNEL POLICY UPDATED SUCCESSFULLY!"
echo "==================================================================="
echo ""
echo "Peers can now write to the channel."
echo "Try invoking the chaincode again."
echo ""
