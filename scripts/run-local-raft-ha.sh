#!/usr/bin/env bash
set -euo pipefail

# Build an isolated three-consenter channel, exercise a committed channel
# update, then commit another update with one orderer stopped. The live
# coffeechannel and its single orderer are never modified.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLOCKCHAIN_DIR="$ROOT/blockchain"
CRYPTO_DIR="$BLOCKCHAIN_DIR/ha-local/crypto"
CHANNEL_ID="raft-ha-local-v2"
BLOCK_FILE="$BLOCKCHAIN_DIR/ha-local/$CHANNEL_ID.block"
COMPOSE_FILE="$ROOT/docker-compose-fabric-ha-local.yml"
LOCAL_TLS_CA="$CRYPTO_DIR/tls-ca/ca.pem"
LOCAL_SIGN_CA="$CRYPTO_DIR/sign-ca/ca.pem"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '\n== %s ==\n' "$*"; }

command -v openssl >/dev/null 2>&1 || fail 'Required tool is missing: openssl'
command -v docker >/dev/null 2>&1 || fail 'Required tool is missing: docker'
command -v jq >/dev/null 2>&1 || fail 'Required tool is missing: jq'

fabric_tools() {
  docker run --rm --user "$(id -u):$(id -g)" --network cecbs-network \
    -v "$ROOT:/work" -w /work hyperledger/fabric-tools:2.5 "$@"
}

docker network inspect cecbs-network >/dev/null 2>&1 || fail 'The existing cecbs-network is not running. Start the regular Fabric stack first.'
docker inspect peer0.ecta.cecbs.et >/dev/null 2>&1 || fail 'peer0.ecta.cecbs.et is not available.'
docker inspect peer0.ecx.cecbs.et >/dev/null 2>&1 || fail 'peer0.ecx.cecbs.et is not available.'

if [[ -e "$CRYPTO_DIR" ]]; then
  [[ -s "$LOCAL_TLS_CA" && -s "$LOCAL_SIGN_CA" ]] || fail "Partial local crypto exists at $CRYPTO_DIR; preserve it and repair it manually instead of replacing identities."
  for node in 1 2 3; do
    [[ -s "$CRYPTO_DIR/orderer-ha-$node/msp/signcerts/orderer.pem" && -s "$CRYPTO_DIR/orderer-ha-$node/msp/keystore/priv_sk" && -s "$CRYPTO_DIR/orderer-ha-$node/tls/server.crt" && -s "$CRYPTO_DIR/orderer-ha-$node/tls/server.key" ]] || fail "Local orderer $node crypto is incomplete; refusing to replace persistent identities."
  done
else
  info 'Generating isolated local test identities'
  install -d -m 700 "$CRYPTO_DIR/sign-ca" "$CRYPTO_DIR/tls-ca" "$CRYPTO_DIR/admincerts" \
    "$BLOCKCHAIN_DIR/ha-local/msp/admincerts" "$BLOCKCHAIN_DIR/ha-local/msp/cacerts" "$BLOCKCHAIN_DIR/ha-local/msp/tlscacerts"

  openssl req -new -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
    -keyout "$CRYPTO_DIR/sign-ca/ca.key" -out "$LOCAL_SIGN_CA" -days 3650 -sha256 \
    -subj '/C=ET/O=CECBS Local HA/CN=CECBS Local HA Sign CA' \
    -addext 'basicConstraints=critical,CA:TRUE' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign' \
    -addext 'subjectKeyIdentifier=hash' >/dev/null 2>&1
  openssl req -new -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
    -keyout "$CRYPTO_DIR/tls-ca/ca.key" -out "$LOCAL_TLS_CA" -days 3650 -sha256 \
    -subj '/C=ET/O=CECBS Local HA/CN=CECBS Local HA TLS CA' \
    -addext 'basicConstraints=critical,CA:TRUE' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign' \
    -addext 'subjectKeyIdentifier=hash' >/dev/null 2>&1

  cp "$LOCAL_SIGN_CA" "$BLOCKCHAIN_DIR/ha-local/msp/cacerts/local-orderer-ca.pem"
  cp "$LOCAL_TLS_CA" "$BLOCKCHAIN_DIR/ha-local/msp/tlscacerts/local-orderer-tls-ca.pem"
  cat > "$BLOCKCHAIN_DIR/ha-local/msp/config.yaml" <<'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/local-orderer-ca.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/local-orderer-ca.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/local-orderer-ca.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/local-orderer-ca.pem
    OrganizationalUnitIdentifier: orderer
