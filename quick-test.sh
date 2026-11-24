#!/bin/bash

echo "=========================================="
echo "Quick Certificate Fix Verification"
echo "=========================================="
echo ""

# Check certificate errors
echo "1. Checking for certificate errors..."
ERRORS=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep -c "certificate signed by unknown authority" || echo "0")
if [ "$ERRORS" = "0" ]; then
    echo "   ✅ NO certificate errors found"
else
    echo "   ⚠️  Found $ERRORS certificate errors"
fi
echo ""

# Check API
echo "2. Checking API server..."
if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ API server is responding"
else
    echo "   ❌ API server not responding"
    echo "      Try: docker start cecbs-api"
fi
echo ""

# Test document upload
echo "3. Testing document upload..."
cat > /tmp/quick-test.pdf << 'EOF'
%PDF-1.4
%%EOF
EOF

RESULT=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/quick-test.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-QUICK-TEST-$(date +%s)" \
  -F "fileName=quick-test.pdf" 2>&1)

rm -f /tmp/quick-test.pdf

if echo "$RESULT" | grep -q '"success":true'; then
    echo "   ✅ Document upload WORKS!"
    DOC_ID=$(echo "$RESULT" | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
    echo "      Document ID: $DOC_ID"
    echo ""
    echo "=========================================="
    echo "🎉 CERTIFICATE ISSUE IS FIXED!"
    echo "=========================================="
elif echo "$RESULT" | grep -q "Document rejected by blockchain"; then
    echo "   ❌ Still getting blockchain rejection"
    echo "      Need to investigate further"
else
    ERROR=$(echo "$RESULT" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
    echo "   ⚠️  Got error: $ERROR"
fi

echo ""
echo "Next: Re-upload your documents for APP-1795151125086-VBYT9K"
echo "   ./reupload-documents.sh /path/to/Gurmu_Demuma_Resume.pdf RESUME"
echo ""
