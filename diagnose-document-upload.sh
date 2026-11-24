#!/bin/bash

echo "=========================================="
echo "Document Upload Diagnostic Tool"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if blockchain network is running
echo "1. Checking blockchain network..."
PEER_COUNT=$(docker ps | grep -c "peer0")
ORDERER_COUNT=$(docker ps | grep -c "orderer")

if [ $PEER_COUNT -ge 6 ] && [ $ORDERER_COUNT -ge 1 ]; then
    echo -e "${GREEN}✓ Blockchain network is running ($PEER_COUNT peers, $ORDERER_COUNT orderer)${NC}"
else
    echo -e "${RED}✗ Blockchain network incomplete ($PEER_COUNT peers, $ORDERER_COUNT orderer)${NC}"
fi
echo ""

# 2. Check if API server is running
echo "2. Checking API server..."
if ps aux | grep -E "node.*api|tsx.*server" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✓ API server is running${NC}"
    API_PID=$(ps aux | grep -E "node.*api|tsx.*server" | grep -v grep | awk '{print $2}' | head -1)
    echo "  PID: $API_PID"
else
    echo -e "${RED}✗ API server is NOT running${NC}"
    echo -e "${YELLOW}  → Start with: cd api && npm run dev${NC}"
fi
echo ""

# 3. Test document hash generation
echo "3. Testing document hash generation..."
TEST_FILE="/tmp/test-doc-$(date +%s).txt"
echo "This is a test document" > "$TEST_FILE"
HASH=$(sha256sum "$TEST_FILE" | awk '{print $1}')
echo "  Generated hash: $HASH"
echo "  Hash length: ${#HASH} characters"

if [ ${#HASH} -eq 64 ]; then
    echo -e "${GREEN}✓ Hash length is correct (64 chars)${NC}"
else
    echo -e "${RED}✗ Hash length is incorrect (expected 64, got ${#HASH})${NC}"
fi
rm -f "$TEST_FILE"
echo ""

# 4. Check recent chaincode logs
echo "4. Checking recent chaincode errors..."
ERRORS=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep -i "error\|failed" | tail -5)
if [ -z "$ERRORS" ]; then
    echo -e "${GREEN}✓ No recent errors in peer logs${NC}"
else
    echo -e "${YELLOW}Recent peer errors:${NC}"
    echo "$ERRORS"
fi
echo ""

# 5. Check API logs for document upload errors
echo "5. Checking API logs..."
if [ -f "/home/guda/GoCBC/api/api.log" ]; then
    UPLOAD_ERRORS=$(tail -200 /home/guda/GoCBC/api/api.log | grep -i "blockchain.*failed\|document rejected" | tail -3)
    if [ -z "$UPLOAD_ERRORS" ]; then
        echo -e "${GREEN}✓ No recent document upload errors in API log${NC}"
    else
        echo -e "${YELLOW}Recent upload errors:${NC}"
        echo "$UPLOAD_ERRORS"
    fi
else
    echo -e "${YELLOW}⚠ API log file not found${NC}"
fi
echo ""

# 6. Test blockchain connection
echo "6. Testing blockchain connection..."
cd /home/guda/GoCBC/api
if [ -f "test-blockchain-connection.js" ]; then
    echo "  Running connection test..."
    node test-blockchain-connection.js 2>&1 | head -10
else
    echo -e "${YELLOW}  Connection test script not found${NC}"
fi
echo ""

# 7. Check upload directory
echo "7. Checking upload directory..."
UPLOAD_DIR="/home/guda/GoCBC/api/uploads/documents"
if [ -d "$UPLOAD_DIR" ]; then
    DOC_COUNT=$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Upload directory exists${NC}"
    echo "  Location: $UPLOAD_DIR"
    echo "  Files: $DOC_COUNT"
else
    echo -e "${RED}✗ Upload directory not found${NC}"
    echo -e "${YELLOW}  → Will be created automatically on first upload${NC}"
fi
echo ""

echo "=========================================="
echo "Recommendations:"
echo "=========================================="
echo ""

if ! ps aux | grep -E "node.*api|tsx.*server" | grep -v grep > /dev/null; then
    echo -e "${YELLOW}1. Start the API server:${NC}"
    echo "   cd /home/guda/GoCBC/api && npm run dev"
    echo ""
fi

echo -e "${YELLOW}2. To re-upload failed documents:${NC}"
echo "   - Log in to the application status page"
echo "   - Use Application ID: APP-1795151125086-VBYT9K"
echo "   - Username: applicant_sena_1"
echo "   - Password: kBV\$#ViY897tkZcR"
echo "   - Upload the missing documents from there"
echo ""

echo -e "${YELLOW}3. To test document upload manually:${NC}"
echo "   curl -X POST http://localhost:3001/api/v1/documents/upload-registration \\"
echo "     -F 'file=@/path/to/document.pdf' \\"
echo "     -F 'documentType=RESUME' \\"
echo "     -F 'entityType=EXPORTER_APPLICATION' \\"
echo "     -F 'entityId=APP-1795151125086-VBYT9K'"
echo ""

echo "=========================================="