EOF

  mkdir -p "$CRYPTO_DIR/admin"
  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "$CRYPTO_DIR/admin/admin.key" >/dev/null 2>&1
  openssl req -new -key "$CRYPTO_DIR/admin/admin.key" -out "$CRYPTO_DIR/admin/admin.csr" \
    -subj '/C=ET/O=CECBS Local HA/OU=admin/CN=local-ha-admin' >/dev/null 2>&1
  cat > "$CRYPTO_DIR/admin/admin.ext" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EOF
  openssl x509 -req -in "$CRYPTO_DIR/admin/admin.csr" -CA "$LOCAL_SIGN_CA" -CAkey "$CRYPTO_DIR/sign-ca/ca.key" \
    -set_serial "0x$(openssl rand -hex 16)" -out "$CRYPTO_DIR/admin/admin.pem" -days 3650 -sha256 \
    -extfile "$CRYPTO_DIR/admin/admin.ext" >/dev/null 2>&1
  cp "$CRYPTO_DIR/admin/admin.pem" "$BLOCKCHAIN_DIR/ha-local/msp/admincerts/local-orderer-admin.pem"

  for node in 1 2 3; do
    name="orderer-ha-$node.cecbs.et"
    node_dir="$CRYPTO_DIR/orderer-ha-$node"
    install -d -m 700 "$node_dir/msp/cacerts" "$node_dir/msp/tlscacerts" "$node_dir/msp/signcerts" "$node_dir/msp/keystore" "$node_dir/tls"
    cp "$LOCAL_SIGN_CA" "$node_dir/msp/cacerts/local-orderer-ca.pem"
    cp "$LOCAL_TLS_CA" "$node_dir/msp/tlscacerts/local-orderer-tls-ca.pem"
    cp "$BLOCKCHAIN_DIR/ha-local/msp/config.yaml" "$node_dir/msp/config.yaml"

    openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "$node_dir/msp/keystore/priv_sk" >/dev/null 2>&1
    openssl req -new -key "$node_dir/msp/keystore/priv_sk" -out "$node_dir/msp/orderer.csr" \
      -subj "/C=ET/O=CECBS Local HA/OU=orderer/CN=$name" >/dev/null 2>&1
    cat > "$node_dir/msp/orderer.ext" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EOF
    openssl x509 -req -in "$node_dir/msp/orderer.csr" -CA "$LOCAL_SIGN_CA" -CAkey "$CRYPTO_DIR/sign-ca/ca.key" \
      -set_serial "0x$(openssl rand -hex 16)" -out "$node_dir/msp/signcerts/orderer.pem" -days 3650 -sha256 \
      -extfile "$node_dir/msp/orderer.ext" >/dev/null 2>&1

    openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "$node_dir/tls/server.key" >/dev/null 2>&1
    openssl req -new -key "$node_dir/tls/server.key" -out "$node_dir/tls/server.csr" \
      -subj "/C=ET/O=CECBS Local HA/CN=$name" >/dev/null 2>&1
    cat > "$node_dir/tls/server.ext" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
