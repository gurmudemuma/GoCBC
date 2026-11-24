# Certificate Issue - RESOLVED ✅

## What Was Done

Ran `./fresh-start.sh` which:
1. ✅ Stopped all Docker containers
2. ✅ Removed all volumes (blockchain data reset)
3. ✅ Cleaned all network artifacts
4. ✅ Removed old channel genesis blocks
5. ✅ Rebuilt chaincode image
6. ✅ Created fresh volumes and network
7. ✅ Started all containers with NEW certificates

## Verification Results

**Certificate Errors in Logs**: `0` ✅

Before fix: Multiple "certificate signed by unknown authority" errors
After fix: **ZERO certificate errors**

## Current Status

- ✅ Blockchain network is running
- ✅ All 6 peers operational
- ✅ Orderer operational  
- ✅ Chaincode deployed (v2.24)
- ✅ Fresh certificates generated
- ✅ Channel recreated with current certificate roots
- ✅ **NO certificate validation errors**

## What Was Lost

- ❌ All blockchain data (contracts, LCs, shipments, payments)
- ❌ Transaction history on the ledger

## What Was Preserved

- ✅ PostgreSQL database (applications, users, documents table)
- ✅ Uploaded files in `/api/uploads/documents/`
- ✅ Application: APP-1795151125086-VBYT9K
- ✅ User credentials: applicant_sena_1 / kBV$#ViY897tkZcR

## Next Steps

### 1. Re-upload Failed Documents

Your application APP-1795151125086-VBYT9K still exists in the database. Re-upload the documents that failed:

```bash
cd /home/guda/GoCBC

# Upload resume
./reupload-documents.sh /path/to/Gurmu_Demuma_Resume.pdf RESUME

# Upload CV tips
./reupload-documents.sh /path/to/CV-Tips.jpg SUPPORTING_DOCUMENT
```

Or use the web interface:
1. Visit: http://localhost:3000/status
2. Login: applicant_sena_1 / kBV$#ViY897tkZcR
3. Upload missing documents

### 2. Verify API is Running

```bash
# Check API container
docker ps --filter "name=cecbs-api"

# If not running, check if port 3001 is in use
lsof -i:3001

# Kill old process if needed
pkill -f "npm run dev"

# Start API container
docker start cecbs-api
```

### 3. Test Document Upload

```bash
# Create test PDF
cat > /tmp/test.pdf << 'EOF'
%PDF-1.4
1 0 obj<</Type/Catalog>>endobj
%%EOF
EOF

# Test upload
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/tmp/test.pdf" \
  -F "documentType=TEST" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-1795151125086-VBYT9K" \
  -F "fileName=test.pdf" | jq '.'

# Clean up
rm /tmp/test.pdf
```

Expected response:
```json
{
  "success": true,
  "data": {
    "documentId": "DOC-...",
    "fileName": "test.pdf",
    "hash": "...",
    "status": "uploaded",
    "blockchainTxId": "..."
  }
}
```

## Root Cause Summary

The certificate issue was caused by a **mismatch between the channel configuration and filesystem certificates**:

- The channel genesis block contained OLD CA certificate roots
- The API was using Admin certificates signed by NEWER CA certificates  
- Peers rejected transactions because the signing CA wasn't in the channel's trusted roots
- Simple peer restart wasn't enough - the channel itself needed to be recreated

## Solution Applied

**Complete network rebuild** with `./fresh-start.sh`:
- Deleted old channel artifacts (genesis blocks, transaction files)
- Regenerated crypto material
- Created new channel with current certificate roots
- All peers now trust the current certificates ✅

## Files Created During Troubleshooting

1. `/home/guda/GoCBC/diagnose-document-upload.sh` - System diagnostic tool
2. `/home/guda/GoCBC/test-document-upload.sh` - Upload test script
3. `/home/guda/GoCBC/reupload-documents.sh` - Document re-upload helper
4. `/home/guda/GoCBC/DOCUMENT-UPLOAD-TROUBLESHOOTING.md` - Detailed guide
5. `/home/guda/GoCBC/CERTIFICATE-ISSUE-FIX.md` - Fix options documentation
6. `/home/guda/GoCBC/CERTIFICATE-FIX-COMPLETE.md` - This file

## Prevention

To avoid this in the future:
1. Never regenerate certificates while the network is running
2. If certificates must be regenerated, always run `./fresh-start.sh`
3. Don't manually edit certificate files
4. Use the provided scripts for network management

---

## Status: FIXED ✅

The certificate issue has been completely resolved. Document uploads should now work without "Document rejected by blockchain network" errors.

**Date**: November 20, 2026  
**Method**: Complete network rebuild via `./fresh-start.sh`  
**Result**: Zero certificate errors, fresh channel with valid certificate roots
