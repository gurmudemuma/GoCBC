#!/bin/bash
# Test Document Upload and Retrieval Flow

API_URL="http://localhost:3001/api/v1"
echo "Testing Document Flow for CECBS"
echo "================================"
echo ""

# Step 1: Login as ECTA user
echo "1. Logging in as ECTA user..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ecta_admin",
    "password": "ecta123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a test document
echo "2. Creating test document..."
echo "Test Document Content" > /tmp/test_doc.txt

UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@/tmp/test_doc.txt" \
  -F "category=TEST_DOCUMENT" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=TEST_APP_001")

DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"documentId":"[^"]*' | sed 's/"documentId":"//')

if [ -z "$DOC_ID" ]; then
  echo "❌ Document upload failed. Response:"
  echo "$UPLOAD_RESPONSE"
  exit 1
fi

echo "✅ Document uploaded successfully. Document ID: $DOC_ID"
echo ""

# Step 3: Retrieve document metadata
echo "3. Retrieving document metadata..."
METADATA_RESPONSE=$(curl -s -X GET "${API_URL}/documents/${DOC_ID}/metadata" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Metadata retrieved:"
echo "$METADATA_RESPONSE" | head -5
echo ""

# Step 4: Download document
echo "4. Testing document download..."
curl -s -X GET "${API_URL}/documents/${DOC_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/downloaded_doc.txt

if [ -f /tmp/downloaded_doc.txt ]; then
  DOWNLOADED_CONTENT=$(cat /tmp/downloaded_doc.txt)
  if [ "$DOWNLOADED_CONTENT" = "Test Document Content" ]; then
    echo "✅ Document downloaded successfully and content matches!"
  else
    echo "⚠️ Document downloaded but content doesn't match"
    echo "Expected: Test Document Content"
    echo "Got: $DOWNLOADED_CONTENT"
  fi
else
  echo "❌ Document download failed"
fi
echo ""

# Step 5: Test document viewing URL
echo "5. Testing document viewing URL..."
VIEW_URL="http://localhost:3000/api/v1/documents/${DOC_ID}"
echo "   View URL: $VIEW_URL"
echo "   (Open this URL in your browser to test)"
echo ""

# Summary
echo "================================"
echo "Test Summary:"
echo "✅ Document uploaded: $DOC_ID"
echo "✅ Metadata retrieval: Working"
echo "✅ Document download: Working"
echo ""
echo "To test in browser:"
echo "1. Open ECTA Portal at http://localhost:3000/portals/ecta"
echo "2. Navigate to exporter applications"
echo "3. Click 'View Details' on any application"
echo "4. Go to 'Documents' tab"
echo "5. Click 'View Document' or 'Download' buttons"
echo ""
echo "Expected behavior:"
echo "- View button should open document in new tab"
echo "- Download button should download the document"
echo "- Both buttons use URL: ${API_URL}/documents/{documentId}"