subjectAltName=DNS:$name,DNS:orderer-ha-$node,DNS:localhost,IP:127.0.0.1
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EOF
    openssl x509 -req -in "$node_dir/tls/server.csr" -CA "$LOCAL_TLS_CA" -CAkey "$CRYPTO_DIR/tls-ca/ca.key" \
      -set_serial "0x$(openssl rand -hex 16)" -out "$node_dir/tls/server.crt" -days 3650 -sha256 \
      -extfile "$node_dir/tls/server.ext" >/dev/null 2>&1
    cp "$LOCAL_TLS_CA" "$node_dir/tls/ca.crt"
    chmod 600 "$node_dir/msp/keystore/priv_sk" "$node_dir/tls/server.key"
  done
  chmod 600 "$CRYPTO_DIR/sign-ca/ca.key" "$CRYPTO_DIR/tls-ca/ca.key" "$CRYPTO_DIR/admin/admin.key"
fi

for node in 1 2 3; do
  openssl verify -CAfile "$LOCAL_SIGN_CA" "$CRYPTO_DIR/orderer-ha-$node/msp/signcerts/orderer.pem" >/dev/null || fail "Orderer $node signing certificate is invalid."
  openssl verify -CAfile "$LOCAL_TLS_CA" "$CRYPTO_DIR/orderer-ha-$node/tls/server.crt" >/dev/null || fail "Orderer $node TLS certificate is invalid."
done

info 'Generating isolated three-consenter channel block'
fabric_tools configtxgen -configPath /work/blockchain -profile CoffeeLocalRaftHA \
  -channelID "$CHANNEL_ID" -outputBlock "/work/blockchain/ha-local/$CHANNEL_ID.block"
chmod 644 "$BLOCK_FILE"

info 'Starting the three local orderer nodes'
docker compose -f "$COMPOSE_FILE" up -d

admin_cert=/work/blockchain/ha-local/crypto/orderer-ha-1/tls/server.crt
admin_key=/work/blockchain/ha-local/crypto/orderer-ha-1/tls/server.key
local_tls_ca=/work/blockchain/ha-local/crypto/tls-ca/ca.pem
for node in 1 2 3; do
  ready=false
  for attempt in $(seq 1 60); do
    if fabric_tools osnadmin channel list -o "orderer-ha-$node.cecbs.et:7053" \
      --ca-file "$local_tls_ca" --client-cert "$admin_cert" --client-key "$admin_key" >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 1
  done
  [[ "$ready" == true ]] || fail "Orderer admin endpoint on port $port did not become ready. Check docker logs."
done

for node in 1 2 3; do
  endpoint="orderer-ha-$node.cecbs.et:7053"
  if ! fabric_tools osnadmin channel list -o "$endpoint" --ca-file "$local_tls_ca" \
    --client-cert "$admin_cert" --client-key "$admin_key" 2>/dev/null | grep -Fq "$CHANNEL_ID"; then
    fabric_tools osnadmin channel join --channelID "$CHANNEL_ID" \
      --config-block "/work/blockchain/ha-local/$CHANNEL_ID.block" \
      -o "$endpoint" --ca-file "$local_tls_ca" --client-cert "$admin_cert" --client-key "$admin_key"
  fi
done

join_peer() {
  local peer_container="$1" msp_id="$2" admin_path="$3" address="$4"
  local peer_block="/tmp/$CHANNEL_ID.block"
  docker cp "$BLOCK_FILE" "$peer_container:$peer_block" >/dev/null
  if docker exec "$peer_container" peer channel list 2>/dev/null | grep -Fq "$CHANNEL_ID"; then
    return
  fi
  docker exec -e CORE_PEER_LOCALMSPID="$msp_id" \
    -e CORE_PEER_MSPCONFIGPATH="$admin_path" \
    -e CORE_PEER_ADDRESS="$address" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    "$peer_container" peer channel join -b "$peer_block"
}

channel_update() {
  local peer_container="$1" msp_id="$2" admin_path="$3" address="$4" update_file="$5" target_orderer="$6"
  local peer_update="/tmp/$CHANNEL_ID-$(echo "$msp_id" | tr '[:upper:]' '[:lower:]')-anchor.tx"
  docker cp "$update_file" "$peer_container:$peer_update" >/dev/null
  docker cp "$LOCAL_TLS_CA" "$peer_container:/tmp/local-ha-orderer-tls-ca.pem" >/dev/null
  docker exec -e CORE_PEER_LOCALMSPID="$msp_id" \
    -e CORE_PEER_MSPCONFIGPATH="$admin_path" \
    -e CORE_PEER_ADDRESS="$address" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    "$peer_container" peer channel update -f "$peer_update" -c "$CHANNEL_ID" \
      -o "$target_orderer" --tls --cafile /tmp/local-ha-orderer-tls-ca.pem
}

