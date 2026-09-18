# 🔧 EXAMINE DOCUMENTS BUTTON - TROUBLESHOOTING GUIDE

## 🐛 Issue: "Examine Documents" Button Not Working

### ✅ FIXES APPLIED

1. **Added Comprehensive Console Logging**
   - File: `ui/src/components/portals/BanksPortal.tsx`
   - Lines: 4920-4978
   - Every step now logs to browser console

2. **Added Error Alerts**
   - Authentication errors show alert
   - API errors show alert with status code
   - Still opens dialog even if API fails (uses cached data)

3. **Better Error Handling**
   - Catches all errors and logs them
   - Shows user-friendly error messages
   - Graceful degradation (opens dialog with cached data if API fails)

---

## 🧪 TESTING PROCEDURE

### Step 1: Open Browser Console
```
1. Open your browser (Chrome/Edge/Firefox)
2. Press F12 or Right-click → Inspect
3. Click "Console" tab
4. Keep console open while testing
```

### Step 2: Navigate to Tab 3
```
1. Login as Bank user
2. Go to Banks Portal
3. Click Tab 3 (Document Examination)
4. You should see LCs listed in table
```

### Step 3: Click "Examine Documents"
```
1. Find an LC in the table (e.g., LC1789380581)
2. Click "Examine Documents" button
3. Watch browser console for logs
```

### Step 4: Check Console Logs
You should see logs like this:

**✅ SUCCESS:**
```
[TAB3] 🔘 Examine Documents button clicked for LC: LC1789380581
[TAB3] Token exists: true
[TAB3] Fetching from: http://localhost:3001/api/v1/banking/lc/LC1789380581
[TAB3] Response status: 200 OK
[TAB3] Response data: {success: true, data: {...}}
[TAB3] ✅ Fetched LC with 12 documents
```

**❌ ERROR - No Authentication:**
```
[TAB3] 🔘 Examine Documents button clicked for LC: LC1789380581
[TAB3] Token exists: false
[TAB3] No auth token found
```
**Fix:** Login again

**❌ ERROR - API Failed:**
```
[TAB3] 🔘 Examine Documents button clicked for LC: LC1789380581
[TAB3] Token exists: true
[TAB3] Fetching from: http://localhost:3001/api/v1/banking/lc/LC1789380581
[TAB3] Response status: 500 Internal Server Error
[TAB3] API failed: 500 ...error details...
```
**Fix:** Check backend logs

**❌ ERROR - Network Issue:**
```
[TAB3] 🔘 Examine Documents button clicked for LC: LC1789380581
[TAB3] Token exists: true
[TAB3] Fetching from: http://localhost:3001/api/v1/banking/lc/LC1789380581
[TAB3] Error fetching LC: TypeError: Failed to fetch
```
**Fix:** Check if backend is running on port 3001

---

## 🔍 COMMON ISSUES & FIXES

### Issue 1: Button Doesn't Do Anything

**Symptoms:**
- Button click has no effect
- No console logs appear
- Dialog doesn't open

**Possible Causes:**
1. JavaScript error preventing code execution
2. Button event handler not attached
3. React component not rendering properly

**Troubleshooting:**
```javascript
// Check if console shows ANY error
// Look for red errors in console

// Check if button element exists
document.querySelector('button:contains("Examine Documents")')

// Check if React is working
console.log(React.version)
```

**Fix:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload page (Ctrl+F5)
3. Restart frontend development server
4. Check for TypeScript compilation errors

---

### Issue 2: Authentication Error

**Symptoms:**
```
[TAB3] Token exists: false
Alert: "Authentication Required. Please login again."
```

**Cause:** No auth token in localStorage

**Fix:**
```
1. Logout
2. Clear localStorage: localStorage.clear()
3. Login again
4. Token should now be stored
```

---

### Issue 3: API Returns 401 Unauthorized

**Symptoms:**
```
[TAB3] Response status: 401 Unauthorized
```

**Cause:** Token expired or invalid

**Fix:**
```
1. Check token expiration
2. Login again to get fresh token
3. Check backend authentication middleware
```

---

### Issue 4: API Returns 500 Internal Server Error

**Symptoms:**
```
[TAB3] Response status: 500 Internal Server Error
[TAB3] API failed: 500 ...
```

**Cause:** Backend error (database, query, etc.)

**Fix:**
```
1. Check backend console/logs
2. Look for error stack traces
3. Check database connection
4. Verify backend TypeScript compiled: npm run build
5. Restart backend server
```

**Check backend logs:**
```bash
# Windows
cd c:\goCBC\api
npm run dev

# Look for errors like:
# ERROR: relation "documents" does not exist
# ERROR: column "entity_type" does not exist
# etc.
```

