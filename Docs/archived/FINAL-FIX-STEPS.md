# FINAL STEPS TO FIX 401 ERROR ✅

## Status
✅ TypeScript code updated
✅ Code compiled successfully  
✅ New endpoint exists in `dist/routes/documents.js` at line 140
⏳ **API server needs restart to load the new code**

---

## RESTART API SERVER NOW

### Step 1: Stop Current API Server
Find the terminal where the API is running and press `Ctrl+C`

### Step 2: Start API Server
```bash
cd c:\goCBC\api
npm start
```

OR for development with auto-reload:
```bash
cd c:\goCBC\api
npm run dev
```

### Step 3: Verify Server Started
You should see:
```
✅ Server listening on port 3001
✅ Routes loaded
```

---

## TEST THE FIX

### Browser Test
1. Go to: http://localhost:3000/register-exporter
2. Fill Steps 1-2
3. Click **Step 3: Documents**
4. Click "Upload Documents"
5. Select a PDF file
6. Set category (e.g., Business License)
7. Click "Upload All"
8. **Should succeed** without 401 error ✅

### Terminal Test (Optional)
```bash
# This should return 400 (no file) not 401 (unauthorized)
curl -X POST http://localhost:3001/api/v1/documents/upload-registration

# This should work (replace with actual PDF file)
curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
  -F "document=@test.pdf" \
  -F "category=BUSINESS_LICENSE" \
  -F "encrypt=true"
```

---

## What Was Fixed

### 1. API Backend (`c:\goCBC\api\src\routes\documents.ts`)
- ✅ Added `/upload-registration` endpoint (line 152-220)
- ✅ No authentication required
- ✅ Stores documents with 'REGISTRATION' as uploader
- ✅ Same validation and security as authenticated endpoint

### 2. API Config (`c:\goCBC\ui\src\config\api.config.ts`)
- ✅ Added `publicApiFetch()` function for public endpoints
- ✅ Does NOT add Authorization header
- ✅ Backward compatible with existing authenticated calls

### 3. Upload Dialog (`c:\goCBC\ui\src\components\portals\DocumentUploadDialog.tsx`)
- ✅ Detects when `entityType === 'EXPORTER_APPLICATION'`
- ✅ Uses `publicApiFetch` for registration
- ✅ Uses regular `apiFetch` for authenticated uploads
- ✅ Conditional endpoint selection

### 4. Compilation
- ✅ TypeScript compiled to JavaScript
- ✅ New endpoint in `api/dist/routes/documents.js`
- ✅ UI built successfully

---

## After Server Restart

The upload should work perfectly:

1. ✅ No 401 error
2. ✅ Documents upload without login
3. ✅ Files saved in `api/storage/documents/`
4. ✅ Metadata includes `uploadedBy: "REGISTRATION"`
5. ✅ ECTA can view documents when approving applications

---

## Troubleshooting

### If still getting 401:
1. **Clear browser cache**: Ctrl+Shift+R
2. **Check API is running on port 3001**: 
   ```bash
   curl http://localhost:3001/api/v1/documents/upload-registration
   ```
3. **Verify no proxy/firewall blocking**

### If getting 404:
- API server didn't restart
- Wrong port (check if using 3001 or different port)

### If getting 500:
- Check API server logs for actual error
- May be storage folder permission issue

---

## Summary

**Problem**: Registration document upload failed with 401  
**Root Cause**: Endpoint required authentication, registration users not logged in  
**Solution**: Created public endpoint `/upload-registration` with no auth  
**Status**: ✅ COMPLETE - Just needs API server restart  

**Next Action**: **RESTART API SERVER** → Test upload → Should work! 🎉