make_config_update() {
  local current_block="$1" target_profile="$2" as_org="$3" suffix="$4"
  local temp_dir="$BLOCKCHAIN_DIR/ha-local/tmp"
  local container_dir="/work/blockchain/ha-local/tmp"
  mkdir -p "$temp_dir"
  local current_container_path="/work/${current_block#"$ROOT"/}"

  fabric_tools configtxgen -configPath /work/blockchain -profile "$target_profile" \
    -channelID "$CHANNEL_ID" -outputBlock "$container_dir/$suffix-desired.block" >/dev/null
  fabric_tools configtxgen -configPath /work/blockchain -profile "$target_profile" \
    -channelID "$CHANNEL_ID" -outputAnchorPeersUpdate "$container_dir/$suffix-skeleton.tx" \
    -asOrg "$as_org" >/dev/null
  fabric_tools configtxlator proto_decode --type common.Block \
    --input "$current_container_path" --output "$container_dir/$suffix-current-block.json"
  fabric_tools configtxlator proto_decode --type common.Block \
    --input "$container_dir/$suffix-desired.block" --output "$container_dir/$suffix-desired-block.json"
  jq '.data.data[0].payload.data.config' "$temp_dir/$suffix-current-block.json" > "$temp_dir/$suffix-current-config.json"
  jq '.data.data[0].payload.data.config' "$temp_dir/$suffix-desired-block.json" > "$temp_dir/$suffix-desired-config.json"
  fabric_tools configtxlator proto_encode --type common.Config \
    --input "$container_dir/$suffix-current-config.json" --output "$container_dir/$suffix-current-config.pb"
  fabric_tools configtxlator proto_encode --type common.Config \
    --input "$container_dir/$suffix-desired-config.json" --output "$container_dir/$suffix-desired-config.pb"
  fabric_tools configtxlator compute_update --channel_id "$CHANNEL_ID" \
    --original "$container_dir/$suffix-current-config.pb" \
    --updated "$container_dir/$suffix-desired-config.pb" \
    --output "$container_dir/$suffix-update.pb"
  fabric_tools configtxlator proto_decode --type common.ConfigUpdate \
    --input "$container_dir/$suffix-update.pb" --output "$container_dir/$suffix-update.json"
  fabric_tools configtxlator proto_decode --type common.Envelope \
    --input "$container_dir/$suffix-skeleton.tx" --output "$container_dir/$suffix-skeleton.json"
  jq --argjson config_update "$(cat "$temp_dir/$suffix-update.json")" \
    '.payload.data.config_update = $config_update' "$temp_dir/$suffix-skeleton.json" \
    > "$temp_dir/$suffix-envelope.json"
  fabric_tools configtxlator proto_encode --type common.Envelope \
    --input "$container_dir/$suffix-envelope.json" \
    --output "/work/blockchain/ha-local/$CHANNEL_ID-$suffix-config-update.pb"
  # The peer CLI signs this file in place; world-write survives docker cp's
  # rootless UID remapping on development hosts.
  chmod 666 "$BLOCKCHAIN_DIR/ha-local/$CHANNEL_ID-$suffix-config-update.pb"
  printf '%s\n' "$BLOCKCHAIN_DIR/ha-local/$CHANNEL_ID-$suffix-config-update.pb"
}

