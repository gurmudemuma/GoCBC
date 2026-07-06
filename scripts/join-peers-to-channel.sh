#!/bin/bash

set -euo pipefail
export MSYS_NO_PATHCONV=1

CHANNEL_NAME="coffeechannel"

peer_join_if_needed() {
  local container="$1"
  local mspid="$2"
  local msp_path="$3"
  local address="$4"
  local tls_root="$5"
  local join_log="/tmp/${container}-join.log"

  if docker exec \
      -e CORE_PEER_TLS_ENABLED=true \
      -e CORE_PEER_LOCALMSPID="${mspid}" \
      -e CORE_PEER_TLS_ROOTCERT_FILE="${tls_root}" \
      -e CORE_PEER_MSPCONFIGPATH="${msp_path}" \
      -e CORE_PEER_ADDRESS="${address}" \
      "${container}" \
      peer channel getinfo -c "${CHANNEL_NAME}" >/dev/null 2>&1; then
    echo "${container} already joined ${CHANNEL_NAME}"
    return 0
  fi

  echo "Joining ${container}..."
  docker exec \
      -e CORE_PEER_TLS_ENABLED=true \
      -e CORE_PEER_LOCALMSPID="${mspid}" \
      -e CORE_PEER_TLS_ROOTCERT_FILE="${tls_root}" \
      -e CORE_PEER_MSPCONFIGPATH="${msp_path}" \
      -e CORE_PEER_ADDRESS="${address}" \
      "${container}" \
      peer channel join -b "/tmp/${CHANNEL_NAME}.block" >"${join_log}" 2>&1 || true

  if grep -q "already exists\|already joined" "${join_log}"; then
    echo "${container} already joined ${CHANNEL_NAME}"
    return 0
  fi

  if docker exec \
      -e CORE_PEER_TLS_ENABLED=true \
      -e CORE_PEER_LOCALMSPID="${mspid}" \
      -e CORE_PEER_TLS_ROOTCERT_FILE="${tls_root}" \
      -e CORE_PEER_MSPCONFIGPATH="${msp_path}" \
      -e CORE_PEER_ADDRESS="${address}" \
      "${container}" \
      peer channel getinfo -c "${CHANNEL_NAME}" >/dev/null 2>&1; then
    echo "${container} joined successfully"
    return 0
  fi

  cat "${join_log}"
  return 1
}

echo "Joining peers to channel: ${CHANNEL_NAME}"

echo "Copying channel block to peer containers..."
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.ecta.cecbs.et:/tmp/
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.ecx.cecbs.et:/tmp/
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.banks.cecbs.et:/tmp/
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.nbe.cecbs.et:/tmp/
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.customs.cecbs.et:/tmp/
docker cp "blockchain/channel-artifacts/${CHANNEL_NAME}.block" peer0.shipping.cecbs.et:/tmp/

peer_join_if_needed peer0.ecta.cecbs.et ECTAMSP /etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp peer0.ecta.cecbs.et:7051 /etc/hyperledger/fabric/tls/ca.crt
peer_join_if_needed peer0.ecx.cecbs.et ECXMSP /etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp peer0.ecx.cecbs.et:8051 /etc/hyperledger/fabric/tls/ca.crt
peer_join_if_needed peer0.banks.cecbs.et BanksMSP /etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp peer0.banks.cecbs.et:9051 /etc/hyperledger/fabric/tls/ca.crt
peer_join_if_needed peer0.nbe.cecbs.et NBEMSP /etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp peer0.nbe.cecbs.et:10051 /etc/hyperledger/fabric/tls/ca.crt
peer_join_if_needed peer0.customs.cecbs.et CustomsMSP /etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp peer0.customs.cecbs.et:11051 /etc/hyperledger/fabric/tls/ca.crt
peer_join_if_needed peer0.shipping.cecbs.et ShippingMSP /etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp peer0.shipping.cecbs.et:12051 /etc/hyperledger/fabric/tls/ca.crt

echo "All peers joined channel: ${CHANNEL_NAME}"
