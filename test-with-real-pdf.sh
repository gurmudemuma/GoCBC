#!/bin/bash
set -e

API_URL="http://localhost:3001/api/v1"

echo "🔧 Creating real PDF..."
cd /home/guda/GoCBC/api && NODE_PATH=/home/guda/GoCBC/api/node_modules node /home/guda/GoCBC/create-real-pdf.js

echo ""
echo "📄 Verifying PDF..."
file /home/guda/GoCBC/test-document.pdf

echo ""
echo "🔐 Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token')
echo "✅ Token obtained"

echo ""
echo "📤 Uploading PDF..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/home/guda/GoCBC/test-document.pdf" \
  -F "documentType=CONTRACT_SIGNED" \
  -F "entityType=CONTRACT" \
  -F "entityId=CNT-TEST-$(date +%s)")

DOC_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.documentId')
echo "✅ Document uploaded: $DOC_ID"

echo ""
echo "✍️  Signing document..."
SIGN_RESPONSE=$(curl -s -X POST "$API_URL/documents/$DOC_ID/sign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signatureType": "VERIFY", "remarks": "Cryptographic test"}')

echo "$SIGN_RESPONSE" | jq '.'

CRYPTO_EMBEDDED=$(echo "$SIGN_RESPONSE" | jq -r '.data.cryptoSignatureEmbedded')
echo ""
if [ "$CRYPTO_EMBEDDED" = "true" ]; then
    echo "✅ ✅ ✅ CRYPTO SIGNATURE EMBEDDED! ✅ ✅ ✅"
else
    echo "❌ Crypto signature NOT embedded: $CRYPTO_EMBEDDED"
    echo ""
    echo "Checking API logs for errors..."
    tail -50 /tmp/api-server.log | grep -i "sign\|crypto\|pdf\|error" || echo "No relevant log entries"
fi
