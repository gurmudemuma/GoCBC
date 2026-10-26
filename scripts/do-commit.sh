#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

peer_exec() {
  local org=$1; shift
  docker exec \
    -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=${ORG_MSP[$org]}" \
    -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${ORG_PORT[$org]}" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
    "peer0.${org}.cecbs.et" "$@"
}

echo "=== checkcommitreadiness ==="
peer_exec ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1

echo ""
echo "=== Copying each org TLS CA into ecta container ==="
# Use Windows-style staging path for docker cp (avoids MSYS path conversion)
STAGE_DIR="C:/goCBC/blockchain/channel-artifacts"
for org in "${ORGS[@]}"; do
  # Copy TLS CA from each peer to Windows host staging dir
  docker cp "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/tls/ca.crt" "${STAGE_DIR}/tls-${org}.crt"
  # Copy from Windows host into ecta container
  docker cp "${STAGE_DIR}/tls-${org}.crt" "peer0.ecta.cecbs.et:/tmp/tls-${org}.crt"
  echo "  Copied TLS CA for $org"
done

echo ""
echo "=== COMMIT with per-org TLS certs ==="
PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//tmp/tls-${org}.crt")
done

peer_exec ecta peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" \
  --name "$CC_NAME" \
  --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE \
  "${PEER_ARGS[@]}" 2>&1

echo ""
echo "=== querycommitted ==="
peer_exec ecta peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo "=== DONE ==="