---

### Issue 5: Dialog Opens But No Documents Shown

**Symptoms:**
- Button works
- Dialog opens
- Shows "No documents available"

**Cause:** Backend returned empty documents array

**Possible Reasons:**
1. No documents in database for this LC
2. Backend query issue
3. Document entity_id doesn't match LC/Contract ID

**Troubleshooting:**
```sql
-- Check if documents exist
SELECT * FROM documents WHERE entity_id LIKE '%1789380581%';

-- Check LC and Contract IDs
SELECT lc_id, contract_id FROM letters_of_credit WHERE lc_id = 'LC1789380581';

-- Check document entity types
SELECT entity_type, entity_id, count(*) 
FROM documents 
WHERE entity_id LIKE '%1789380581%'
GROUP BY entity_type, entity_id;
```

**Fix:**
1. Upload documents first (via Exporter Portal or Shipping Portal)
2. Ensure entity_id matches (LC ID or Contract ID)
3. Check backend query joins shipments/customs tables correctly

---

### Issue 6: Frontend Not Updated

**Symptoms:**
- Code changes don't appear
- Old behavior persists
- Console logs don't show

**Cause:** Frontend not recompiled or browser cache

**Fix:**
```bash
# Stop frontend
# Restart frontend
cd c:\goCBC\ui
npm run dev

# Clear browser cache
Ctrl+Shift+Delete → Clear everything

# Hard reload
Ctrl+F5 or Ctrl+Shift+R
```

---

### Issue 7: Backend Not Updated

**Symptoms:**
- New backend code not executing
- Old API responses
- Backend logs show old code

**Cause:** TypeScript not recompiled or server not restarted

**Fix:**
```bash
# Compile TypeScript
cd c:\goCBC\api
npm run build

# Check for compilation errors
# If errors, fix them first

# Restart backend
# Stop existing process
# Start again:
npm run dev
```

---

## 📊 VERIFICATION CHECKLIST

**Before Testing:**
- [ ] Backend is running on port 3001
- [ ] Frontend is running on port 3000
- [ ] Database (PostgreSQL) is running
- [ ] Logged in as Bank user
- [ ] Browser console is open (F12)

**During Testing:**
- [ ] Click "Examine Documents" button
- [ ] Check console logs appear
- [ ] Check for error messages
- [ ] Check dialog opens

**Expected Behavior:**
- [ ] Console shows `[TAB3] 🔘 Examine Documents button clicked`
- [ ] Console shows `[TAB3] Response status: 200 OK`
- [ ] Console shows `[TAB3] ✅ Fetched LC with X documents`
- [ ] Dialog opens showing documents grouped by type
- [ ] Documents have View/Approve/Reject buttons

---

## 🔧 MANUAL BACKEND TEST

If button still doesn't work, test backend directly:

```bash
# 1. Login and get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'

# Copy the token from response

# 2. Test LC endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/banking/lc/LC1789380581 \
  | jq '.data.documents | length'

# Expected: Number of documents (e.g., 12)
```

---

## 🆘 EMERGENCY FIX

If all else fails, here's a temporary workaround:

**File:** `ui/src/components/portals/BanksPortal.tsx`  
**Replace button onClick with simpler version:**

```typescript
onClick={() => {
  // Simple version - just open with cached data
  console.log('Opening dialog for LC:', lc.lcId);
  setSelectedLC(lc);
  setDocumentExaminationOpen(true);
}}
```

This will open the dialog immediately without fetching fresh data. Not ideal but allows testing the dialog itself.

---

## 📞 DEBUGGING COMMANDS

```javascript
// In browser console:

// Check if token exists
localStorage.getItem('authToken')

// Check selected LC
console.log(selectedLC)

// Check if dialog state
console.log(documentExaminationOpen)

// Manually open dialog
setDocumentExaminationOpen(true)

// Check LC data
fetch('http://localhost:3001/api/v1/banking/lc/LC1789380581', {
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  }
})
.then(r => r.json())
.then(d => console.log('LC data:', d))
```

---

## 📝 WHAT TO REPORT

If button still doesn't work after trying all fixes, please provide:

1. **Browser console logs** (copy entire console output)
2. **Network tab** (F12 → Network → click button → check for failed requests)
3. **Backend logs** (any errors in terminal running `npm run dev`)
4. **Screenshot** of Tab 3 showing the button
5. **Browser and version** (e.g., Chrome 120)

---

**Created:** September 17, 2026  
**Status:** Enhanced logging and error handling added  
**Next Step:** Click button and check browser console for detailed logs
