# Document Upload Troubleshooting Guide

## Issue Summary

**Date**: November 20, 2026  
**Application ID**: APP-1795151125086-VBYT9K  
**Username**: applicant_sena_1  
**Status**: Application submitted successfully, but 5 document uploads failed

### Failed Documents
1. `Gurmu_Demuma_Resume.pdf` (3 failures)
2. `CV-Tips.jpg` (2 failures)

### Error Message
```
HTTP 400 — Document rejected by blockchain network
```

---

## Root Cause

The document uploads failed because **the API server was not running** when the application was submitted. The frontend application successfully:
- ✅ Created the application in the database
- ✅ Generated login credentials
- ✅ Submitted application data

But the document upload requests failed because:
- ❌ API server was offline
- ❌ No endpoint available to process the uploads
- ❌ Blockchain registration could not proceed

---

## Solution Steps

### Step 1: Verify System Status

Run the diagnostic tool:
```bash
cd /home/guda/GoCBC
./diagnose-document-upload.sh
```

**Expected Output**:
- ✅ Blockchain network running (6 peers, 1 orderer)
- ✅ API server running
- ✅ Hash generation working
- ✅ Upload directory exists

### Step 2: Re-Upload Documents

#### Option A: Via Web Interface (Recommended)

1. Open the application status page:
   ```
   http://localhost:3000/status
   ```

2. Log in with:
   - **Username**: `applicant_sena_1`
   - **Password**: `kBV$#ViY897tkZcR`
   - **Application ID**: `APP-1795151125086-VBYT9K`

3. Navigate to the documents section

4. Upload the missing files:
   - `Gurmu_Demuma_Resume.pdf`
   - `CV-Tips.jpg`

#### Option B: Via Command Line

Use the re-upload script:
```bash
cd /home/guda/GoCBC

# Upload resume
./reupload-documents.sh /path/to/Gurmu_Demuma_Resume.pdf RESUME

# Upload CV tips
./reupload-documents.sh /path/to/CV-Tips.jpg SUPPORTING_DOCUMENT
```

#### Option C: Via cURL

```bash
# Upload resume
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/path/to/Gurmu_Demuma_Resume.pdf" \
  -F "documentType=RESUME" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-1795151125086-VBYT9K" \
  -F "fileName=Gurmu_Demuma_Resume.pdf"

# Upload CV tips
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "file=@/path/to/CV-Tips.jpg" \
  -F "documentType=SUPPORTING_DOCUMENT" \
  -F "entityType=EXPORTER_APPLICATION" \
  -F "entityId=APP-1795151125086-VBYT9K" \
  -F "fileName=CV-Tips.jpg"
```

---

## Technical Details

### How Document Upload Works

1. **Frontend submits file** via multipart/form-data to `/api/v1/documents/upload-registration`
2. **API server receives file** and saves to `/api/uploads/documents/`
3. **SHA-256 hash calculated** from file content (must be exactly 64 hex characters)
4. **Blockchain registration** via `RegisterDocumentHash` chaincode function
5. **Validation checks**:
   - Hash length = 64 characters
   - Hash is valid hexadecimal
   - File size ≤ 10MB
   - Filename ≤ 255 characters
6. **Database record created** in PostgreSQL `documents` table
7. **Success response** returned with document ID

### Chaincode Validation Rules

From `/home/guda/GoCBC/chaincodes/coffee/documents.go`:

```go
func (c *CoffeeContract) RegisterDocumentHash(...) error {
    // Validation 1: Hash must be 64 characters (32-byte SHA-256 in hex)
    if len(hash) != 64 {
        return fmt.Errorf("document hash must be a 32-byte SHA-256 hex digest")
    }
    
    // Validation 2: Hash must be valid hexadecimal
    if _, err := hex.DecodeString(hash); err != nil {
        return fmt.Errorf("document hash must be hexadecimal: %w", err)
    }
    
    // ... rest of registration logic
}
```

### Common Failure Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `HTTP 400 - Document rejected` | API server offline | Start API server |
| `hash must be a 32-byte SHA-256` | Invalid hash format | Check hash calculation |
| `x509: certificate signed by unknown authority` | MSP certificate issue | Re-generate certificates |
| `NO_FILE - No file uploaded` | Empty file upload | Ensure file is attached |
| `FIELD_TOO_LONG` | Filename > 255 chars | Rename file to be shorter |

---

## Verification

After re-uploading, verify the documents:

### 1. Check Database
```bash
cd /home/guda/GoCBC/api
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cecbs',
  password: 'postgres',
  port: 5432
});

pool.query(
  'SELECT document_id, file_name, document_type, status FROM documents WHERE entity_id = \$1',
  ['APP-1795151125086-VBYT9K']
).then(result => {
  console.log('Documents for application:', result.rows);
  pool.end();
});
"
```

### 2. Check Blockchain
```bash
cd /home/guda/GoCBC/api
node -e "
const fabricService = require('./dist/services/fabricService').default;

(async () => {
  const result = await fabricService.queryAllDocumentsByEntity('EXPORTER_APPLICATION', 'APP-1795151125086-VBYT9K');
  console.log('Blockchain documents:', result.data);
})();
"
```

### 3. Check File System
```bash
ls -lh /home/guda/GoCBC/api/uploads/documents/ | grep -E "Gurmu|CV-Tips"
```

---

## Prevention

To prevent this issue in the future:

1. **Always start the full stack** before testing:
   ```bash
   cd /home/guda/GoCBC
   ./start-all.sh
   ```

2. **Verify all services are running**:
   ```bash
   # Check blockchain
   docker ps | grep peer0
   
   # Check API
   ps aux | grep "node.*api"
   
   # Check frontend
   ps aux | grep "next-server"
   ```

3. **Monitor logs during testing**:
   ```bash
   # API logs
   tail -f /home/guda/GoCBC/api/api.log
   
   # Peer logs
   docker logs -f peer0.ecta.cecbs.et
   ```

4. **Use the health check endpoint**:
   ```bash
   curl http://localhost:3001/api/v1/health
   ```

---

## Contact ECTA

If you cannot resolve the issue:

1. Contact ECTA with your **Application ID**: `APP-1795151125086-VBYT9K`
2. Explain that documents failed to upload during submission
3. Request assistance with manual document upload
4. ECTA administrators can upload documents on your behalf

---

## Files Created for Troubleshooting

- `/home/guda/GoCBC/diagnose-document-upload.sh` - System diagnostic tool
- `/home/guda/GoCBC/reupload-documents.sh` - Document re-upload helper
- `/home/guda/GoCBC/Docs/DOCUMENT-UPLOAD-TROUBLESHOOTING.md` - This guide

---

## Status

- [x] Application submitted successfully
- [x] Login credentials generated
- [x] API server started
- [ ] Documents re-uploaded (pending user action)
- [ ] Application complete and ready for ECTA review

**Next Action**: Re-upload the 2 missing documents using one of the methods above.
