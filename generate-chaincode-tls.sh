#!/bin/bash
set -e

echo "=========================================="
echo "Generating TLS Certificates for Chaincode"
echo "=========================================="

CERT_DIR="/home/guda/GoCBC/chaincodes/coffee/tls"
CA_DIR="/home/guda/GoCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/tlsca"

# Create directory for chaincode certs
mkdir -p "$CERT_DIR"

echo ""
echo "[1/4] Generating private key for coffee-chaincode..."
openssl genrsa -out "$CERT_DIR/server.key" 2048

echo ""
echo "[2/4] Creating certificate signing request..."
openssl req -new -key "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=CECBS/CN=coffee-chaincode"

echo ""
echo "[3/4] Signing certificate with ECTA TLS CA..."
# Use the ECTA TLS CA to sign
openssl x509 -req -in "$CERT_DIR/server.csr" \
  -CA "$CA_DIR/tlsca.ecta.cecbs.et-cert.pem" \
  -CAkey "$CA_DIR/priv_sk" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days 365 \
  -sha256 \
  -extfile <(printf "subjectAltName=DNS:coffee-chaincode,DNS:localhost,IP:127.0.0.1")

echo ""
echo "[4/4] Copying CA certificate..."
cp "$CA_DIR/tlsca.ecta.cecbs.et-cert.pem" "$CERT_DIR/ca.crt"

echo ""
echo "=========================================="
echo "✓ TLS Certificates Generated Successfully"
echo "=========================================="
echo ""
echo "Files created in $CERT_DIR:"
ls -lh "$CERT_DIR"
echo ""
echo "Next: Update docker-compose to mount these certificates"
