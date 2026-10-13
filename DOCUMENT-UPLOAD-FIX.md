# Document Upload Issue - Diagnosis & Fix

## Problem Summary
Uploaded documents for exporter applications were showing as "MISSING" in the ECTA Portal application details modal, displaying "Documents (0)" even though documents were submitted during registration.

## Root Causes Identified

### 1. **Silent Upload Failures** (PRIMARY ISSUE)
**Location**: `/home/guda/GoCBC/ui/src/pages/register-exporter.tsx` lines 345-370

**Problem**: The document upload code collected upload results but never checked them:
```typescript
const uploadResults = await Promise.all(uploadPromises);
// ❌ Results were never checked - success shown regardless!
```

**Impact**: If documents failed to upload (due to API errors, network issues, or blockchain timeouts), the user would still see "Application submitted successfully" with no indication that documents failed.

### 2. **Case-Sensitive Database Query**
**Location**: `/home/guda/GoCBC/api/src/routes/documents.ts` line 1048

**Problem**: PostgreSQL query used case-sensitive comparison:
```sql
WHERE entity_type = $1 AND entity_id = $2
```

While SQLite fallback (line 1069) used case-insensitive:
```sql
WHERE UPPER(entity_type) = UPPER($1) AND entity_id = $2
```

**Impact**: If there was any case mismatch in `entity_type`, PostgreSQL wouldn't find the documents while SQLite would.

## Fixes Applied

### Fix 1: Document Upload Error Detection & Reporting
**File**: `/home/guda/GoCBC/ui/src/pages/register-exporter.tsx`

**Changes**:
1. Added detailed console logging for each upload attempt
2. Check HTTP response status before parsing JSON
3. Collect and analyze upload results
4. Show error message if any documents fail to upload:
   ```typescript
   const failedUploads = uploadResults.filter(r => !r.success);
   
   if (failedUploads.length > 0) {
     setError(`Application submitted successfully, but ${failedUploads.length} document(s) failed to upload. Please contact support.`);
     return;
   }
   ```

**Benefits**:
- Users will now be notified if documents fail to upload
- Console logs will show exactly which document failed and why
- Application ID is still created even if documents fail (can be re-uploaded later)

### Fix 2: Case-Insensitive PostgreSQL Query
**File**: `/home/guda/GoCBC/api/src/routes/documents.ts` line 1045

**Change**:
```sql
-- Before (case-sensitive)
WHERE entity_type = $1 AND entity_id = $2

-- After (case-insensitive)
WHERE UPPER(entity_type) = UPPER($1) AND entity_id = $2
```

**Benefits**:
- Matches SQLite behavior
- Prevents issues if entity_type has inconsistent casing
- More robust document retrieval

## Testing Instructions

### Step 1: Start Services
```bash
cd /home/guda/GoCBC
bash start-all.sh
# Choose option 1 for full startup
```

### Step 2: Check Database State
Run the SQL diagnostic script to see current state:
```bash
psql -h localhost -p 5432 -U cecbs -d cecbs -f check-documents-simple.sql
```

This will show:
- If documents table exists
- Total number of documents
- Recent documents uploaded
- Recent exporter applications

### Step 3: Test Document Upload (End-to-End)
1. Open browser to `http://localhost:3000/register-exporter`
2. Fill out the exporter application form
3. Upload 2-3 test documents (PDF, images, etc.)
4. Click Submit
5. **Open browser console (F12)** - you should see:
   ```
   Uploading 3 documents for application APP-1234567890-ABCDEF...
   Uploading document 1: test.pdf (BUSINESS_LICENSE)
   Document 1 uploaded: SUCCESS {...}
   Uploading document 2: photo.jpg (OTHER)
   Document 2 uploaded: SUCCESS {...}
   ...
   All 3 documents uploaded successfully!
   ```

### Step 4: Verify in ECTA Portal
1. Login as ECTA admin
2. Navigate to ECTA Portal
3. Find the application you just created
4. Click on it to open details modal
5. Click the "Documents" tab
6. **Expected**: Should show "Documents (3)" and list all uploaded documents
7. **Previous Bug**: Showed "Documents (0)" and all as MISSING

### Step 5: Test Failure Scenario
To verify error handling works:

1. Stop the API server temporarily:
   ```bash
   pkill -f "node.*api/dist/index.js"
   ```

2. Try to submit an application with documents
3. **Expected**: Should show error message:
   ```
   "Application submitted successfully, but 3 document(s) failed to upload. Please contact support."
   ```

4. Restart API server:
   ```bash
   cd /home/guda/GoCBC/api
   npm start
   ```

## Data Flow Diagram

```
User submits form
       ↓
1. POST /exporters/exporter-applications
   - Creates application record
   - Returns applicationId: "APP-XXXXX-XXXXX"
       ↓
2. For each document:
   POST /documents/upload-registration
   - FormData: { file, entityType: "EXPORTER_APPLICATION", entityId: "APP-XXXXX" }
   - Blockchain: RegisterDocumentHash
   - Database: INSERT INTO documents (entity_type, entity_id, ...)
   - Returns: { success: true, documentId: "DOC-XXXXX" }
       ↓
3. UI checks all upload results
   - If any failed → show error
   - If all succeeded → show success
       ↓
4. ECTA Portal fetches documents:
   GET /documents/entity/EXPORTER_APPLICATION/APP-XXXXX
   - Query: WHERE UPPER(entity_type) = UPPER('EXPORTER_APPLICATION')
           AND entity_id = 'APP-XXXXX'
   - Returns: [ { document_id, file_name, ... }, ... ]
       ↓
5. UI displays documents in modal
```

## Potential Issues to Check

### If Documents Still Show as MISSING:

1. **Check if documents table exists**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'documents';
   ```

2. **Check if documents are being uploaded**:
   ```sql
   SELECT COUNT(*) FROM documents WHERE entity_type = 'EXPORTER_APPLICATION';
   ```

3. **Check blockchain timeout**:
   - If blockchain is slow (>30s), document upload will fail
   - Check API logs for "BLOCKCHAIN_ERROR" messages
   - Solution: Make blockchain async (already done in fix)

4. **Check file permissions**:
   ```bash
   ls -la uploads/
   # Should show uploaded files with read permissions
   ```

5. **Check API logs during upload**:
   ```bash
   tail -f api/logs/app.log
   # Should show: "Uploading registration document", "registered on blockchain", "cached in database"
   ```

### If Uploads Are Failing:

Check console logs in browser (F12) for specific errors:
- `HTTP 400` = Validation error (missing required fields)
- `HTTP 500` = Server error (check API logs)
- `BLOCKCHAIN_ERROR` = Blockchain network issue
- Network error = API not running or CORS issue

## Files Modified

1. `/home/guda/GoCBC/ui/src/pages/register-exporter.tsx` - Lines 345-380
   - Added upload result checking
   - Added detailed logging
   - Added error reporting

2. `/home/guda/GoCBC/api/src/routes/documents.ts` - Line 1048
   - Changed to case-insensitive query
   - Matches SQLite behavior

## Build Instructions

After making these changes, rebuild both services:

```bash
# Rebuild API
cd /home/guda/GoCBC/api
npm run build

# Rebuild UI
cd /home/guda/GoCBC/ui
npm run build

# Restart services
cd /home/guda/GoCBC
bash start-all.sh
```

## Success Criteria

✅ User submits application with 3 documents  
✅ Browser console shows "All 3 documents uploaded successfully!"  
✅ ECTA Portal shows "Documents (3)" in application details  
✅ All 3 documents are visible with correct file names  
✅ Documents can be downloaded/viewed  
✅ If upload fails, user sees clear error message  

## Next Steps

1. Start services and test the fixes
2. If documents still don't appear, run the SQL diagnostic script
3. Check API logs for any blockchain or database errors
4. Review browser console for upload failures
5. If issue persists, the problem may be:
   - PostgreSQL not running
   - Documents table not created
   - Blockchain network timeout
   - File upload size limit

## Additional Diagnostic Tools

Created `/home/guda/GoCBC/check-documents-simple.sql` - Run this to inspect database state:
```bash
psql -h localhost -p 5432 -U cecbs -d cecbs -f check-documents-simple.sql
```

Shows:
- Documents table existence
- Total document count  
- Recent documents with entity type/ID
- Recent applications for cross-reference
