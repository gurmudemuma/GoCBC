# Fix 401 Error for Document Upload

## Root Cause
The API TypeScript files have been updated, but the compiled JavaScript in the `dist` folder is outdated.

## Solution

### If running with `npm start`:

```bash
# Stop the server (Ctrl+C)
cd c:\goCBC\api

# Rebuild TypeScript to JavaScript
npm run build

# Start the server
npm start
```

### If running with `npm run dev` (RECOMMENDED):

```bash
# Stop the server (Ctrl+C)
cd c:\goCBC\api

# Start with auto-reload
npm run dev
```

The `dev` script uses `ts-node-dev` which automatically compiles TypeScript on the fly and restarts when files change.

## Verify the Fix

After restarting with the correct method:

1. **Check server logs** - should see:
   ```
   ✅ Document routes loaded
   POST /api/v1/documents/upload
   POST /api/v1/documents/upload-registration  ← NEW
   GET /api/v1/documents/:documentId
   ```

2. **Test the endpoint** directly:
   ```bash
   curl -X POST http://localhost:3001/api/v1/documents/upload-registration \
     -F "document=@test.pdf" \
     -F "category=BUSINESS_LICENSE"
   ```
   
   Expected: `200 OK` with document data
   NOT: `401 Unauthorized`

3. **Test in browser**:
   - Go to http://localhost:3000/register-exporter
   - Navigate to Documents step
   - Click "Upload Documents"
   - Select a file
   - Click "Upload All"
   - Should succeed without 401 error

## If Still Getting 401

Check these:

### 1. Verify endpoint exists
```bash
# Check if the route is loaded
curl http://localhost:3001/api/v1/documents/upload-registration
# Should return 405 (Method Not Allowed) not 404 (Not Found)
```

### 2. Check browser network tab
- URL should be: `http://localhost:3001/api/v1/documents/upload-registration`
- Request Headers should NOT include `Authorization`
- If Authorization header is present, the frontend code is wrong

### 3. Verify TypeScript was compiled
```bash
# Check if dist/routes/documents.js has the new endpoint
cd c:\goCBC\api
type dist\routes\documents.js | findstr "upload-registration"
# Should show the route definition
```

### 4. Check for TypeScript compilation errors
```bash
cd c:\goCBC\api
npm run build
# Should complete without errors
```

## Alternative: Quick Fix with Dev Mode

The fastest solution:

```bash
# Terminal 1: API in dev mode (auto-reloads)
cd c:\goCBC\api
npm run dev

# Terminal 2: UI in dev mode
cd c:\goCBC\ui
npm run dev
```

This way TypeScript changes are immediately active.
