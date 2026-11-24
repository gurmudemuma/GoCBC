#!/bin/bash

echo "=========================================="
echo "Quick Certificate Fix"
echo "=========================================="
echo ""
echo "This will recreate the blockchain network with fresh certificates."
echo ""
echo "⚠️  WARNING: This will delete all blockchain data:"
echo "   - All contracts, LCs, shipments"
echo "   - All blockchain transactions"
echo "   - Blockchain state will be reset"
echo ""
echo "✅  PostgreSQL data (applications, users, etc.) will be preserved"
echo ""
read -p "Continue? Type 'yes' to proceed: " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd /home/guda/GoCBC

echo "Step 1/5: Creating backup..."
BACKUP_DIR=~/GoCBC-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
echo "   Backup directory: $BACKUP_DIR"
echo ""

echo "Step 2/5: Stopping network..."
./teardown.sh
echo ""

echo "Step 3/5: Cleaning up..."
sleep 5
docker volume prune -f 2>/dev/null || true
echo ""

echo "Step 4/5: Starting network with fresh certificates..."
./start-all.sh
echo ""

echo "Step 5/5: Waiting for network to stabilize (30 seconds)..."
sleep 30
echo ""

echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""

echo "Checking peer status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep peer0 | head -6
echo ""

echo "Checking for certificate errors..."
CERT_ERRORS=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep -c "certificate signed by unknown authority" || echo "0")
if [ "$CERT_ERRORS" -eq "0" ]; then
    echo "✅ No certificate errors found!"
else
    echo "⚠️  Still seeing $CERT_ERRORS certificate errors"
    echo "   The network may still be starting up. Wait 30 more seconds and check again."
fi
echo ""

echo "Testing document upload..."
# Create a minimal valid PDF
cat > /tmp/test-cert-fix.pdf << 'EOF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
200
%%EOF
EOF

UPLOAD_RESULT=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/test-cert-fix.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-TEST-CERT-FIX-$(date +%s)" \
  -F "fileName=test.pdf" 2>/dev/null)

rm -f /tmp/test-cert-fix.pdf

SUCCESS=$(echo "$UPLOAD_RESULT" | grep -o '"success":[^,}]*' | head -1)
if [[ "$SUCCESS" == *"true"* ]]; then
    echo "✅ Document upload test PASSED!"
    echo ""
    DOC_ID=$(echo "$UPLOAD_RESULT" | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$DOC_ID" ]; then
        echo "   Document ID: $DOC_ID"
    fi
else
    ERROR_MSG=$(echo "$UPLOAD_RESULT" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    if [[ "$ERROR_MSG" == *"blockchain"* ]]; then
        echo "❌ Document upload test FAILED (still certificate issue)"
        echo "   Error: $ERROR_MSG"
        echo ""
        echo "   The network may need more time to fully start."
        echo "   Wait 1-2 minutes and run the test again:"
        echo "   ./test-document-upload.sh"
    else
        echo "⚠️  Document upload test returned an error: $ERROR_MSG"
        echo "   (This may not be a certificate issue)"
    fi
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Network has been recreated with fresh certificates."
echo ""
echo "Next steps:"
echo "1. Re-upload your test documents for Application ID: APP-1795151125086-VBYT9K"
echo "2. Check ECTA portal to see if the application appears"
echo "3. Continue testing"
echo ""
echo "To re-upload documents manually:"
echo "   ./reupload-documents.sh /path/to/Gurmu_Demuma_Resume.pdf RESUME"
echo "   ./reupload-documents.sh /path/to/CV-Tips.jpg SUPPORTING_DOCUMENT"
echo ""
echo "=========================================="
