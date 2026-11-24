#!/bin/bash

echo "=========================================="
echo "Document Re-Upload Helper"
echo "=========================================="
echo ""

API_URL="http://localhost:3001/api/v1"
APP_ID="APP-1795151125086-VBYT9K"

echo "Application ID: $APP_ID"
echo "API Endpoint: $API_URL/documents/upload-registration"
echo ""
echo "This script helps you re-upload failed documents."
echo ""

# Function to upload a document
upload_document() {
    local file_path="$1"
    local doc_type="$2"
    
    if [ ! -f "$file_path" ]; then
        echo "❌ File not found: $file_path"
        return 1
    fi
    
    echo "Uploading: $(basename "$file_path") as $doc_type..."
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/documents/upload-registration" \
        -F "file=@$file_path" \
        -F "documentType=$doc_type" \
        -F "entityType=EXPORTER_APPLICATION" \
        -F "entityId=$APP_ID" \
        -F "fileName=$(basename "$file_path")")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Upload successful!"
        echo "$body" | grep -o '"documentId":"[^"]*"' || echo "$body"
    else
        echo "❌ Upload failed (HTTP $http_code)"
        echo "$body" | grep -o '"message":"[^"]*"' || echo "$body"
    fi
    echo ""
}

echo "=========================================="
echo "Usage Examples:"
echo "=========================================="
echo ""
echo "To upload your resume:"
echo "  ./reupload-documents.sh /path/to/Gurmu_Demuma_Resume.pdf RESUME"
echo ""
echo "To upload CV tips image:"
echo "  ./reupload-documents.sh /path/to/CV-Tips.jpg SUPPORTING_DOCUMENT"
echo ""
echo "Available document types:"
echo "  - RESUME"
echo "  - COVER_LETTER"
echo "  - BUSINESS_LICENSE"
echo "  - TAX_CLEARANCE"
echo "  - BANK_STATEMENT"
echo "  - SUPPORTING_DOCUMENT"
echo "  - OTHER"
echo ""

# If arguments provided, upload the file
if [ $# -eq 2 ]; then
    upload_document "$1" "$2"
elif [ $# -eq 0 ]; then
    echo "No files specified. Use the examples above to upload documents."
else
    echo "❌ Invalid arguments. Usage: $0 <file_path> <document_type>"
fi

echo "=========================================="
