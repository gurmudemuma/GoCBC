#!/usr/bin/env bash
# Upgrade coffee chaincode to v1.12 sequence 2 — adds ECX functions
set -euo pipefail
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.12"
CC_SEQUENCE=2
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
STAGE="C:/goCBC/blockchain/channel-artifacts"

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

px() {
  local org=$1; shift
  docker exec \
    -e FABRIC_CFG_PATH=//etc/hyperledger/fabric \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=${ORG_MSP[$org]} \
    -e CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${ORG_PORT[$org]} \
    -e CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
    peer0.${org}.cecbs.et "$@"
}

echo "=== Step 1: Build package ==="
printf '{"type":"ccaas","label":"%s"}' "$CC_LABEL" > "/c/goCBC/blockchain/channel-artifacts/metadata.json"
printf '{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}' > "/c/goCBC/blockchain/channel-artifacts/connection.json"
(cd "/c/goCBC/blockchain/channel-artifacts" && tar czf code.tar.gz connection.json && tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz && rm -f metadata.json connection.json code.tar.gz)
echo "Package: ${STAGE}/${CC_LABEL}.tar.gz"

echo "=== Step 2: Install on all peers ==="
for org in "${ORGS[@]}"; do
  docker exec "peer0.${org}.cecbs.et" mkdir -p /tmp
  docker cp "${STAGE}/${CC_LABEL}.tar.gz" "peer0.${org}.cecbs.et:/tmp/${CC_LABEL}.tar.gz"
  out=$(px "$org" peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 || true)
  echo "  $org: $(echo "$out" | grep -o 'Chaincode code package.*\|already been installed\|Error.*' | head -1 || echo 'done')"
done

echo "=== Step 3: Get Package ID ==="
PKG_ID=$(px ecta peer lifecycle chaincode queryinstalled --output json 2>/dev/null \
  | grep -o '"package_id":"[^"]*"' | grep "$CC_LABEL" | cut -d'"' -f4 | head -1)
echo "PKG_ID: $PKG_ID"
[[ -z "$PKG_ID" ]] && { echo "ERROR: no package ID found"; exit 1; }

echo "=== Step 4: Approve for all orgs ==="
for org in "${ORGS[@]}"; do
  echo -n "  $org... "
  px "$org" peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
    --package-id "$PKG_ID" --sequence $CC_SEQUENCE 2>&1 | grep -v "^$" || true
done

echo "=== Step 5: Check readiness ==="
px ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1

echo "=== Step 6: Copy TLS certs ==="
for org in "${ORGS[@]}"; do
  docker cp "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/tls/ca.crt" "${STAGE}/tls-${org}.crt"
  docker cp "${STAGE}/tls-${org}.crt" "peer0.ecta.cecbs.et://tmp/tls-${org}.crt"
done
echo "TLS certs staged"

echo "=== Step 7: Commit ==="
PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//tmp/tls-${org}.crt")
done
px ecta peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" --sequence $CC_SEQUENCE \
  "${PEER_ARGS[@]}" 2>&1

echo "=== Step 8: Verify ==="
px ecta peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo "=== Step 9: Update docker-compose and restart chaincode container ==="
# Update CORE_CHAINCODE_ID_NAME in docker-compose-fabric.yml automatically
sed -i "s|CORE_CHAINCODE_ID_NAME=.*|CORE_CHAINCODE_ID_NAME=${PKG_ID}|" /c/goCBC/docker-compose-fabric.yml
echo "Updated docker-compose-fabric.yml with new PKG_ID: $PKG_ID"

docker rm -f coffee-chaincode 2>/dev/null || true
docker-compose -f /c/goCBC/docker-compose-fabric.yml up -d coffee-chaincode
sleep 4
echo "--- Chaincode container status ---"
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs coffee-chaincode --tail 3 2>&1

echo ""
echo "=== ALL DONE ==="
echo "  coffee v${CC_VERSION} (sequence ${CC_SEQUENCE}) deployed with ECX functions."
echo "  Chaincode container restarted with new CCID."