fetch_latest_config() {
  local peer_container="$1" msp_id="$2" admin_path="$3" address="$4" target_orderer="$5" host_output="$6"
  local peer_output="/tmp/$CHANNEL_ID-latest-config.block"
  docker cp "$LOCAL_TLS_CA" "$peer_container:/tmp/local-ha-orderer-tls-ca.pem" >/dev/null
  docker exec -e CORE_PEER_LOCALMSPID="$msp_id" \
    -e CORE_PEER_MSPCONFIGPATH="$admin_path" \
    -e CORE_PEER_ADDRESS="$address" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    "$peer_container" peer channel fetch config "$peer_output" -c "$CHANNEL_ID" \
      -o "$target_orderer" --tls --cafile /tmp/local-ha-orderer-tls-ca.pem >/dev/null
  docker cp "$peer_container:$peer_output" "$host_output" >/dev/null
}

peer_height() {
  docker exec "$1" peer channel getinfo -c "$CHANNEL_ID" 2>/dev/null \
    | sed -nE 's/.*"height"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' | head -n 1
}

info 'Joining ECTA and ECX peers to the isolated channel'
join_peer peer0.ecta.cecbs.et ECTAMSP /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et:7051
join_peer peer0.ecx.cecbs.et ECXMSP /etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et:8051

info 'Committing the ECTA anchor-peer update through the three-node Raft cluster'
height="$(peer_height peer0.ecta.cecbs.et)"
if [[ -z "$height" || "$height" -lt 2 ]]; then
  ecta_update="$(make_config_update "$BLOCK_FILE" CoffeeLocalRaftHAECTAAnchor ECTAMSP ecta-anchor)"
  channel_update peer0.ecta.cecbs.et ECTAMSP /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et:7051 "$ecta_update" orderer-ha-1.cecbs.et:7050
fi

height="$(peer_height peer0.ecx.cecbs.et)"
failover_performed=false
if [[ -z "$height" || "$height" -lt 3 ]]; then
  info 'Stopping one local orderer and committing the ECX update via the remaining quorum'
  current_config_block="$BLOCKCHAIN_DIR/ha-local/$CHANNEL_ID-current.block"
  fetch_latest_config peer0.ecta.cecbs.et ECTAMSP /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et:7051 orderer-ha-1.cecbs.et:7050 "$current_config_block"
  ecx_update="$(make_config_update "$current_config_block" CoffeeLocalRaftHAAllAnchors ECXMSP ecx-anchor)"
  docker stop orderer-ha-1.cecbs.et >/dev/null
  restart_first_orderer() { docker start orderer-ha-1.cecbs.et >/dev/null 2>&1 || true; }
  trap restart_first_orderer EXIT
  channel_update peer0.ecx.cecbs.et ECXMSP /etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et:8051 "$ecx_update" orderer-ha-2.cecbs.et:7050

  height_ok=false
  for attempt in $(seq 1 30); do
    if [[ "$(peer_height peer0.ecx.cecbs.et)" -ge 3 ]]; then
      height_ok=true
      break
    fi
    sleep 1
  done
  [[ "$height_ok" == true ]] || fail 'The second channel update did not reach block height 3 while one orderer was stopped.'
  failover_performed=true

  docker start orderer-ha-1.cecbs.et >/dev/null
  trap - EXIT
else
  info 'The isolated channel already has the failover block; skipping duplicate config updates'
fi

info 'Verifying all three orderer admin endpoints and peer ledger height'
for node in 1 2 3; do
  fabric_tools osnadmin channel list -o "orderer-ha-$node.cecbs.et:7053" --ca-file "$local_tls_ca" \
    --client-cert "$admin_cert" --client-key "$admin_key" | grep -F "$CHANNEL_ID"
done
docker exec peer0.ecta.cecbs.et peer channel getinfo -c "$CHANNEL_ID"
docker exec peer0.ecx.cecbs.et peer channel getinfo -c "$CHANNEL_ID"

if [[ "$failover_performed" == true ]]; then
  printf '\nPASS: local three-consenter Raft committed channel updates at heights 2 and 3 with one orderer offline.\n'
else
  printf '\nPASS: local three-consenter Raft channel is healthy at height 3; the saved one-orderer failover block is present.\n'
fi
printf 'The existing coffeechannel and orderer.cecbs.et were left untouched.\n'
